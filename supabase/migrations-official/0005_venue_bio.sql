-- =====================================================================
-- Roxou Bio — camada de apresentação do venue (Supabase OFICIAL foteitrhbfwbzzeanxve)
-- NÃO APLICAR NO LEGADO (bapdgykghciiyvlqdrqx). Não executado automaticamente.
-- Requer 0001 (helpers is_org_member / is_org_manager_or_owner /
-- is_staff_or_admin / is_admin_or_superadmin / enforce_org_venue_consistency /
-- touch_updated_at).
--
-- PRINCÍPIO: a Bio NÃO duplica nenhum módulo.
--   identidade/endereço/logo/contatos ....... public.venues
--   slug público ............................ public.venues.slug
--   eventos ................................. public.events
--   reservas ................................ public.reservations
--   lista VIP ............................... public.vip_lists
--   sorteios ................................ public.giveaways
--   links ................................... public.short_links (roxou.click)
--   QR Code ................................. gerado da URL pública (sem tabela)
--   métricas ................................ analytics_events / short_link_clicks
--   cardápio ................................ NÃO existe módulo oficial; a Bio
--                                             só exibirá quando existir.
-- Esta migration cria APENAS o que não existe: a configuração de apresentação
-- (1 linha por venue) e a marcação de quais short_links aparecem na Bio.
-- =====================================================================

-- ------------------------------------------------- venue_bio_profiles (novo)
CREATE TABLE public.venue_bio_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  -- Conteúdo exclusivo da Bio (não existe em venues).
  headline text,
  about text,
  theme text NOT NULL DEFAULT 'roxou_dark',
  accent_color text,
  -- Overrides opcionais. NULL => usa venues.logo_url / venues.cover_image.
  avatar_url text,
  cover_url text,
  -- Quais módulos oficiais a Bio exibe (só exibição, sem cópia de dados).
  show_events boolean NOT NULL DEFAULT true,
  show_reservations boolean NOT NULL DEFAULT false,
  show_vip boolean NOT NULL DEFAULT false,
  show_giveaways boolean NOT NULL DEFAULT false,
  show_links boolean NOT NULL DEFAULT true,
  show_menu boolean NOT NULL DEFAULT false,
  primary_cta_label text,
  primary_cta_url text,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT venue_bio_profiles_venue_unique UNIQUE (venue_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_bio_profiles TO authenticated;
GRANT ALL ON public.venue_bio_profiles TO service_role;
-- anon: sem grant. A página pública lê via RPC public_get_venue_bio.
ALTER TABLE public.venue_bio_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venue_bio_read_org_member" ON public.venue_bio_profiles
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id) OR public.is_staff_or_admin());

CREATE POLICY "venue_bio_write_managers" ON public.venue_bio_profiles
  FOR ALL TO authenticated
  USING (public.is_org_manager_or_owner(organization_id) OR public.is_admin_or_superadmin())
  WITH CHECK (public.is_org_manager_or_owner(organization_id));

CREATE INDEX venue_bio_profiles_org_idx
  ON public.venue_bio_profiles (organization_id, venue_id);

CREATE TRIGGER venue_bio_profiles_org_venue BEFORE INSERT OR UPDATE
  ON public.venue_bio_profiles FOR EACH ROW
  EXECUTE FUNCTION public.enforce_org_venue_consistency();
CREATE TRIGGER venue_bio_profiles_touch BEFORE UPDATE
  ON public.venue_bio_profiles FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- ----------------------------------- short_links: reaproveitado, não duplicado
-- O encurtador oficial continua sendo a ÚNICA fonte de links. Aqui só ganha
-- escopo de estabelecimento e a marcação de exibição na Bio.
ALTER TABLE public.short_links
  ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS show_on_bio boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bio_position integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS short_links_bio_idx
  ON public.short_links (venue_id, show_on_bio, bio_position);

-- --------------------------------------------------------------- RPC pública
-- Superfície pública única (parceiro.click/{slug} e /bio/{slug}).
-- Só devolve Bio publicada de venue ativo. Nenhum dado sensível.
CREATE OR REPLACE FUNCTION public.public_get_venue_bio(_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'venue', jsonb_build_object(
      'id', v.id,
      'name', v.name,
      'slug', v.slug,
      'city', v.city,
      'street', v.street,
      'address', v.address,
      'instagram', v.instagram,
      'whatsapp', v.whatsapp,
      'website', v.website,
      'description', v.description,
      'logo_url', COALESCE(b.avatar_url, v.logo_url),
      'cover_url', COALESCE(b.cover_url, v.cover_image),
      'latitude', v.latitude,
      'longitude', v.longitude,
      'verified', v.verified
    ),
    'bio', jsonb_build_object(
      'headline', b.headline,
      'about', b.about,
      'theme', b.theme,
      'accent_color', b.accent_color,
      'show_events', b.show_events,
      'show_reservations', b.show_reservations,
      'show_vip', b.show_vip,
      'show_giveaways', b.show_giveaways,
      'show_links', b.show_links,
      'show_menu', b.show_menu,
      'primary_cta_label', b.primary_cta_label,
      'primary_cta_url', b.primary_cta_url
    ),
    'links', CASE WHEN b.show_links THEN COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'title', s.title, 'slug', s.slug, 'url', s.target_url
             ) ORDER BY s.bio_position, s.created_at)
      FROM public.short_links s
      WHERE s.venue_id = v.id AND s.show_on_bio AND s.is_active
    ), '[]'::jsonb) ELSE '[]'::jsonb END,
    'events', CASE WHEN b.show_events THEN COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', e.id, 'title', e.title, 'slug', e.slug,
               'start_date', e.start_date, 'start_time', e.start_time,
               'cover_image', COALESCE(e.cover_image, e.banner_url),
               'ticket_url', e.ticket_url, 'is_free', e.is_free
             ) ORDER BY e.start_date)
      FROM public.events e
      WHERE e.venue_id = v.id
        AND e.status = 'published'
        AND e.start_date >= (now() AT TIME ZONE 'America/Sao_Paulo')::date
      LIMIT 12
    ), '[]'::jsonb) ELSE '[]'::jsonb END
  )
  FROM public.venues v
  JOIN public.venue_bio_profiles b ON b.venue_id = v.id
  WHERE v.slug = _slug
    AND b.is_published
    AND COALESCE(v.status, 'active') = 'active';
$$;

REVOKE ALL ON FUNCTION public.public_get_venue_bio(text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_get_venue_bio(text) TO anon, authenticated;

-- ------------------------------------------------------ RPC de escrita (parceiro)
-- Mesmo contrato de partner_update_venue_profile: o caller é validado contra
-- organization_members; colunas administrativas nunca entram pelo patch.
CREATE OR REPLACE FUNCTION public.partner_upsert_venue_bio(
  _caller_id uuid,
  _venue_id uuid,
  _patch jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org uuid;
  _allowed text[] := ARRAY[
    'headline','about','theme','accent_color','avatar_url','cover_url',
    'show_events','show_reservations','show_vip','show_giveaways',
    'show_links','show_menu','primary_cta_label','primary_cta_url','is_published'
  ];
  _clean jsonb;
  _id uuid;
BEGIN
  IF _caller_id IS NULL OR _caller_id <> auth.uid() THEN
    RAISE EXCEPTION 'Chamada não autenticada.' USING ERRCODE = '42501';
  END IF;

  SELECT v.organization_id INTO _org FROM public.venues v WHERE v.id = _venue_id;
  IF _org IS NULL THEN
    RAISE EXCEPTION 'Estabelecimento não encontrado.' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = _org
      AND m.user_id = _caller_id
      AND COALESCE(m.status, 'active') = 'active'
      AND COALESCE(m.role_code, '') IN ('owner', 'manager')
  ) THEN
    RAISE EXCEPTION 'Sem permissão para editar a Bio deste estabelecimento.'
      USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb) INTO _clean
  FROM jsonb_each(COALESCE(_patch, '{}'::jsonb))
  WHERE key = ANY(_allowed);

  INSERT INTO public.venue_bio_profiles (organization_id, venue_id)
  VALUES (_org, _venue_id)
  ON CONFLICT (venue_id) DO NOTHING;

  UPDATE public.venue_bio_profiles b
  SET headline          = COALESCE(_clean->>'headline', b.headline),
      about             = COALESCE(_clean->>'about', b.about),
      theme             = COALESCE(_clean->>'theme', b.theme),
      accent_color      = COALESCE(_clean->>'accent_color', b.accent_color),
      avatar_url        = COALESCE(_clean->>'avatar_url', b.avatar_url),
      cover_url         = COALESCE(_clean->>'cover_url', b.cover_url),
      show_events       = COALESCE((_clean->>'show_events')::boolean, b.show_events),
      show_reservations = COALESCE((_clean->>'show_reservations')::boolean, b.show_reservations),
      show_vip          = COALESCE((_clean->>'show_vip')::boolean, b.show_vip),
      show_giveaways    = COALESCE((_clean->>'show_giveaways')::boolean, b.show_giveaways),
      show_links        = COALESCE((_clean->>'show_links')::boolean, b.show_links),
      show_menu         = COALESCE((_clean->>'show_menu')::boolean, b.show_menu),
      primary_cta_label = COALESCE(_clean->>'primary_cta_label', b.primary_cta_label),
      primary_cta_url   = COALESCE(_clean->>'primary_cta_url', b.primary_cta_url),
      is_published      = COALESCE((_clean->>'is_published')::boolean, b.is_published),
      published_at      = CASE
                            WHEN COALESCE((_clean->>'is_published')::boolean, b.is_published)
                                 AND b.published_at IS NULL THEN now()
                            ELSE b.published_at
                          END
  WHERE b.venue_id = _venue_id
  RETURNING b.id INTO _id;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.partner_upsert_venue_bio(uuid, uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.partner_upsert_venue_bio(uuid, uuid, jsonb) TO authenticated;
