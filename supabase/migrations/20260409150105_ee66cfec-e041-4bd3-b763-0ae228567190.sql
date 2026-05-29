
CREATE TABLE public.content_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'post',
  source_type TEXT NOT NULL DEFAULT 'event',
  source_id TEXT,
  title TEXT,
  generated_text TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.content_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage content_generations"
  ON public.content_generations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
