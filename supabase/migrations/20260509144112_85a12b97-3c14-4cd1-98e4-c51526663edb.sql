-- ============================================================
-- Analytics Roxou — PR-1: estrutura de banco
-- Sem triggers, sem cron, sem alteração de código de app.
-- ============================================================

-- 1) Tabela de eventos brutos
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  event_id uuid NULL,
  venue_id uuid NULL,
  user_id uuid NULL,
  session_id text NULL,
  source_page text NULL,
  referrer text NULL,
  device_type text NULL,
  city text NULL,
  category text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_events_type_created
  ON public.analytics_events (event_type, created_at DESC);

CREATE INDEX idx_analytics_events_event_id
  ON public.analytics_events (event_id)
  WHERE event_id IS NOT NULL;

CREATE INDEX idx_analytics_events_venue_id
  ON public.analytics_events (venue_id)
  WHERE venue_id IS NOT NULL;

CREATE INDEX idx_analytics_events_session
  ON public.analytics_events (session_id, event_type);

CREATE INDEX idx_analytics_events_metadata_gin
  ON public.analytics_events USING gin (metadata);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- INSERT público (anon + authenticated): coleta sem login
CREATE POLICY "Anyone can insert analytics events"
  ON public.analytics_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- SELECT apenas admin
CREATE POLICY "Admins can read analytics events"
  ON public.analytics_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- (sem UPDATE / DELETE policies — bloqueado por padrão)


-- 2) Tabela de agregação diária
CREATE TABLE public.analytics_daily_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_date date NOT NULL,
  event_id uuid NULL,
  venue_id uuid NULL,
  views integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  saves integer NOT NULL DEFAULT 0,
  ticket_clicks integer NOT NULL DEFAULT 0,
  como_vou_clicks integer NOT NULL DEFAULT 0,
  aura_clicks integer NOT NULL DEFAULT 0,
  whatsapp_clicks integer NOT NULL DEFAULT 0,
  instagram_clicks integer NOT NULL DEFAULT 0,
  unique_sessions integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unicidade: uma linha por (dia, evento, local).
-- Como event_id e venue_id podem ser NULL, criamos índices únicos parciais
-- cobrindo as três combinações para evitar problemas com NULLs em UNIQUE.
CREATE UNIQUE INDEX idx_ads_unique_event
  ON public.analytics_daily_summary (summary_date, event_id)
  WHERE event_id IS NOT NULL AND venue_id IS NULL;

CREATE UNIQUE INDEX idx_ads_unique_venue
  ON public.analytics_daily_summary (summary_date, venue_id)
  WHERE venue_id IS NOT NULL AND event_id IS NULL;

CREATE UNIQUE INDEX idx_ads_unique_event_venue
  ON public.analytics_daily_summary (summary_date, event_id, venue_id)
  WHERE event_id IS NOT NULL AND venue_id IS NOT NULL;

CREATE UNIQUE INDEX idx_ads_unique_global
  ON public.analytics_daily_summary (summary_date)
  WHERE event_id IS NULL AND venue_id IS NULL;

CREATE INDEX idx_ads_date
  ON public.analytics_daily_summary (summary_date DESC);

ALTER TABLE public.analytics_daily_summary ENABLE ROW LEVEL SECURITY;

-- SELECT apenas admin. Sem INSERT/UPDATE/DELETE policies:
-- a tabela será populada por edge function/job com service role.
CREATE POLICY "Admins can read analytics summary"
  ON public.analytics_daily_summary
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
