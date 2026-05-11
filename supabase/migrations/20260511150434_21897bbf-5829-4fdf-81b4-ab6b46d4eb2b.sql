
-- Tabelas para "Jogos na Roxou"
CREATE TABLE IF NOT EXISTS public.sports_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text UNIQUE,
  league_id text,
  league_name text,
  league_label text,
  category text,
  season text,
  home_team text NOT NULL,
  away_team text NOT NULL,
  home_badge text,
  away_badge text,
  match_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  venue_name text,
  youtube_url text,
  slug text UNIQUE NOT NULL,
  is_featured boolean NOT NULL DEFAULT false,
  is_world_cup boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sports_matches_match_time ON public.sports_matches(match_time);
CREATE INDEX IF NOT EXISTS idx_sports_matches_category ON public.sports_matches(category);
CREATE INDEX IF NOT EXISTS idx_sports_matches_world_cup ON public.sports_matches(is_world_cup);

CREATE TABLE IF NOT EXISTS public.sports_match_venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.sports_matches(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  is_featured boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(match_id, venue_id)
);

CREATE INDEX IF NOT EXISTS idx_sports_match_venues_match ON public.sports_match_venues(match_id);
CREATE INDEX IF NOT EXISTS idx_sports_match_venues_venue ON public.sports_match_venues(venue_id);

ALTER TABLE public.sports_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_match_venues ENABLE ROW LEVEL SECURITY;

-- Leitura pública
CREATE POLICY "Sports matches are viewable by everyone"
  ON public.sports_matches FOR SELECT USING (true);

CREATE POLICY "Sports match venues are viewable by everyone"
  ON public.sports_match_venues FOR SELECT USING (true);

-- Admin gerencia
CREATE POLICY "Admins manage sports_matches"
  ON public.sports_matches FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage sports_match_venues"
  ON public.sports_match_venues FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_sports_matches_updated_at
  BEFORE UPDATE ON public.sports_matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
