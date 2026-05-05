CREATE TABLE IF NOT EXISTS public.roxou_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  contact_type text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  source text DEFAULT 'roxou_contato',
  status text DEFAULT 'novo',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.roxou_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public roxou contact inserts"
  ON public.roxou_contacts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view roxou contacts"
  ON public.roxou_contacts
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
