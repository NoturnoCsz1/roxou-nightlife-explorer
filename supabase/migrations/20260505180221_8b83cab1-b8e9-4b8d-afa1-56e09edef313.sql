CREATE TABLE public.roxou_news (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL DEFAULT ''::text,
  cover_image_url TEXT,
  author TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'geral'::text,
  status TEXT NOT NULL DEFAULT 'draft'::text,
  seo_keyword TEXT,
  source_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.roxou_news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage roxou news"
  ON public.roxou_news FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view published roxou news"
  ON public.roxou_news FOR SELECT
  TO public
  USING (status = 'published'::text);

CREATE TRIGGER update_roxou_news_updated_at
BEFORE UPDATE ON public.roxou_news
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_roxou_news_status_published_at ON public.roxou_news(status, published_at DESC);
CREATE INDEX idx_roxou_news_category ON public.roxou_news(category);