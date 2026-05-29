ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS image_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_events_image_hash
ON public.events (image_hash)
WHERE image_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_duplicate_signature
ON public.events (date_time, venue_name, title);
