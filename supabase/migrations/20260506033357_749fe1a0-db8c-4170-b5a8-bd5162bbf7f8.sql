ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS maps_place_id text,
  ADD COLUMN IF NOT EXISTS formatted_address text;