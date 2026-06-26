
-- =====================================================
-- ROXOU BIO + ROXOU MENU — MVP
-- =====================================================

-- Helper: verifica se o user atual gerencia o partner
CREATE OR REPLACE FUNCTION public.user_manages_partner(_user_id uuid, _partner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.partner_users
    WHERE user_id = _user_id
      AND partner_id = _partner_id
      AND is_active = true
  )
$$;

-- =====================================================
-- 1) bio_profiles
-- =====================================================
CREATE TABLE public.bio_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.partners(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'partner',
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  headline text,
  bio text,
  avatar_url text,
  cover_url text,
  theme text NOT NULL DEFAULT 'roxou_dark',
  accent_color text,
  whatsapp text,
  instagram text,
  tiktok text,
  youtube text,
  spotify text,
  website text,
  address text,
  city text,
  lat numeric,
  lng numeric,
  is_active boolean NOT NULL DEFAULT true,
  is_public boolean NOT NULL DEFAULT true,
  show_events boolean NOT NULL DEFAULT true,
  show_reservations boolean NOT NULL DEFAULT true,
  show_vip boolean NOT NULL DEFAULT true,
  show_transport boolean NOT NULL DEFAULT true,
  show_menu boolean NOT NULL DEFAULT true,
  show_news boolean NOT NULL DEFAULT true,
  primary_cta_label text,
  primary_cta_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bio_profiles_partner ON public.bio_profiles(partner_id);
CREATE INDEX idx_bio_profiles_slug ON public.bio_profiles(slug);
CREATE INDEX idx_bio_profiles_active ON public.bio_profiles(is_active, is_public);

GRANT SELECT ON public.bio_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bio_profiles TO authenticated;
GRANT ALL ON public.bio_profiles TO service_role;
ALTER TABLE public.bio_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bio_profiles_public_read"
  ON public.bio_profiles FOR SELECT
  USING (is_active = true AND is_public = true);

CREATE POLICY "bio_profiles_partner_read_own"
  ON public.bio_profiles FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR owner_user_id = auth.uid()
    OR (partner_id IS NOT NULL AND public.user_manages_partner(auth.uid(), partner_id))
  );

CREATE POLICY "bio_profiles_partner_insert"
  ON public.bio_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR owner_user_id = auth.uid()
    OR (partner_id IS NOT NULL AND public.user_manages_partner(auth.uid(), partner_id))
  );

CREATE POLICY "bio_profiles_partner_update"
  ON public.bio_profiles FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR owner_user_id = auth.uid()
    OR (partner_id IS NOT NULL AND public.user_manages_partner(auth.uid(), partner_id))
  );

CREATE POLICY "bio_profiles_admin_delete"
  ON public.bio_profiles FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (partner_id IS NOT NULL AND public.user_manages_partner(auth.uid(), partner_id))
  );

-- =====================================================
-- 2) bio_links
-- =====================================================
CREATE TABLE public.bio_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bio_id uuid NOT NULL REFERENCES public.bio_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  url text NOT NULL,
  icon text,
  type text NOT NULL DEFAULT 'custom',
  position int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  click_count int NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bio_links_bio ON public.bio_links(bio_id, position);

GRANT SELECT ON public.bio_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bio_links TO authenticated;
GRANT ALL ON public.bio_links TO service_role;
ALTER TABLE public.bio_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bio_links_public_read"
  ON public.bio_links FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.bio_profiles bp
      WHERE bp.id = bio_links.bio_id
        AND bp.is_active = true AND bp.is_public = true
    )
  );

CREATE POLICY "bio_links_owner_all"
  ON public.bio_links FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bio_profiles bp
      WHERE bp.id = bio_links.bio_id
        AND (
          public.has_role(auth.uid(), 'admin')
          OR bp.owner_user_id = auth.uid()
          OR (bp.partner_id IS NOT NULL AND public.user_manages_partner(auth.uid(), bp.partner_id))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bio_profiles bp
      WHERE bp.id = bio_links.bio_id
        AND (
          public.has_role(auth.uid(), 'admin')
          OR bp.owner_user_id = auth.uid()
          OR (bp.partner_id IS NOT NULL AND public.user_manages_partner(auth.uid(), bp.partner_id))
        )
    )
  );

-- =====================================================
-- 3) menu_categories
-- =====================================================
CREATE TABLE public.menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.partners(id) ON DELETE CASCADE,
  bio_id uuid REFERENCES public.bio_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  position int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_menu_categories_bio ON public.menu_categories(bio_id, position);
CREATE INDEX idx_menu_categories_partner ON public.menu_categories(partner_id);

GRANT SELECT ON public.menu_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_categories TO authenticated;
GRANT ALL ON public.menu_categories TO service_role;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menu_categories_public_read"
  ON public.menu_categories FOR SELECT
  USING (
    is_active = true
    AND (
      bio_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.bio_profiles bp
        WHERE bp.id = menu_categories.bio_id
          AND bp.is_active = true AND bp.is_public = true
      )
    )
  );

CREATE POLICY "menu_categories_owner_all"
  ON public.menu_categories FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (partner_id IS NOT NULL AND public.user_manages_partner(auth.uid(), partner_id))
    OR (bio_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.bio_profiles bp
      WHERE bp.id = menu_categories.bio_id
        AND (bp.owner_user_id = auth.uid()
          OR (bp.partner_id IS NOT NULL AND public.user_manages_partner(auth.uid(), bp.partner_id)))
    ))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (partner_id IS NOT NULL AND public.user_manages_partner(auth.uid(), partner_id))
    OR (bio_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.bio_profiles bp
      WHERE bp.id = menu_categories.bio_id
        AND (bp.owner_user_id = auth.uid()
          OR (bp.partner_id IS NOT NULL AND public.user_manages_partner(auth.uid(), bp.partner_id)))
    ))
  );

-- =====================================================
-- 4) menu_items
-- =====================================================
CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.partners(id) ON DELETE CASCADE,
  bio_id uuid REFERENCES public.bio_profiles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.menu_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price numeric,
  image_url text,
  tags text[] NOT NULL DEFAULT '{}',
  is_featured boolean NOT NULL DEFAULT false,
  is_available boolean NOT NULL DEFAULT true,
  position int NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_menu_items_bio ON public.menu_items(bio_id, position);
CREATE INDEX idx_menu_items_category ON public.menu_items(category_id);

GRANT SELECT ON public.menu_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menu_items_public_read"
  ON public.menu_items FOR SELECT
  USING (
    is_available = true
    AND (
      bio_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.bio_profiles bp
        WHERE bp.id = menu_items.bio_id
          AND bp.is_active = true AND bp.is_public = true
      )
    )
  );

CREATE POLICY "menu_items_owner_all"
  ON public.menu_items FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (partner_id IS NOT NULL AND public.user_manages_partner(auth.uid(), partner_id))
    OR (bio_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.bio_profiles bp
      WHERE bp.id = menu_items.bio_id
        AND (bp.owner_user_id = auth.uid()
          OR (bp.partner_id IS NOT NULL AND public.user_manages_partner(auth.uid(), bp.partner_id)))
    ))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (partner_id IS NOT NULL AND public.user_manages_partner(auth.uid(), partner_id))
    OR (bio_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.bio_profiles bp
      WHERE bp.id = menu_items.bio_id
        AND (bp.owner_user_id = auth.uid()
          OR (bp.partner_id IS NOT NULL AND public.user_manages_partner(auth.uid(), bp.partner_id)))
    ))
  );

-- =====================================================
-- 5) bio_analytics_events
-- =====================================================
CREATE TABLE public.bio_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bio_id uuid NOT NULL REFERENCES public.bio_profiles(id) ON DELETE CASCADE,
  link_id uuid REFERENCES public.bio_links(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  visitor_id text,
  session_id text,
  source text,
  referrer text,
  user_agent text,
  device text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bio_analytics_bio_date ON public.bio_analytics_events(bio_id, created_at DESC);
CREATE INDEX idx_bio_analytics_link ON public.bio_analytics_events(link_id);

GRANT INSERT ON public.bio_analytics_events TO anon;
GRANT SELECT, INSERT ON public.bio_analytics_events TO authenticated;
GRANT ALL ON public.bio_analytics_events TO service_role;
ALTER TABLE public.bio_analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bio_analytics_anon_insert"
  ON public.bio_analytics_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bio_profiles bp
      WHERE bp.id = bio_analytics_events.bio_id
        AND bp.is_active = true AND bp.is_public = true
    )
  );

CREATE POLICY "bio_analytics_owner_read"
  ON public.bio_analytics_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bio_profiles bp
      WHERE bp.id = bio_analytics_events.bio_id
        AND (
          public.has_role(auth.uid(), 'admin')
          OR bp.owner_user_id = auth.uid()
          OR (bp.partner_id IS NOT NULL AND public.user_manages_partner(auth.uid(), bp.partner_id))
        )
    )
  );

-- =====================================================
-- 6) bio_qr_codes
-- =====================================================
CREATE TABLE public.bio_qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bio_id uuid NOT NULL REFERENCES public.bio_profiles(id) ON DELETE CASCADE,
  label text NOT NULL,
  target_path text NOT NULL,
  table_number text,
  scan_count int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bio_qr_bio ON public.bio_qr_codes(bio_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bio_qr_codes TO authenticated;
GRANT ALL ON public.bio_qr_codes TO service_role;
ALTER TABLE public.bio_qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bio_qr_owner_all"
  ON public.bio_qr_codes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bio_profiles bp
      WHERE bp.id = bio_qr_codes.bio_id
        AND (
          public.has_role(auth.uid(), 'admin')
          OR bp.owner_user_id = auth.uid()
          OR (bp.partner_id IS NOT NULL AND public.user_manages_partner(auth.uid(), bp.partner_id))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bio_profiles bp
      WHERE bp.id = bio_qr_codes.bio_id
        AND (
          public.has_role(auth.uid(), 'admin')
          OR bp.owner_user_id = auth.uid()
          OR (bp.partner_id IS NOT NULL AND public.user_manages_partner(auth.uid(), bp.partner_id))
        )
    )
  );

-- =====================================================
-- Triggers updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.tg_bio_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER bio_profiles_updated_at BEFORE UPDATE ON public.bio_profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_bio_updated_at();
CREATE TRIGGER menu_items_updated_at BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_bio_updated_at();
