-- Denúncias de segurança
CREATE TABLE IF NOT EXISTS public.security_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid,
  target_user_id uuid,
  target_message_id uuid,
  category text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  evidence text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_secrep_target ON public.security_reports(target_user_id);
CREATE INDEX IF NOT EXISTS idx_secrep_status ON public.security_reports(status);
CREATE INDEX IF NOT EXISTS idx_secrep_created ON public.security_reports(created_at DESC);

ALTER TABLE public.security_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can create security reports"
  ON public.security_reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins read security reports"
  ON public.security_reports FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update security reports"
  ON public.security_reports FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete security reports"
  ON public.security_reports FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_secrep_updated_at
  BEFORE UPDATE ON public.security_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Score de risco
CREATE TABLE IF NOT EXISTS public.user_risk_scores (
  user_id uuid PRIMARY KEY,
  score integer NOT NULL DEFAULT 0,
  badge text NOT NULL DEFAULT 'normal',
  signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_urs_score ON public.user_risk_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_urs_badge ON public.user_risk_scores(badge);

ALTER TABLE public.user_risk_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read risk scores"
  ON public.user_risk_scores FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins write risk scores"
  ON public.user_risk_scores FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_urs_updated_at
  BEFORE UPDATE ON public.user_risk_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cálculo de risco
CREATE OR REPLACE FUNCTION public.compute_user_risk_score(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reports_30d int := 0;
  high_severity int := 0;
  flagged_msgs int := 0;
  is_muted boolean := false;
  is_banned boolean := false;
  total int := 0;
  badge_v text := 'normal';
  sig jsonb;
BEGIN
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
$$;

-- Trigger: ao criar denúncia, recomputa score do alvo
CREATE OR REPLACE FUNCTION public.on_security_report_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.target_user_id IS NOT NULL THEN
    PERFORM public.compute_user_risk_score(NEW.target_user_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_secrep_after_insert
  AFTER INSERT ON public.security_reports
  FOR EACH ROW EXECUTE FUNCTION public.on_security_report_insert();