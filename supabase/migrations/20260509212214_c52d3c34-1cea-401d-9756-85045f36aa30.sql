
-- Aura Operational Engine — Fase 1: alerts table
CREATE TABLE IF NOT EXISTS public.aura_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  entity_type text,
  entity_id uuid,
  title text NOT NULL,
  body text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key text UNIQUE,
  resolved_at timestamptz,
  resolved_by uuid
);

CREATE INDEX IF NOT EXISTS idx_aura_alerts_unresolved
  ON public.aura_alerts (resolved_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aura_alerts_entity
  ON public.aura_alerts (entity_type, entity_id);

ALTER TABLE public.aura_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage aura_alerts"
  ON public.aura_alerts
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.aura_alerts;
