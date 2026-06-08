ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS transmission_channel text,
  ADD COLUMN IF NOT EXISTS transmission_url text,
  ADD COLUMN IF NOT EXISTS transmission_notes text;

COMMENT ON COLUMN public.events.transmission_channel IS 'Canal da transmissão do jogo (ex: GE TV, CazéTV, SporTV)';
COMMENT ON COLUMN public.events.transmission_url IS 'Link da transmissão (YouTube, etc)';
COMMENT ON COLUMN public.events.transmission_notes IS 'Observação livre sobre a transmissão (ex: telão, áudio ambiente)';