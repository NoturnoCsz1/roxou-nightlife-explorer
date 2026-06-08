ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS music_style_primary text,
  ADD COLUMN IF NOT EXISTS music_styles_secondary text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sports_competitions text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS transport_reservation_enabled boolean NOT NULL DEFAULT false;