-- =========================================================
-- Completa sports_matches
-- =========================================================
ALTER TABLE public.sports_matches
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chat_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz NOT NULL DEFAULT now();

-- garante unique em external_id e slug (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='sports_matches_external_id_key') THEN
    BEGIN
      ALTER TABLE public.sports_matches ADD CONSTRAINT sports_matches_external_id_key UNIQUE (external_id);
    EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
    END;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='sports_matches_slug_key') THEN
    BEGIN
      ALTER TABLE public.sports_matches ADD CONSTRAINT sports_matches_slug_key UNIQUE (slug);
    EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sports_matches_match_time ON public.sports_matches(match_time);
CREATE INDEX IF NOT EXISTS idx_sports_matches_status ON public.sports_matches(status);

-- =========================================================
-- Completa sports_match_venues (venue_id já existe)
-- =========================================================
ALTER TABLE public.sports_match_venues
  ADD COLUMN IF NOT EXISTS transmission_type text NOT NULL DEFAULT 'tv_aberta',
  ADD COLUMN IF NOT EXISTS confirmed_by_admin boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sports_match_venues_match_venue_unique'
  ) THEN
    BEGIN
      ALTER TABLE public.sports_match_venues
        ADD CONSTRAINT sports_match_venues_match_venue_unique UNIQUE (match_id, venue_id);
    EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sports_match_venues_match ON public.sports_match_venues(match_id);
CREATE INDEX IF NOT EXISTS idx_sports_match_venues_venue ON public.sports_match_venues(venue_id);

-- =========================================================
-- SPORTS_MATCH_STREAMS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.sports_match_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.sports_matches(id) ON DELETE CASCADE,
  stream_url text NOT NULL,
  stream_type text NOT NULL DEFAULT 'youtube',
  is_official boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sports_match_streams_match ON public.sports_match_streams(match_id);
ALTER TABLE public.sports_match_streams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active streams" ON public.sports_match_streams;
CREATE POLICY "Anyone can view active streams" ON public.sports_match_streams
  FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins manage streams" ON public.sports_match_streams;
CREATE POLICY "Admins manage streams" ON public.sports_match_streams
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- SPORTS_MATCH_EVENTS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.sports_match_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_external_id text NOT NULL,
  match_slug text,
  action text NOT NULL,
  partner_id uuid,
  session_id text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sports_match_events_match ON public.sports_match_events(match_external_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sports_match_events_action ON public.sports_match_events(action, created_at DESC);
ALTER TABLE public.sports_match_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert match events" ON public.sports_match_events;
CREATE POLICY "Anyone can insert match events" ON public.sports_match_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);
DROP POLICY IF EXISTS "Admins read match events" ON public.sports_match_events;
CREATE POLICY "Admins read match events" ON public.sports_match_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- RPC: incrementa views por slug
-- =========================================================
CREATE OR REPLACE FUNCTION public.increment_match_view(_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.sports_matches
  SET views_count = views_count + 1,
      updated_at = now()
  WHERE slug = _slug;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_match_view(text) FROM public;
GRANT EXECUTE ON FUNCTION public.increment_match_view(text) TO anon, authenticated;