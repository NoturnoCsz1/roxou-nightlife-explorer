-- =====================================================================
-- Roxou Bio — camada de apresentação do venue (Supabase OFICIAL foteitrhbfwbzzeanxve)
-- REVISÃO FINAL (não executada). NÃO APLICAR NO LEGADO (bapdgykghciiyvlqdrqx).
-- Requer APENAS helpers já existentes no banco oficial:
--   is_org_member(uuid) / is_org_manager_or_owner(uuid) /
--   is_staff_or_admin() / is_admin_or_superadmin().
-- Consistência org<->venue e updated_at são resolvidas por funções
-- específicas da Bio criadas aqui (sem helper genérico global).
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
-- =====================================================================

-- ============================================================ validadores
CREATE OR REPLACE FUNCTION public.is_safe_public_url(_url text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT _url IS NULL OR _url ~* '^https?://[^\s<>"'']+$';
$$;

CREATE OR REPLACE FUNCTION public.is_hex_color(_color text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT _color IS NULL OR _color ~* '^#[0-9a-f]{6}$';
$$;

-- ------------------------------------------------- venue_bio_profiles (novo)
CREATE TABLE public.venue_bio_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  headline text,
  about text,
  theme text NOT NULL DEFAULT 'roxou_dark',
  accent_color text,
  -- Overrides opcionais. NULL => usa venues.logo_url / venues.cover_image.
  avatar_url text,
  cover_url text,
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
  CONSTRAINT venue_bio_profiles_venue_unique UNIQUE (venue_id),
  CONSTRAINT venue_bio_theme_chk
    CHECK (theme IN ('roxou_dark', 'roxou_neon', 'minimal_light', 'minimal_dark')),
  CONSTRAINT venue_bio_accent_chk CHECK (public.is_hex_color(accent_color)),
  CONSTRAINT venue_bio_cta_url_chk CHECK (public.is_safe_public_url(primary_cta_url)),
  CONSTRAINT venue_bio_avatar_url_chk CHECK (public.is_safe_public_url(avatar_url)),
  CONSTRAINT venue_bio_cover_url_chk CHECK (public.is_safe_public_url(cover_url))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_bio_profiles TO authenticated;
GRANT ALL ON public.venue_bio_profiles TO service_role;
-- anon: sem grant. A página pública lê via RPC public_get_venue_bio.
ALTER TABLE public.venue_bio_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venue_bio_read_org_member" ON public.venue_bio_profiles
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id) OR public.is_staff_or_admin());

-- USING e WITH CHECK simétricos: admin/superadmin Roxou também grava.
CREATE POLICY "venue_bio_write_managers" ON public.venue_bio_profiles
  FOR ALL TO authenticated
  USING (
    public.is_org_manager_or_owner(organization_id)
    OR public.is_admin_or_superadmin()
  )
  WITH CHECK (
    public.is_org_manager_or_owner(organization_id)
    OR public.is_admin_or_superadmin()
  );

CREATE INDEX venue_bio_profiles_org_idx
  ON public.venue_bio_profiles (organization_id, venue_id);

-- organization_id NUNCA é confiada ao cliente: é sempre derivada do venue.
CREATE OR REPLACE FUNCTION public.venue_bio_derive_organization()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _org uuid;
BEGIN
  SELECT v.organization_id INTO _org
  FROM public.venues v WHERE v.id = NEW.venue_id;

  IF _org IS NULL THEN
    RAISE EXCEPTION 'Estabelecimento % não existe ou não possui organização.',
      NEW.venue_id USING ERRCODE = '23503';
  END IF;

  NEW.organization_id := _org;
  RETURN NEW;
END;
$$;

-- updated_at específico da Bio (sem helper genérico global).
CREATE OR REPLACE FUNCTION public.venue_bio_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER venue_bio_profiles_org_venue BEFORE INSERT OR UPDATE
  ON public.venue_bio_profiles FOR EACH ROW
  EXECUTE FUNCTION public.venue_bio_derive_organization();
CREATE TRIGGER venue_bio_profiles_touch BEFORE UPDATE
  ON public.venue_bio_profiles FOR EACH ROW
  EXECUTE FUNCTION public.venue_bio_touch_updated_at();

-- published_at segue is_published (publicar => now(); despublicar => NULL).
CREATE OR REPLACE FUNCTION public.venue_bio_sync_published_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_published THEN
    IF TG_OP = 'INSERT' OR NOT COALESCE(OLD.is_published, false) THEN
      NEW.published_at := now();
    ELSE
      NEW.published_at := OLD.published_at;
    END IF;
  ELSE
    NEW.published_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER venue_bio_profiles_published_at BEFORE INSERT OR UPDATE
  ON public.venue_bio_profiles FOR EACH ROW
  EXECUTE FUNCTION public.venue_bio_sync_published_at();

-- ----------------------------------- short_links: reaproveitado, não duplicado
-- O encurtador oficial continua sendo a ÚNICA fonte de links. Aqui só ganha
-- escopo de estabelecimento e a marcação de exibição na Bio.
-- As policies atuais do encurtador NÃO são removidas nem substituídas; o
-- tenancy é garantido por trigger, que vale para qualquer policy existente.
ALTER TABLE public.short_links
  ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES public.venues(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS show_on_bio boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bio_position integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS short_links_bio_idx
  ON public.short_links (venue_id, show_on_bio, bio_position);

-- Guarda-corpo de tenancy do encurtador:
--  * organization_id é SEMPRE derivada do venue (nunca confiada no cliente);
--  * só owner/manager ativo da organização (ou admin Roxou) pode vincular,
--    desvincular, mover de tenant ou marcar show_on_bio.
CREATE OR REPLACE FUNCTION public.enforce_short_link_tenancy()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _is_admin boolean := public.is_admin_or_superadmin();
  _old_venue uuid := CASE WHEN TG_OP = 'UPDATE' THEN OLD.venue_id ELSE NULL END;
BEGIN
  -- organization_id sempre derivada do venue.
  IF NEW.venue_id IS NULL THEN
    NEW.organization_id := NULL;
    NEW.show_on_bio := false;
    NEW.bio_position := 0;
  ELSE
    SELECT v.organization_id INTO NEW.organization_id
    FROM public.venues v WHERE v.id = NEW.venue_id;
    IF NEW.organization_id IS NULL THEN
      RAISE EXCEPTION 'Estabelecimento inválido para o link.' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  -- Sem mudança de tenancy/exibição: nada a autorizar.
  IF TG_OP = 'UPDATE'
     AND NEW.venue_id IS NOT DISTINCT FROM OLD.venue_id
     AND NEW.show_on_bio IS NOT DISTINCT FROM OLD.show_on_bio THEN
    RETURN NEW;
  END IF;

  IF _is_admin THEN
    RETURN NEW;
  END IF;

  -- Destino: precisa ser gerente/dono do venue de destino.
  IF NEW.venue_id IS NOT NULL
     AND NOT public.is_org_manager_or_owner(NEW.organization_id) THEN
    RAISE EXCEPTION 'Sem permissão para vincular este link ao estabelecimento.'
      USING ERRCODE = '42501';
  END IF;

  -- Origem: para tirar/mover um link já vinculado, precisa ser gerente/dono dele.
  IF _old_venue IS NOT NULL
     AND _old_venue IS DISTINCT FROM NEW.venue_id
     AND NOT public.is_org_manager_or_owner(OLD.organization_id) THEN
    RAISE EXCEPTION 'Sem permissão para mover este link de estabelecimento.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS short_links_tenancy ON public.short_links;
CREATE TRIGGER short_links_tenancy BEFORE INSERT OR UPDATE
  ON public.short_links FOR EACH ROW
  EXECUTE FUNCTION public.enforce_short_link_tenancy();

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
    -- Links: sempre via URL OFICIAL do encurtador (https://roxou.click/<slug>).
    -- target_url NÃO é exposto publicamente, para que todo clique passe pelo
    -- redirecionador oficial e seja contabilizado no tracking já existente.
    'links', CASE WHEN b.show_links THEN COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'title', l.title,
               'slug', l.slug,
               'short_url', 'https://roxou.click/' || l.slug
             ) ORDER BY l.bio_position, l.created_at)
      FROM (
        SELECT s.title, s.slug, s.bio_position, s.created_at
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
-- Autoriza owner/manager ativo da organização do venue OU admin/superadmin Roxou.
-- Campo ausente no patch  => mantém valor atual.
-- Campo presente com null => limpa (apenas colunas nullable).
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

  -- Campos NOT NULL: rejeita null explícito.
  IF (_p ? 'theme' AND jsonb_typeof(_p->'theme') = 'null')
     OR (_p ? 'is_published' AND jsonb_typeof(_p->'is_published') = 'null')
     OR EXISTS (
       SELECT 1 FROM unnest(ARRAY['show_events','show_reservations','show_vip',
                                  'show_giveaways','show_links','show_menu']) k
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
      primary_cta_label = CASE WHEN _p ? 'primary_cta_label' THEN _p->>'primary_cta_label' ELSE b.primary_cta_label END,
      primary_cta_url   = CASE WHEN _p ? 'primary_cta_url' THEN _p->>'primary_cta_url' ELSE b.primary_cta_url END,
      is_published      = CASE WHEN _p ? 'is_published' THEN (_p->>'is_published')::boolean ELSE b.is_published END
      -- published_at é definido pelo trigger venue_bio_profiles_published_at.
  WHERE b.venue_id = _venue_id
  RETURNING b.id INTO _id;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.partner_upsert_venue_bio(uuid, uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.partner_upsert_venue_bio(uuid, uuid, jsonb) TO authenticated;
