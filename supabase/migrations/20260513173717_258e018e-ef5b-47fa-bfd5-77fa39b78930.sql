-- Campos de placar/rodada para sports_matches
ALTER TABLE public.sports_matches
  ADD COLUMN IF NOT EXISTS home_score integer,
  ADD COLUMN IF NOT EXISTS away_score integer,
  ADD COLUMN IF NOT EXISTS round_label text,
  ADD COLUMN IF NOT EXISTS current_minute text,
  ADD COLUMN IF NOT EXISTS finished_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_sports_matches_status_time ON public.sports_matches (status, match_time DESC);

-- Tabela de classificação dos campeonatos
CREATE TABLE IF NOT EXISTS public.sports_league_standings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id text NOT NULL,
  league_label text NOT NULL,
  league_slug text NOT NULL,
  season text,
  position integer NOT NULL,
  team_id text,
  team_name text NOT NULL,
  team_badge text,
  played integer NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  draws integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  goals_for integer NOT NULL DEFAULT 0,
  goals_against integer NOT NULL DEFAULT 0,
  goal_diff integer NOT NULL DEFAULT 0,
  points integer NOT NULL DEFAULT 0,
  form text,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (league_id, season, team_name)
);

CREATE INDEX IF NOT EXISTS idx_standings_league_slug ON public.sports_league_standings (league_slug, position);

ALTER TABLE public.sports_league_standings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Standings public read"
  ON public.sports_league_standings
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins manage standings"
  ON public.sports_league_standings
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_standings_updated_at
  BEFORE UPDATE ON public.sports_league_standings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();