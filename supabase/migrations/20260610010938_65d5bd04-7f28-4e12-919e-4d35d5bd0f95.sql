ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS time_is_unknown boolean NOT NULL DEFAULT false;