ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS opportunity_tags text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_events_opportunity_tags
ON public.events USING GIN (opportunity_tags);