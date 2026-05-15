ALTER TABLE public.instagram_scans
  ADD COLUMN IF NOT EXISTS permanently_ignored boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preview_image_url text;

CREATE INDEX IF NOT EXISTS idx_instagram_scans_perm_ignored
  ON public.instagram_scans (permanently_ignored)
  WHERE permanently_ignored = true;