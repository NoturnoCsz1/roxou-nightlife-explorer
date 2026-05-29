
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_sports_transmission boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sports_match_id uuid NULL,
  ADD COLUMN IF NOT EXISTS sports_transmission_confidence numeric NULL,
  ADD COLUMN IF NOT EXISTS sports_transmission_source text NULL;

CREATE INDEX IF NOT EXISTS idx_events_sports_transmission
  ON public.events (is_sports_transmission)
  WHERE is_sports_transmission = true;
