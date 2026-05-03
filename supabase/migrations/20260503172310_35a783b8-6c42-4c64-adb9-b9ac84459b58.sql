CREATE TABLE public.instagram_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  ig_user_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.instagram_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage instagram_config"
  ON public.instagram_config
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_instagram_config_updated_at
  BEFORE UPDATE ON public.instagram_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.instagram_config (handle, access_token, status, notes)
VALUES (
  'roxou.pp',
  'IGAANQe51C6yhBZAGFrb1hQQ1RtbEhqN2g5TkNhcjQ5eThNa0x2eVdwclZAWRGtUQ2NPN21OazNGWnI1eXhoX3BnVU1NaWlRM3NSR0ZAjWjNWT1hNbXBXbV96UEI0ekJZAWC1VWGRhOUllaGZAXUHRIU01lTURRY3lPQjNaT0dnb2ZAOOAZDZD',
  'active',
  'Token oficial Roxou IA — lançamento V3'
)
ON CONFLICT (handle) DO UPDATE
  SET access_token = EXCLUDED.access_token,
      status = 'active',
      updated_at = now();