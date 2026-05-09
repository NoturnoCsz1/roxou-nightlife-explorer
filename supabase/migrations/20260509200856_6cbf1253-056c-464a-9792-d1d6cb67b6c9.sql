
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS instagram_username text,
  ADD COLUMN IF NOT EXISTS instagram_profile_url text,
  ADD COLUMN IF NOT EXISTS instagram_id text,
  ADD COLUMN IF NOT EXISTS instagram_name text,
  ADD COLUMN IF NOT EXISTS instagram_bio text,
  ADD COLUMN IF NOT EXISTS instagram_profile_picture_url text,
  ADD COLUMN IF NOT EXISTS instagram_website text,
  ADD COLUMN IF NOT EXISTS instagram_followers_count integer,
  ADD COLUMN IF NOT EXISTS instagram_media_count integer,
  ADD COLUMN IF NOT EXISTS instagram_last_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS instagram_sync_status text,
  ADD COLUMN IF NOT EXISTS instagram_sync_error text,
  ADD COLUMN IF NOT EXISTS instagram_raw_json jsonb,
  ADD COLUMN IF NOT EXISTS instagram_recent_posts jsonb,
  ADD COLUMN IF NOT EXISTS aura_partner_score integer,
  ADD COLUMN IF NOT EXISTS aura_partner_tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS aura_partner_summary text,
  ADD COLUMN IF NOT EXISTS aura_suggestions jsonb,
  ADD COLUMN IF NOT EXISTS aura_last_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS manual_locked_fields text[] DEFAULT '{}';

CREATE UNIQUE INDEX IF NOT EXISTS partners_instagram_username_unique
  ON public.partners (lower(instagram_username))
  WHERE instagram_username IS NOT NULL AND instagram_username <> '';

CREATE INDEX IF NOT EXISTS partners_instagram_last_sync_idx
  ON public.partners (instagram_last_sync_at);
