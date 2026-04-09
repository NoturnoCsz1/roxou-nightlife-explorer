
CREATE TABLE public.eventou_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  eventou_url TEXT NOT NULL,
  external_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  venue_name TEXT,
  city TEXT,
  state TEXT,
  date_time TIMESTAMP WITH TIME ZONE,
  image_url TEXT,
  partner_id UUID,
  import_status TEXT NOT NULL DEFAULT 'pending',
  event_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT eventou_imports_eventou_url_key UNIQUE (eventou_url)
);

ALTER TABLE public.eventou_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage eventou_imports"
  ON public.eventou_imports
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_eventou_imports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_eventou_imports_updated_at
  BEFORE UPDATE ON public.eventou_imports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_eventou_imports_updated_at();
