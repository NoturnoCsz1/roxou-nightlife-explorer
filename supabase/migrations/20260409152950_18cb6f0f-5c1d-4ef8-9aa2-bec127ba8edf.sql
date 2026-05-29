
-- Instagram connected accounts
CREATE TABLE public.instagram_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL,
  ig_account_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active',
  connected_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.instagram_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage instagram_accounts"
  ON public.instagram_accounts FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Instagram posts queue
CREATE TABLE public.instagram_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instagram_account_id UUID REFERENCES public.instagram_accounts(id) ON DELETE SET NULL,
  content_generation_id UUID,
  caption TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  ig_media_id TEXT,
  error_detail TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.instagram_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage instagram_posts"
  ON public.instagram_posts FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
