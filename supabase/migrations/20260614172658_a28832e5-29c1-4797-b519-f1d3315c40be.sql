ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS ai_confidence_score numeric,
  ADD COLUMN IF NOT EXISTS ai_warnings jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS instagram_caption text,
  ADD COLUMN IF NOT EXISTS short_summary text,
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text;