-- =============================================================================
-- 0006_venue_bio_complete.sql — Roxou Bio: fechamento do módulo
-- Banco OFICIAL (foteitrhbfwbzzeanxve). Nenhuma tabela nova.
--
-- AUDITORIA (feita antes desta migration, via API oficial):
--   REUTILIZADO (já existe, nada é criado):
--     venues ............ name, slug, description, address, street, city, state,
--                         whatsapp, instagram, website, opening_hours (jsonb),
--                         latitude, longitude, logo_url, cover_image, verified
--     short_links ....... slug, target_url, is_active, clicks_count,
--                         venue_id, organization_id, show_on_bio, bio_position
--     events ............ venue_id, status, start_date, cover_image/banner_url
--     giveaways ......... venue_id, slug, title, prize_title, banner_url,
--                         starts_at, ends_at, status
--     reservation_types . venue_id, name, description, price, active
--     vip_lists ......... venue_id, name, description, status, starts_at, closes_at
--     Storage ........... bucket oficial `venues` (já usado pelo Perfil)
--   AUSENTE (único conteúdo criado aqui — colunas, nunca tabelas):
--     venue_bio_profiles: flags de quais informações do venue aparecem,
--                         posts destacados do Instagram (jsonb),
--                         CTA de reservas/VIP
--     short_links:        bio_icon (apenas apresentação/ícone do link)
-- =============================================================================

-- ------------------------------------------------- 1. Bio: novas configurações
ALTER TABLE public.venue_bio_profiles
  ADD COLUMN IF NOT EXISTS show_address   boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_whatsapp  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_instagram boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_website   boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_map       boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_hours     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS instagram_featured_posts jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS reservations_cta_url text,
  ADD COLUMN IF NOT EXISTS vip_cta_url text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'venue_bio_ig_posts_array'
  ) THEN
    ALTER TABLE public.venue_bio_profiles
      ADD CONSTRAINT venue_bio_ig_posts_array CHECK (
        jsonb_typeof(instagram_featured_posts) = 'array'
        AND jsonb_array_length(instagram_featured_posts) <= 6
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'venue_bio_module_cta_urls'
  ) THEN
    ALTER TABLE public.venue_bio_profiles
      ADD CONSTRAINT venue_bio_module_cta_urls CHECK (
        (reservations_cta_url IS NULL OR reservations_cta_url ~* '^https?://[^\s<>"'']+$')
        AND (vip_cta_url IS NULL OR vip_cta_url ~* '^https?://[^\s<>"'']+$')
      );
  END IF;
END $$;

-- --------------------------------------------- 2. Encurtador: ícone do link
-- Apenas apresentação. O link continua sendo o short_link oficial.
ALTER TABLE public.short_links
  ADD COLUMN IF NOT EXISTS bio_icon text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'short_links_bio_icon_chk') THEN
    ALTER TABLE public.short_links
      ADD CONSTRAINT short_links_bio_icon_chk CHECK (
        bio_icon IS NULL OR bio_icon IN (
          'ticket','whatsapp','instagram','website','menu','map','shop','info','link'
        )
      );
  END IF;
END $$;

-- ------------------------------------------------------ 3. RPC pública (v2)
DROP FUNCTION IF EXISTS public.public_get_venue_bio(text);

CREATE OR REPLACE FUNCTION public.public_get_venue_bio(_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'venue', jsonb_build_object(
      'name', v.name,
      'slug', v.slug,
      'city', v.city,
      'state', v.state,
      'street', v.street,
      'address', CASE WHEN b.show_address THEN v.address ELSE NULL END,
      'instagram', CASE WHEN b.show_instagram THEN v.instagram ELSE NULL END,
      'whatsapp', CASE WHEN b.show_whatsapp THEN v.whatsapp ELSE NULL END,
      'website', CASE WHEN b.show_website THEN v.website ELSE NULL END,
      'opening_hours', CASE WHEN b.show_hours THEN v.opening_hours ELSE NULL END,
      'description', v.description,
      'logo_url', COALESCE(b.avatar_url, v.logo_url),
      'cover_url', COALESCE(b.cover_url, v.cover_image),
      'latitude', CASE WHEN b.show_map THEN v.latitude ELSE NULL END,
      'longitude', CASE WHEN b.show_map THEN v.longitude ELSE NULL END,
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
      'show_map', b.show_map,
      'primary_cta_label', b.primary_cta_label,
      'primary_cta_url', b.primary_cta_url
    ),
    -- Links: SEMPRE pela URL oficial do encurtador. target_url nunca é exposto.
    'links', CASE WHEN b.show_links THEN COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'title', l.title,
               'slug', l.slug,
               'icon', l.bio_icon,
               'short_url', 'https://roxou.click/' || l.slug
             ) ORDER BY l.bio_position, l.created_at)
      FROM (
        SELECT s.title, s.slug, s.bio_icon, s.bio_position, s.created_at
        FROM public.short_links s
        WHERE s.venue_id = v.id AND s.show_on_bio AND s.is_active
        ORDER BY s.bio_position, s.created_at
        LIMIT 30
      ) l
    ), '[]'::jsonb) ELSE '[]'::jsonb END,
    'events', CASE WHEN b.show_events THEN COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', e.id, 'title', e.title, 'slug', e.slug,
               'start_date', e.start_date, 'start_time', e.start_time,
               'cover_image', e.cover_image,
               'ticket_url', e.ticket_url, 'is_free', e.is_free
             ) ORDER BY e.start_date, e.start_time)
      FROM (
        SELECT ev.id, ev.title, ev.slug, ev.start_date, ev.start_time,
               COALESCE(ev.cover_image, ev.banner_url) AS cover_image,
               ev.ticket_url, ev.is_free
        FROM public.events ev
        WHERE ev.venue_id = v.id
          AND ev.status = 'published'
          AND ev.start_date >= (now() AT TIME ZONE 'America/Sao_Paulo')::date
        ORDER BY ev.start_date, ev.start_time
        LIMIT 12
      ) e
    ), '[]'::jsonb) ELSE '[]'::jsonb END,
    -- Sorteios: módulo oficial `giveaways`, nunca copiados para a Bio.
    'giveaways', CASE WHEN b.show_giveaways THEN COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', g.id, 'title', g.title, 'slug', g.slug,
               'prize_title', g.prize_title, 'banner_url', g.banner_url,
               'starts_at', g.starts_at, 'ends_at', g.ends_at,
               'status', g.status
             ) ORDER BY g.starts_at NULLS LAST)
      FROM (
        SELECT gw.id, gw.title, gw.slug, gw.prize_title, gw.banner_url,
               gw.starts_at, gw.ends_at, gw.status
        FROM public.giveaways gw
        WHERE gw.venue_id = v.id
          AND gw.status IN ('active', 'scheduled', 'published')
          AND (gw.ends_at IS NULL OR gw.ends_at >= now())
        ORDER BY gw.starts_at NULLS LAST
        LIMIT 6
      ) g
    ), '[]'::jsonb) ELSE '[]'::jsonb END,
    -- Reservas: apenas sinalização + CTA. Nenhum dado de reserva é exposto.
    'reservations', CASE WHEN b.show_reservations THEN jsonb_build_object(
      'available', EXISTS (
        SELECT 1 FROM public.reservation_types rt
        WHERE rt.venue_id = v.id AND COALESCE(rt.active, false)
      ),
      'cta_url', b.reservations_cta_url
    ) ELSE NULL END,
    -- Lista VIP: apenas sinalização + CTA. Nenhum convidado é exposto.
    'vip', CASE WHEN b.show_vip THEN jsonb_build_object(
      'available', EXISTS (
        SELECT 1 FROM public.vip_lists vl
        WHERE vl.venue_id = v.id
          AND COALESCE(vl.status, '') NOT IN ('closed', 'cancelled', 'archived', 'draft')
          AND (vl.closes_at IS NULL OR vl.closes_at >= now())
      ),
      'cta_url', b.vip_cta_url
    ) ELSE NULL END,
    -- Instagram: apenas URLs públicas informadas pelo parceiro.
    'instagram_posts', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('url', p.url) ORDER BY p.position)
      FROM (
        SELECT (item->>'url') AS url,
               COALESCE((item->>'position')::int, 0) AS position
        FROM jsonb_array_elements(COALESCE(b.instagram_featured_posts, '[]'::jsonb)) item
        WHERE COALESCE((item->>'enabled')::boolean, true)
          AND (item->>'url') ~* '^https://(www\.)?instagram\.com/'
        LIMIT 6
      ) p
    ), '[]'::jsonb)
  )
  FROM public.venues v
  JOIN public.venue_bio_profiles b ON b.venue_id = v.id
  WHERE v.slug = _slug
    AND b.is_published
    AND COALESCE(v.status, 'active') = 'active';
$$;

REVOKE ALL ON FUNCTION public.public_get_venue_bio(text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_get_venue_bio(text) TO anon, authenticated;

-- --------------------------------- 4. RPC de escrita: novas chaves permitidas
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
    'show_links','show_menu','primary_cta_label','primary_cta_url','is_published',
    'show_address','show_whatsapp','show_instagram','show_website','show_map',
    'show_hours','instagram_featured_posts','reservations_cta_url','vip_cta_url'
  ];
  _bool_keys text[] := ARRAY[
    'show_events','show_reservations','show_vip','show_giveaways','show_links',
    'show_menu','show_address','show_whatsapp','show_instagram','show_website',
    'show_map','show_hours'
  ];
  _p jsonb;
  _id uuid;
  _has_member boolean;
BEGIN
  IF _caller_id IS NULL OR _caller_id <> auth.uid() THEN
    RAISE EXCEPTION 'Chamada não autenticada.' USING ERRCODE = '42501';
  END IF;

  SELECT v.organization_id INTO _org FROM public.venues v WHERE v.id = _venue_id;
  IF _org IS NULL THEN
    RAISE EXCEPTION 'Estabelecimento não encontrado.' USING ERRCODE = 'P0002';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = _org
      AND m.user_id = _caller_id
      AND COALESCE(m.status, 'active') = 'active'
      AND COALESCE(m.role_code, '') IN ('owner', 'manager')
  ) INTO _has_member;

  IF NOT (_has_member OR public.is_admin_or_superadmin()) THEN
    RAISE EXCEPTION 'Sem permissão para editar a Bio deste estabelecimento.'
      USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb) INTO _p
  FROM jsonb_each(COALESCE(_patch, '{}'::jsonb))
  WHERE key = ANY(_allowed);

  IF (_p ? 'theme' AND jsonb_typeof(_p->'theme') = 'null')
     OR (_p ? 'is_published' AND jsonb_typeof(_p->'is_published') = 'null')
     OR (_p ? 'instagram_featured_posts'
         AND jsonb_typeof(_p->'instagram_featured_posts') <> 'array')
     OR EXISTS (
       SELECT 1 FROM unnest(_bool_keys) k
       WHERE _p ? k AND jsonb_typeof(_p->k) = 'null'
     ) THEN
    RAISE EXCEPTION 'Campo obrigatório não pode ser nulo.' USING ERRCODE = '22004';
  END IF;

  INSERT INTO public.venue_bio_profiles (organization_id, venue_id)
  VALUES (_org, _venue_id)
  ON CONFLICT (venue_id) DO NOTHING;

  UPDATE public.venue_bio_profiles b
  SET headline          = CASE WHEN _p ? 'headline' THEN _p->>'headline' ELSE b.headline END,
      about             = CASE WHEN _p ? 'about' THEN _p->>'about' ELSE b.about END,
      theme             = CASE WHEN _p ? 'theme' THEN _p->>'theme' ELSE b.theme END,
      accent_color      = CASE WHEN _p ? 'accent_color' THEN _p->>'accent_color' ELSE b.accent_color END,
      avatar_url        = CASE WHEN _p ? 'avatar_url' THEN _p->>'avatar_url' ELSE b.avatar_url END,
      cover_url         = CASE WHEN _p ? 'cover_url' THEN _p->>'cover_url' ELSE b.cover_url END,
      show_events       = CASE WHEN _p ? 'show_events' THEN (_p->>'show_events')::boolean ELSE b.show_events END,
      show_reservations = CASE WHEN _p ? 'show_reservations' THEN (_p->>'show_reservations')::boolean ELSE b.show_reservations END,
      show_vip          = CASE WHEN _p ? 'show_vip' THEN (_p->>'show_vip')::boolean ELSE b.show_vip END,
      show_giveaways    = CASE WHEN _p ? 'show_giveaways' THEN (_p->>'show_giveaways')::boolean ELSE b.show_giveaways END,
      show_links        = CASE WHEN _p ? 'show_links' THEN (_p->>'show_links')::boolean ELSE b.show_links END,
      show_menu         = CASE WHEN _p ? 'show_menu' THEN (_p->>'show_menu')::boolean ELSE b.show_menu END,
      show_address      = CASE WHEN _p ? 'show_address' THEN (_p->>'show_address')::boolean ELSE b.show_address END,
      show_whatsapp     = CASE WHEN _p ? 'show_whatsapp' THEN (_p->>'show_whatsapp')::boolean ELSE b.show_whatsapp END,
      show_instagram    = CASE WHEN _p ? 'show_instagram' THEN (_p->>'show_instagram')::boolean ELSE b.show_instagram END,
      show_website      = CASE WHEN _p ? 'show_website' THEN (_p->>'show_website')::boolean ELSE b.show_website END,
      show_map          = CASE WHEN _p ? 'show_map' THEN (_p->>'show_map')::boolean ELSE b.show_map END,
      show_hours        = CASE WHEN _p ? 'show_hours' THEN (_p->>'show_hours')::boolean ELSE b.show_hours END,
      instagram_featured_posts = CASE WHEN _p ? 'instagram_featured_posts'
                                      THEN _p->'instagram_featured_posts'
                                      ELSE b.instagram_featured_posts END,
      reservations_cta_url = CASE WHEN _p ? 'reservations_cta_url' THEN _p->>'reservations_cta_url' ELSE b.reservations_cta_url END,
      vip_cta_url       = CASE WHEN _p ? 'vip_cta_url' THEN _p->>'vip_cta_url' ELSE b.vip_cta_url END,
      primary_cta_label = CASE WHEN _p ? 'primary_cta_label' THEN _p->>'primary_cta_label' ELSE b.primary_cta_label END,
      primary_cta_url   = CASE WHEN _p ? 'primary_cta_url' THEN _p->>'primary_cta_url' ELSE b.primary_cta_url END,
      is_published      = CASE WHEN _p ? 'is_published' THEN (_p->>'is_published')::boolean ELSE b.is_published END
  WHERE b.venue_id = _venue_id
  RETURNING b.id INTO _id;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.partner_upsert_venue_bio(uuid, uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.partner_upsert_venue_bio(uuid, uuid, jsonb) TO authenticated;

-- =============================================================================
-- ROLLBACK SIMPLES
--   ALTER TABLE public.venue_bio_profiles
--     DROP COLUMN show_address, DROP COLUMN show_whatsapp, DROP COLUMN show_instagram,
--     DROP COLUMN show_website, DROP COLUMN show_map, DROP COLUMN show_hours,
--     DROP COLUMN instagram_featured_posts, DROP COLUMN reservations_cta_url,
--     DROP COLUMN vip_cta_url;
--   ALTER TABLE public.short_links DROP COLUMN bio_icon;
--   (reaplicar as funções da 0005_venue_bio.sql)
-- =============================================================================
