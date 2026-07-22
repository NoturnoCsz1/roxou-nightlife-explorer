
-- =========================================================
-- ONDA A — A3 + A1 + A4 (A2 já corrigida em 20260608161807)
-- =========================================================

-- ---------------------------------------------------------
-- A3. compute_user_risk_score: guard admin/self + bypass do
-- trigger interno via set_config local à transação.
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_user_risk_score(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  reports_30d int := 0;
  high_severity int := 0;
  flagged_msgs int := 0;
  is_muted boolean := false;
  is_banned boolean := false;
  total int := 0;
  badge_v text := 'normal';
  sig jsonb;
  caller_role text;
  internal_flag text;
BEGIN
  -- Guard: bloqueia usuários comuns.
  --  - service_role (edge functions / pg_cron): permitido.
  --  - admin: permitido.
  --  - trigger interno on_security_report_insert: permitido via set_config local.
  --  - usuário comum: só pode calcular o próprio score (auth.uid() = _user_id).
  caller_role   := current_setting('request.jwt.claim.role', true);
  internal_flag := current_setting('app.internal_call', true);
  IF caller_role IS DISTINCT FROM 'service_role'
     AND internal_flag IS DISTINCT FROM 'security_report_trigger'
     AND NOT public.has_role(auth.uid(), 'admin'::app_role)
     AND (auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM _user_id) THEN
    RAISE EXCEPTION 'Forbidden: compute_user_risk_score requires admin, self, service_role or internal trigger';
  END IF;

  SELECT COUNT(*) INTO reports_30d
    FROM public.security_reports
    WHERE target_user_id = _user_id AND created_at > now() - interval '30 days';

  SELECT COUNT(*) INTO high_severity
    FROM public.security_reports
    WHERE target_user_id = _user_id
      AND severity IN ('high','critical')
      AND created_at > now() - interval '30 days';

  SELECT COUNT(*) INTO flagged_msgs
    FROM public.community_messages
    WHERE user_id = _user_id AND is_flagged = true;

  SELECT COALESCE(MAX(CASE WHEN s.is_muted THEN 1 ELSE 0 END), 0)::boolean,
         COALESCE(MAX(CASE WHEN s.is_banned THEN 1 ELSE 0 END), 0)::boolean
    INTO is_muted, is_banned
    FROM public.community_user_states s
    WHERE s.user_id = _user_id;

  total := (reports_30d * 5) + (high_severity * 15) + (flagged_msgs * 3)
         + CASE WHEN is_muted THEN 20 ELSE 0 END
         + CASE WHEN is_banned THEN 60 ELSE 0 END;

  IF total >= 80 THEN badge_v := 'critical';
  ELSIF total >= 50 THEN badge_v := 'high';
  ELSIF total >= 20 THEN badge_v := 'medium';
  ELSIF total > 0 THEN badge_v := 'low';
  ELSE badge_v := 'normal';
  END IF;

  sig := jsonb_build_object(
    'reports_30d', reports_30d,
    'high_severity', high_severity,
    'flagged_msgs', flagged_msgs,
    'is_muted', is_muted,
    'is_banned', is_banned
  );

  INSERT INTO public.user_risk_scores (user_id, score, badge, signals, computed_at)
    VALUES (_user_id, total, badge_v, sig, now())
    ON CONFLICT (user_id) DO UPDATE
      SET score = EXCLUDED.score,
          badge = EXCLUDED.badge,
          signals = EXCLUDED.signals,
          computed_at = now(),
          updated_at = now();

  RETURN total;
END;
$function$;

-- Trigger sinaliza chamada interna via set_config LOCAL (transacional).
CREATE OR REPLACE FUNCTION public.on_security_report_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.target_user_id IS NOT NULL THEN
    PERFORM set_config('app.internal_call', 'security_report_trigger', true);
    PERFORM public.compute_user_risk_score(NEW.target_user_id);
  END IF;
  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------
-- A1. Tabela de contadores para rate limit do prudente-ai
-- (usada por modos home/studio; chat continua em ai_message_usage).
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_usage_counters (
  bucket_key text NOT NULL,
  mode text NOT NULL,
  bucket_window text NOT NULL, -- 'day' ou 'minute'
  bucket_at timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket_key, mode, bucket_window, bucket_at)
);

GRANT ALL ON public.ai_usage_counters TO service_role;
ALTER TABLE public.ai_usage_counters ENABLE ROW LEVEL SECURITY;
-- Somente service_role acessa (edge function). Nenhuma policy = nenhum acesso via API pública.
CREATE POLICY "ai_usage_counters admin read"
  ON public.ai_usage_counters FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_ai_usage_counters_bucket
  ON public.ai_usage_counters (bucket_at);

-- ---------------------------------------------------------
-- A4. Tabela de state CSRF do instagram-oauth
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.oauth_state_tokens (
  state_hash text PRIMARY KEY,
  admin_user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'instagram',
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.oauth_state_tokens TO service_role;
ALTER TABLE public.oauth_state_tokens ENABLE ROW LEVEL SECURITY;
-- Sem policies para authenticated/anon: só service_role (edge function) acessa.

CREATE INDEX IF NOT EXISTS idx_oauth_state_tokens_expires
  ON public.oauth_state_tokens (expires_at);
