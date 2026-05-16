ALTER TABLE public.instagram_scans
  ADD COLUMN IF NOT EXISTS preview_image_url text;

ALTER TABLE public.instagram_scans
  ADD COLUMN IF NOT EXISTS permanently_ignored boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_instagram_scans_preview_missing
  ON public.instagram_scans (last_seen_at)
  WHERE preview_image_url IS NULL;