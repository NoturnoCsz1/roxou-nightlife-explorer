-- Tabela de notícias do micro-site Expo Prudente 2026
CREATE TABLE public.expo_news (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  author TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'geral',
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_expo_news_status_published ON public.expo_news(status, published_at DESC);
CREATE INDEX idx_expo_news_category ON public.expo_news(category);

ALTER TABLE public.expo_news ENABLE ROW LEVEL SECURITY;

-- Leitura pública apenas para publicadas
CREATE POLICY "Anyone can view published expo news"
ON public.expo_news
FOR SELECT
TO public
USING (status = 'published');

-- Admins gerenciam tudo
CREATE POLICY "Admins can manage expo news"
ON public.expo_news
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at
CREATE TRIGGER update_expo_news_updated_at
BEFORE UPDATE ON public.expo_news
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();