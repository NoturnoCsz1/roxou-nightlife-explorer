
CREATE TABLE public.instagram_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  instagram_handle text NOT NULL,
  post_url text NOT NULL,
  caption text,
  image_url text,
  import_status text NOT NULL DEFAULT 'pending',
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  confidence text,
  error_detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_url)
);

ALTER TABLE public.instagram_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access on instagram_imports"
ON public.instagram_imports
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
