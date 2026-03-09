
CREATE TABLE public.ticket_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert ticket clicks"
  ON public.ticket_clicks
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read ticket clicks"
  ON public.ticket_clicks
  FOR SELECT
  TO authenticated
  USING (true);
