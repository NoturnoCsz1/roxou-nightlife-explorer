-- ============ CONFIGURAÇÃO CENTRAL DA BDA ============
CREATE TABLE IF NOT EXISTS public.bda_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  registrations_open boolean NOT NULL DEFAULT false,
  public_list_enabled boolean NOT NULL DEFAULT true,
  event_date timestamptz,
  event_location text NOT NULL DEFAULT 'Quadra Coberta do Parque do Povo',
  event_city text NOT NULL DEFAULT 'Presidente Prudente - SP',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.bda_settings TO anon;
GRANT SELECT, UPDATE ON public.bda_settings TO authenticated;
GRANT ALL ON public.bda_settings TO service_role;

ALTER TABLE public.bda_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bda_settings_public_read" ON public.bda_settings;
CREATE POLICY "bda_settings_public_read" ON public.bda_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "bda_settings_admin_update" ON public.bda_settings;
CREATE POLICY "bda_settings_admin_update" ON public.bda_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.bda_touch_settings()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_bda_settings_updated ON public.bda_settings;
CREATE TRIGGER trg_bda_settings_updated BEFORE UPDATE ON public.bda_settings
  FOR EACH ROW EXECUTE FUNCTION public.bda_touch_settings();

INSERT INTO public.bda_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- ============ ÍNDICES ============
CREATE INDEX IF NOT EXISTS idx_bda_participants_registration ON public.bda_participants (registration_id);
CREATE INDEX IF NOT EXISTS idx_bda_participants_public ON public.bda_participants (show_public);
CREATE INDEX IF NOT EXISTS idx_bda_registrations_status ON public.bda_registrations (status);
CREATE INDEX IF NOT EXISTS idx_bda_consents_participant_key ON public.bda_consents (participant_id, consent_key);

-- ============ VIEW PÚBLICA DE PARTICIPANTES ============
DROP VIEW IF EXISTS public.public_bda_stats;
DROP VIEW IF EXISTS public.public_bda_participants;

CREATE VIEW public.public_bda_participants AS
WITH eligible AS (
  SELECT p.id, p.public_name, p.city, p.is_minor, p.show_city_public,
         p.photo_public_url, p.registration_id, p.slot,
         r.category, r.team_name, r.created_at AS registered_at
  FROM public.bda_participants p
  JOIN public.bda_registrations r ON r.id = p.registration_id
  WHERE r.status = 'aprovada_publica'
    AND p.show_public = true
    AND EXISTS (
      SELECT 1 FROM public.bda_consents c
      WHERE c.participant_id = p.id
        AND c.consent_key = 'exibicao_publica'
        AND c.granted = true
        AND c.revoked_at IS NULL
    )
),
eligible_counts AS (
  SELECT registration_id, count(*)::int AS eligible_count FROM eligible GROUP BY registration_id
),
total_counts AS (
  SELECT registration_id, count(*)::int AS total_count FROM public.bda_participants GROUP BY registration_id
)
SELECT e.id,
       e.public_name,
       e.category,
       e.team_name,
       CASE WHEN e.show_city_public AND NOT e.is_minor THEN e.city ELSE NULL END AS city,
       e.photo_public_url,
       e.registration_id,
       e.slot,
       e.registered_at
FROM eligible e
JOIN eligible_counts ec ON ec.registration_id = e.registration_id
JOIN total_counts tc ON tc.registration_id = e.registration_id
WHERE (e.category = 'solo' AND ec.eligible_count = 1)
   OR (e.category = 'dupla' AND tc.total_count = 2 AND ec.eligible_count = 2);

ALTER VIEW public.public_bda_participants SET (security_invoker = false);
GRANT SELECT ON public.public_bda_participants TO anon, authenticated;

-- ============ ESTATÍSTICAS PÚBLICAS (TEMPO REAL) ============
CREATE VIEW public.public_bda_stats AS
SELECT
  count(DISTINCT registration_id)::int AS total_registrations,
  count(*) FILTER (WHERE category = 'solo')::int AS solo_participants,
  count(DISTINCT registration_id) FILTER (WHERE category = 'dupla')::int AS duplas,
  count(*)::int AS total_participants
FROM public.public_bda_participants;

ALTER VIEW public.public_bda_stats SET (security_invoker = false);
GRANT SELECT ON public.public_bda_stats TO anon, authenticated;

-- ============ DASHBOARD ADMINISTRATIVO ============
CREATE OR REPLACE FUNCTION public.bda_admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE res jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.';
  END IF;

  SELECT jsonb_build_object(
    'total_registrations', (SELECT count(*) FROM public.bda_registrations),
    'solo_registrations', (SELECT count(*) FROM public.bda_registrations WHERE category = 'solo'),
    'dupla_registrations', (SELECT count(*) FROM public.bda_registrations WHERE category = 'dupla'),
    'adults', (SELECT count(*) FROM public.bda_participants WHERE is_minor = false),
    'minors', (SELECT count(*) FROM public.bda_participants WHERE is_minor = true),
    'aguardando_responsavel', (SELECT count(*) FROM public.bda_registrations WHERE status = 'aguardando_responsavel'),
    'aguardando_analise', (SELECT count(*) FROM public.bda_registrations WHERE status = 'aguardando_analise'),
    'pendencia', (SELECT count(*) FROM public.bda_registrations WHERE status = 'pendencia'),
    'aprovada_privada', (SELECT count(*) FROM public.bda_registrations WHERE status = 'aprovada_privada'),
    'aprovada_publica', (SELECT count(*) FROM public.bda_registrations WHERE status = 'aprovada_publica'),
    'recusada', (SELECT count(*) FROM public.bda_registrations WHERE status = 'recusada'),
    'cancelada', (SELECT count(*) FROM public.bda_registrations WHERE status = 'cancelada'),
    'rascunho', (SELECT count(*) FROM public.bda_registrations WHERE status = 'rascunho'),
    'active_partners', (SELECT count(*) FROM public.bda_partners WHERE is_active = true),
    'public_participants', (SELECT count(*) FROM public.public_bda_participants)
  ) INTO res;

  RETURN res;
END; $$;

REVOKE ALL ON FUNCTION public.bda_admin_dashboard_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bda_admin_dashboard_stats() TO authenticated, service_role;