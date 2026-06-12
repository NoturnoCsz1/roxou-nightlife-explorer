ALTER TABLE public.sports_matches ADD COLUMN IF NOT EXISTS world_cup_phase text;
NOTIFY pgrst, 'reload schema';