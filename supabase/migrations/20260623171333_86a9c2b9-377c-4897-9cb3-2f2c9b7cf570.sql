-- Permite leitura pública de viagens marcadas como públicas
CREATE POLICY "Public read open public trips"
  ON public.excursion_trips FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

GRANT SELECT ON public.excursion_trips TO anon;