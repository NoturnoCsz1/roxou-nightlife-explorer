
-- ============= 1. partner_vip_lists: campos públicos =============
ALTER TABLE public.partner_vip_lists
  ADD COLUMN IF NOT EXISTS public_slug text,
  ADD COLUMN IF NOT EXISTS public_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_title text,
  ADD COLUMN IF NOT EXISTS public_description text,
  ADD COLUMN IF NOT EXISTS public_cover_url text,
  ADD COLUMN IF NOT EXISTS public_rules text,
  ADD COLUMN IF NOT EXISTS max_entries_per_person int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS requires_approval boolean NOT NULL DEFAULT false;

-- Backfill public_slug
UPDATE public.partner_vip_lists
SET public_slug = lower(
  regexp_replace(
    regexp_replace(coalesce(title, 'lista') || '-' || substr(replace(id::text,'-',''),1,6), '[^a-zA-Z0-9]+','-','g'),
    '(^-+|-+$)', '', 'g'
  )
)
WHERE public_slug IS NULL;

ALTER TABLE public.partner_vip_lists
  ALTER COLUMN public_slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS partner_vip_lists_public_slug_key
  ON public.partner_vip_lists(public_slug);

-- ============= 2. partner_vip_list_entries: público =============
ALTER TABLE public.partner_vip_list_entries
  ADD COLUMN IF NOT EXISTS public_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS public_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS qr_code_payload text;

CREATE UNIQUE INDEX IF NOT EXISTS partner_vip_list_entries_public_token_key
  ON public.partner_vip_list_entries(public_token);

-- ============= 3. partner_promoters: slug =============
ALTER TABLE public.partner_promoters
  ADD COLUMN IF NOT EXISTS slug text;

UPDATE public.partner_promoters
SET slug = lower(
  regexp_replace(
    regexp_replace(coalesce(name, 'promoter') || '-' || substr(replace(id::text,'-',''),1,4), '[^a-zA-Z0-9]+','-','g'),
    '(^-+|-+$)', '', 'g'
  )
)
WHERE slug IS NULL;

ALTER TABLE public.partner_promoters
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS partner_promoters_partner_slug_key
  ON public.partner_promoters(partner_id, slug);

-- ============= 4. trigger: auto-gerar slugs ao inserir =============
CREATE OR REPLACE FUNCTION public._vip_list_ensure_public_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.public_slug IS NULL OR length(btrim(NEW.public_slug)) = 0 THEN
    NEW.public_slug := lower(
      regexp_replace(
        regexp_replace(coalesce(NEW.title,'lista') || '-' || substr(replace(NEW.id::text,'-',''),1,6), '[^a-zA-Z0-9]+','-','g'),
        '(^-+|-+$)','','g'
      )
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_vip_list_ensure_public_slug ON public.partner_vip_lists;
CREATE TRIGGER trg_vip_list_ensure_public_slug
  BEFORE INSERT ON public.partner_vip_lists
  FOR EACH ROW EXECUTE FUNCTION public._vip_list_ensure_public_slug();

CREATE OR REPLACE FUNCTION public._promoter_ensure_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  n int := 0;
BEGIN
  IF NEW.slug IS NULL OR length(btrim(NEW.slug)) = 0 THEN
    base := lower(regexp_replace(regexp_replace(coalesce(NEW.name,'promoter'),'[^a-zA-Z0-9]+','-','g'),'(^-+|-+$)','','g'));
    IF base = '' THEN base := 'promoter'; END IF;
    candidate := base;
    WHILE EXISTS (SELECT 1 FROM public.partner_promoters WHERE partner_id = NEW.partner_id AND slug = candidate AND id <> NEW.id) LOOP
      n := n + 1;
      candidate := base || '-' || n;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_promoter_ensure_slug ON public.partner_promoters;
CREATE TRIGGER trg_promoter_ensure_slug
  BEFORE INSERT ON public.partner_promoters
  FOR EACH ROW EXECUTE FUNCTION public._promoter_ensure_slug();

-- ============= 5. RPC: ativar/desativar link público =============
CREATE OR REPLACE FUNCTION public.set_partner_vip_list_public_enabled(_list_id uuid, _enabled boolean)
RETURNS public.partner_vip_lists
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _partner uuid;
  _row public.partner_vip_lists;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  SELECT partner_id INTO _partner FROM public.partner_vip_lists WHERE id = _list_id;
  IF _partner IS NULL THEN RAISE EXCEPTION 'List not found'; END IF;
  IF NOT (public.is_admin() OR public.is_partner_owner_or_admin(_uid, _partner)) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501';
  END IF;
  UPDATE public.partner_vip_lists
    SET public_enabled = _enabled, updated_at = now()
    WHERE id = _list_id
    RETURNING * INTO _row;
  RETURN _row;
END $$;

-- ============= 6. RPC: inscrição pública =============
CREATE OR REPLACE FUNCTION public.submit_public_vip_entry(
  p_public_slug text,
  p_name text,
  p_phone text,
  p_email text,
  p_people_count int,
  p_promoter_slug text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _list public.partner_vip_lists;
  _entry public.partner_vip_list_entries;
  _promoter_id uuid;
  _promoter_name text;
  _people int;
  _phone_clean text;
  _used_people int;
  _initial_status text;
  _qr text;
BEGIN
  IF p_public_slug IS NULL OR length(btrim(p_public_slug)) = 0 THEN
    RAISE EXCEPTION 'public_slug required';
  END IF;
  IF p_name IS NULL OR length(btrim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Nome é obrigatório';
  END IF;
  _phone_clean := regexp_replace(coalesce(p_phone,''), '[^0-9+]', '', 'g');
  IF length(_phone_clean) < 8 THEN
    RAISE EXCEPTION 'Telefone é obrigatório';
  END IF;
  _people := COALESCE(p_people_count, 1);
  IF _people < 1 THEN _people := 1; END IF;
  IF _people > 20 THEN _people := 20; END IF;

  SELECT * INTO _list FROM public.partner_vip_lists WHERE public_slug = p_public_slug;
  IF _list.id IS NULL THEN
    RAISE EXCEPTION 'Lista não encontrada';
  END IF;
  IF NOT _list.public_enabled THEN
    RAISE EXCEPTION 'Esta lista não está aberta para inscrições públicas';
  END IF;
  IF _list.status NOT IN ('open','draft') THEN
    RAISE EXCEPTION 'A lista está fechada para novas inscrições';
  END IF;

  -- Promoter (opcional)
  IF p_promoter_slug IS NOT NULL AND length(btrim(p_promoter_slug)) > 0 THEN
    SELECT id, name INTO _promoter_id, _promoter_name
      FROM public.partner_promoters
      WHERE partner_id = _list.partner_id
        AND slug = lower(btrim(p_promoter_slug))
        AND is_active = true
      LIMIT 1;
    -- Se promoter inválido, ignora silenciosamente em vez de bloquear o convidado.
  END IF;

  -- Duplicidade por telefone
  IF COALESCE(_list.max_entries_per_person, 1) <= 1 THEN
    IF EXISTS (
      SELECT 1 FROM public.partner_vip_list_entries
      WHERE vip_list_id = _list.id
        AND status <> 'cancelled'
        AND regexp_replace(coalesce(phone,''),'[^0-9+]','','g') = _phone_clean
    ) THEN
      RAISE EXCEPTION 'Esse telefone já está cadastrado nessa lista';
    END IF;
  END IF;

  -- Capacidade
  IF _list.max_entries IS NOT NULL THEN
    SELECT COALESCE(SUM(people_count),0) INTO _used_people
      FROM public.partner_vip_list_entries
      WHERE vip_list_id = _list.id
        AND status <> 'cancelled';
    IF _used_people + _people > _list.max_entries THEN
      RAISE EXCEPTION 'Capacidade esgotada';
    END IF;
  END IF;

  _initial_status := CASE WHEN _list.requires_approval THEN 'pending' ELSE 'approved' END;

  INSERT INTO public.partner_vip_list_entries(
    vip_list_id, partner_id, event_id, name, phone, email, people_count,
    status, promoter_id, promoter_name_snapshot,
    source, public_submitted_at
  ) VALUES (
    _list.id, _list.partner_id, _list.event_id,
    btrim(p_name), _phone_clean, NULLIF(btrim(p_email),''), _people,
    _initial_status, _promoter_id, _promoter_name,
    'public', now()
  )
  RETURNING * INTO _entry;

  _qr := 'vip:' || _entry.public_token::text;

  UPDATE public.partner_vip_list_entries
    SET qr_code_payload = _qr
    WHERE id = _entry.id;

  RETURN jsonb_build_object(
    'entry_id', _entry.id,
    'public_token', _entry.public_token,
    'status', _initial_status,
    'qr_code_payload', _qr,
    'list_title', _list.title,
    'people_count', _entry.people_count,
    'name', _entry.name
  );
END $$;

GRANT EXECUTE ON FUNCTION public.submit_public_vip_entry(text,text,text,text,int,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_partner_vip_list_public_enabled(uuid,boolean) TO authenticated;

-- ============= 7. RPC pública: obter dados da lista por slug =============
CREATE OR REPLACE FUNCTION public.get_public_vip_list(p_public_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  _list public.partner_vip_lists;
  _partner record;
  _used int;
BEGIN
  SELECT * INTO _list FROM public.partner_vip_lists WHERE public_slug = p_public_slug;
  IF _list.id IS NULL OR NOT _list.public_enabled THEN
    RETURN NULL;
  END IF;

  SELECT name, city, address INTO _partner FROM public.partners WHERE id = _list.partner_id;

  SELECT COALESCE(SUM(people_count),0) INTO _used
    FROM public.partner_vip_list_entries
    WHERE vip_list_id = _list.id AND status <> 'cancelled';

  RETURN jsonb_build_object(
    'id', _list.id,
    'public_slug', _list.public_slug,
    'title', _list.title,
    'public_title', _list.public_title,
    'public_description', _list.public_description,
    'public_cover_url', _list.public_cover_url,
    'public_rules', _list.public_rules,
    'starts_at', _list.starts_at,
    'ends_at', _list.ends_at,
    'max_entries', _list.max_entries,
    'used_entries', _used,
    'max_entries_per_person', _list.max_entries_per_person,
    'status', _list.status,
    'requires_approval', _list.requires_approval,
    'partner_name', _partner.name,
    'partner_city', _partner.city,
    'partner_address', _partner.address,
    'is_open', _list.status IN ('open','draft')
  );
END $$;

GRANT EXECUTE ON FUNCTION public.get_public_vip_list(text) TO anon, authenticated;

-- ============= 8. RPC: get entry by public_token (Partner check-in) =============
CREATE OR REPLACE FUNCTION public.get_vip_entry_by_token(p_token uuid)
RETURNS public.partner_vip_list_entries
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.partner_vip_list_entries;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  SELECT * INTO _row FROM public.partner_vip_list_entries WHERE public_token = p_token;
  IF _row.id IS NULL THEN RETURN NULL; END IF;
  IF NOT (public.is_admin() OR public.is_partner_reservation_manager(_uid, _row.partner_id)) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501';
  END IF;
  RETURN _row;
END $$;

GRANT EXECUTE ON FUNCTION public.get_vip_entry_by_token(uuid) TO authenticated;
