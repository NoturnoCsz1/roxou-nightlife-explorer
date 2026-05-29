ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS age_confirmed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS community_terms_accepted_at timestamp with time zone;