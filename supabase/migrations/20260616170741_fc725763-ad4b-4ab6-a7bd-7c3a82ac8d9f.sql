
-- ============ 1. allow_multiple_people_per_entry ============
ALTER TABLE public.partner_vip_lists
  ADD COLUMN IF NOT EXISTS allow_multiple_people_per_entry boolean NOT NULL DEFAULT false;

-- ============ 2. consents on entries ============
ALTER TABLE public.partner_vip_list_entries
  ADD COLUMN IF NOT EXISTS marketing_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_consent  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_consent     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS normalized_phone  text;

CREATE INDEX IF NOT EXISTS partner_vip_list_entries_normphone_idx
  ON public.partner_vip_list_entries(vip_list_id, normalized_phone);

-- Backfill normalized_phone (digits only)
UPDATE public.partner_vip_list_entries
SET normalized_phone = regexp_replace(coalesce(phone,''), '[^0-9]', '', 'g')
WHERE normalized_phone IS NULL;

-- ============ 3. partner_leads (CRM base) ============
CREATE TABLE IF NOT EXISTS public.partner_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  normalized_phone text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'vip_list',
  source_reference_id uuid,
  source_reference_type text,
  marketing_consent boolean NOT NULL DEFAULT false,
  whatsapp_consent  boolean NOT NULL DEFAULT false,
  email_consent     boolean NOT NULL DEFAULT false,
  total_events   integer NOT NULL DEFAULT 1,
  total_checkins integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS partner_leads_partner_phone_uidx
  ON public.partner_leads(partner_id, normalized_phone)
  WHERE normalized_phone IS NOT NULL AND normalized_phone <> '';

CREATE UNIQUE INDEX IF NOT EXISTS partner_leads_partner_email_uidx
  ON public.partner_leads(partner_id, lower(email))
  WHERE email IS NOT NULL AND email <> '';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_leads TO authenticated;
GRANT ALL ON public.partner_leads TO service_role;

ALTER TABLE public.partner_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner_leads_select_own" ON public.partner_leads;
CREATE POLICY "partner_leads_select_own"
  ON public.partner_leads FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_partner_reservation_manager(auth.uid(), partner_id)
  );

DROP POLICY IF EXISTS "partner_leads_modify_own" ON public.partner_leads;
CREATE POLICY "partner_leads_modify_own"
  ON public.partner_leads FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_partner_reservation_manager(auth.uid(), partner_id)
  )
  WITH CHECK (
    public.is_admin()
    OR public.is_partner_reservation_manager(auth.uid(), partner_id)
  );

DROP POLICY IF EXISTS "partner_leads_delete_own" ON public.partner_leads;
CREATE POLICY "partner_leads_delete_own"
  ON public.partner_leads FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_partner_reservation_manager(auth.uid(), partner_id)
  );

DROP TRIGGER IF EXISTS trg_partner_leads_updated_at ON public.partner_leads;
CREATE TRIGGER trg_partner_leads_updated_at
  BEFORE UPDATE ON public.partner_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 4. helper: upsert lead (SECURITY DEFINER) ============
CREATE OR REPLACE FUNCTION public._upsert_partner_lead(
  _partner_id uuid,
  _name text,
  _phone text,
  _normalized_phone text,
  _email text,
  _source text,
  _ref_type text,
  _ref_id uuid,
  _marketing_consent boolean,
  _whatsapp_consent boolean,
  _email_consent boolean
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  -- find by phone
  IF _normalized_phone IS NOT NULL AND length(_normalized_phone) > 0 THEN
    SELECT id INTO _id FROM public.partner_leads
      WHERE partner_id = _partner_id AND normalized_phone = _normalized_phone
      LIMIT 1;
  END IF;

  IF _id IS NULL AND _email IS NOT NULL AND length(btrim(_email)) > 0 THEN
    SELECT id INTO _id FROM public.partner_leads
      WHERE partner_id = _partner_id AND lower(email) = lower(_email)
      LIMIT 1;
  END IF;

  IF _id IS NULL THEN
    INSERT INTO public.partner_leads(
      partner_id, full_name, email, phone, normalized_phone,
      source, source_reference_type, source_reference_id,
      marketing_consent, whatsapp_consent, email_consent,
      total_events
    ) VALUES (
      _partner_id, _name, NULLIF(_email,''), _phone, NULLIF(_normalized_phone,''),
      coalesce(_source,'vip_list'), _ref_type, _ref_id,
      coalesce(_marketing_consent,false),
      coalesce(_whatsapp_consent,false),
      coalesce(_email_consent,false),
      1
    ) RETURNING id INTO _id;
  ELSE
    UPDATE public.partner_leads SET
      last_seen_at  = now(),
      total_events  = total_events + 1,
      full_name     = COALESCE(NULLIF(btrim(_name),''), full_name),
      email         = COALESCE(NULLIF(btrim(_email),''), email),
      phone         = COALESCE(NULLIF(btrim(_phone),''), phone),
      normalized_phone = COALESCE(NULLIF(_normalized_phone,''), normalized_phone),
      marketing_consent = marketing_consent OR coalesce(_marketing_consent,false),
      whatsapp_consent  = whatsapp_consent  OR coalesce(_whatsapp_consent,false),
      email_consent     = email_consent     OR coalesce(_email_consent,false)
      WHERE id = _id;
  END IF;

  RETURN _id;
END $$;

REVOKE ALL ON FUNCTION public._upsert_partner_lead(uuid,text,text,text,text,text,text,uuid,boolean,boolean,boolean) FROM public;

-- ============ 5. replace submit_public_vip_entry ============
DROP FUNCTION IF EXISTS public.submit_public_vip_entry(text,text,text,text,int,text);

CREATE OR REPLACE FUNCTION public.submit_public_vip_entry(
  p_public_slug text,
  p_name text,
  p_phone text,
  p_email text,
  p_promoter_slug text DEFAULT NULL,
  p_marketing_consent boolean DEFAULT false,
  p_whatsapp_consent boolean DEFAULT false,
  p_email_consent boolean DEFAULT false
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
  _phone_clean text;
  _email_clean text;
  _used int;
  _initial_status text;
  _qr text;
  _lead uuid;
BEGIN
  IF p_public_slug IS NULL OR length(btrim(p_public_slug)) = 0 THEN
    RAISE EXCEPTION 'Lista não encontrada';
  END IF;
  IF p_name IS NULL OR length(btrim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Nome é obrigatório';
  END IF;

  _phone_clean := regexp_replace(coalesce(p_phone,''), '[^0-9]', '', 'g');
  IF length(_phone_clean) < 10 THEN
    RAISE EXCEPTION 'Telefone inválido';
  END IF;
  _email_clean := NULLIF(lower(btrim(coalesce(p_email,''))), '');

  SELECT * INTO _list FROM public.partner_vip_lists WHERE public_slug = p_public_slug;
  IF _list.id IS NULL THEN
    RAISE EXCEPTION 'Lista não encontrada';
  END IF;
  IF NOT _list.public_enabled THEN
    RAISE EXCEPTION 'Esta lista não está aberta';
  END IF;
  IF _list.status NOT IN ('open','draft') THEN
    RAISE EXCEPTION 'A lista está fechada';
  END IF;

  -- Promoter
  IF p_promoter_slug IS NOT NULL AND length(btrim(p_promoter_slug)) > 0 THEN
    SELECT id, name INTO _promoter_id, _promoter_name
      FROM public.partner_promoters
      WHERE partner_id = _list.partner_id
        AND slug = lower(btrim(p_promoter_slug))
        AND is_active = true
      LIMIT 1;
  END IF;

  -- Antifraude: telefone duplicado na mesma lista
  IF EXISTS (
    SELECT 1 FROM public.partner_vip_list_entries
     WHERE vip_list_id = _list.id
       AND status <> 'cancelled'
       AND normalized_phone = _phone_clean
  ) THEN
    RAISE EXCEPTION 'Você já está inscrito nesta Lista VIP.';
  END IF;
  IF _email_clean IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.partner_vip_list_entries
     WHERE vip_list_id = _list.id
       AND status <> 'cancelled'
       AND lower(email) = _email_clean
  ) THEN
    RAISE EXCEPTION 'Você já está inscrito nesta Lista VIP.';
  END IF;

  -- Capacidade (1 entry = 1 pessoa)
  IF _list.max_entries IS NOT NULL THEN
    SELECT COUNT(*) INTO _used
      FROM public.partner_vip_list_entries
      WHERE vip_list_id = _list.id AND status <> 'cancelled';
    IF _used + 1 > _list.max_entries THEN
      RAISE EXCEPTION 'Capacidade esgotada';
    END IF;
  END IF;

  _initial_status := CASE WHEN _list.requires_approval THEN 'pending' ELSE 'approved' END;

  INSERT INTO public.partner_vip_list_entries(
    vip_list_id, partner_id, event_id, name, phone, normalized_phone, email,
    people_count, status, promoter_id, promoter_name_snapshot,
    source, public_submitted_at,
    marketing_consent, whatsapp_consent, email_consent
  ) VALUES (
    _list.id, _list.partner_id, _list.event_id,
    btrim(p_name), _phone_clean, _phone_clean, _email_clean,
    1, _initial_status, _promoter_id, _promoter_name,
    'public', now(),
    coalesce(p_marketing_consent,false),
    coalesce(p_whatsapp_consent,false),
    coalesce(p_email_consent,false)
  )
  RETURNING * INTO _entry;

  _qr := 'vip:' || _entry.public_token::text;
  UPDATE public.partner_vip_list_entries
    SET qr_code_payload = _qr
    WHERE id = _entry.id;

  -- Lead capture
  _lead := public._upsert_partner_lead(
    _list.partner_id, btrim(p_name), _phone_clean, _phone_clean, _email_clean,
    'vip_list', 'vip_list_entry', _entry.id,
    coalesce(p_marketing_consent,false),
    coalesce(p_whatsapp_consent,false),
    coalesce(p_email_consent,false)
  );

  RETURN jsonb_build_object(
    'entry_id', _entry.id,
    'public_token', _entry.public_token,
    'status', _initial_status,
    'qr_code_payload', _qr,
    'list_title', _list.title,
    'name', _entry.name,
    'phone', _entry.phone,
    'promoter_name', _promoter_name,
    'lead_id', _lead
  );
END $$;

GRANT EXECUTE ON FUNCTION public.submit_public_vip_entry(text,text,text,text,text,boolean,boolean,boolean) TO anon, authenticated;

-- ============ 6. get_public_vip_list — expose partner slug + logo ============
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

  SELECT name, city, address, slug, logo_url
    INTO _partner FROM public.partners WHERE id = _list.partner_id;

  SELECT COUNT(*) INTO _used
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
    'allow_multiple_people_per_entry', _list.allow_multiple_people_per_entry,
    'status', _list.status,
    'requires_approval', _list.requires_approval,
    'partner_id', _list.partner_id,
    'partner_name', _partner.name,
    'partner_city', _partner.city,
    'partner_address', _partner.address,
    'partner_slug', _partner.slug,
    'partner_logo_url', _partner.logo_url,
    'is_open', _list.status IN ('open','draft')
  );
END $$;

GRANT EXECUTE ON FUNCTION public.get_public_vip_list(text) TO anon, authenticated;

-- ============ 7. get_public_vip_list_by_partner ============
CREATE OR REPLACE FUNCTION public.get_public_vip_list_by_partner(p_partner_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  _partner record;
  _slug text;
BEGIN
  IF p_partner_slug IS NULL OR length(btrim(p_partner_slug)) = 0 THEN
    RETURN NULL;
  END IF;
  SELECT id INTO _partner FROM public.partners WHERE slug = lower(btrim(p_partner_slug)) LIMIT 1;
  IF _partner.id IS NULL THEN RETURN NULL; END IF;

  SELECT public_slug INTO _slug
    FROM public.partner_vip_lists
    WHERE partner_id = _partner.id
      AND public_enabled = true
      AND status IN ('open','draft')
    ORDER BY (status = 'open') DESC, updated_at DESC, created_at DESC
    LIMIT 1;

  IF _slug IS NULL THEN RETURN NULL; END IF;
  RETURN public.get_public_vip_list(_slug);
END $$;

GRANT EXECUTE ON FUNCTION public.get_public_vip_list_by_partner(text) TO anon, authenticated;
