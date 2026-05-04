ALTER TABLE public.events ADD COLUMN IF NOT EXISTS aura_pick boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_events_aura_pick ON public.events(aura_pick) WHERE aura_pick = true;