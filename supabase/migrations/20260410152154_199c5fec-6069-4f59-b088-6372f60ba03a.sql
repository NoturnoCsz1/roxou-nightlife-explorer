
ALTER TABLE public.instagram_imports
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'instagram',
  ADD COLUMN IF NOT EXISTS venue_name text,
  ADD COLUMN IF NOT EXISTS suggested_date timestamptz,
  ADD COLUMN IF NOT EXISTS observation text;

-- Migrate existing data: set source_type based on post_url
UPDATE public.instagram_imports
SET source_type = CASE
  WHEN post_url ILIKE '%eventou%' THEN 'eventou'
  WHEN post_url ILIKE '%sympla%' THEN 'sympla'
  WHEN post_url ILIKE '%instagram%' THEN 'instagram'
  ELSE 'link'
END
WHERE source_type = 'instagram';

-- Copy caption to observation for existing rows
UPDATE public.instagram_imports
SET observation = caption
WHERE observation IS NULL AND caption IS NOT NULL;
