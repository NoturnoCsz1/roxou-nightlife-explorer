
-- ============ 1. closes_at / auto_close em partner_vip_lists ============
ALTER TABLE public.partner_vip_lists
  ADD COLUMN IF NOT EXISTS closes_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_close_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS close_reason text;

-- ============ 2. closes_at / auto_close em partner_reservations ============
ALTER TABLE public.partner_reservations
  ADD COLUMN IF NOT EXISTS closes_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_close_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS close_reason text;

-- ============ 3. Validador: event_id deve pertencer ao mesmo partner ============
CREATE OR REPLACE FUNCTION public._validate_partner_event_link()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _evt_partner uuid;
  _evt_date timestamptz;
  _evt_status text;
BEGIN
  IF NEW.event_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT partner_id, date_time, status
    INTO _evt_partner, _evt_date, _evt_status
    FROM public.events
    WHERE id = NEW.event_id;

  IF _evt_partner IS NULL THEN
    RAISE EXCEPTION 'Evento não encontrado' USING ERRCODE='23503';
  END IF;
  IF _evt_partner <> NEW.partner_id THEN
    RAISE EXCEPTION 'Evento não pertence a este estabelecimento'
      USING ERRCODE='23514';
  END IF;
  -- Permite consulta histórica, mas bloqueia novo vínculo a evento já encerrado
  IF TG_OP = 'INSERT' AND _evt_date IS NOT NULL AND _evt_date < (now() - interval '6 hours') THEN
    RAISE EXCEPTION 'Não é permitido vincular a um evento encerrado'
      USING ERRCODE='23514';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_vip_list_validate_event ON public.partner_vip_lists;
CREATE TRIGGER trg_vip_list_validate_event
  BEFORE INSERT OR UPDATE OF event_id ON public.partner_vip_lists
  FOR EACH ROW EXECUTE FUNCTION public._validate_partner_event_link();

DROP TRIGGER IF EXISTS trg_reservation_validate_event ON public.partner_reservations;
CREATE TRIGGER trg_reservation_validate_event
  BEFORE INSERT OR UPDATE OF event_id ON public.partner_reservations
  FOR EACH ROW EXECUTE FUNCTION public._validate_partner_event_link();

-- ============ 4. Estado operacional calculado ============
-- Retorna: 'open' | 'sold_out' | 'closed' | 'ended'
CREATE OR REPLACE FUNCTION public.compute_partner_vip_list_state(
  _status text,
  _closes_at timestamptz,
  _event_id uuid,
  _max_entries int,
  _used int
) RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  _evt_date timestamptz;
BEGIN
  IF _status IN ('archived') THEN RETURN 'closed'; END IF;
  IF _event_id IS NOT NULL THEN
    SELECT date_time INTO _evt_date FROM public.events WHERE id = _event_id;
    IF _evt_date IS NOT NULL AND now() > _evt_date THEN
      RETURN 'ended';
    END IF;
  END IF;
  IF _status = 'closed' THEN RETURN 'closed'; END IF;
  IF _closes_at IS NOT NULL AND now() > _closes_at THEN RETURN 'closed'; END IF;
  IF _max_entries IS NOT NULL AND _used >= _max_entries THEN RETURN 'sold_out'; END IF;
  RETURN 'open';
END $$;

GRANT EXECUTE ON FUNCTION public.compute_partner_vip_list_state(text,timestamptz,uuid,int,int)
  TO anon, authenticated;

-- ============ 5. Submit público — bloqueia closed/ended/sold_out ============
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
  _state text;
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
  IF _list.id IS NULL THEN RAISE EXCEPTION 'Lista não encontrada'; END IF;
  IF NOT _list.public_enabled THEN RAISE EXCEPTION 'Esta lista não está aberta'; END IF;

  SELECT COUNT(*) INTO _used
    FROM public.partner_vip_list_entries
    WHERE vip_list_id = _list.id AND status <> 'cancelled';

  _state := public.compute_partner_vip_list_state(
    _list.status, _list.closes_at, _list.event_id, _list.max_entries, _used
  );

  IF _state = 'ended' THEN RAISE EXCEPTION 'Esta Lista VIP foi encerrada.'; END IF;
  IF _state = 'closed' THEN RAISE EXCEPTION 'Esta Lista VIP foi fechada para novas inscrições.'; END IF;
  IF _state = 'sold_out' THEN RAISE EXCEPTION 'Capacidade esgotada'; END IF;

  -- Promoter (opcional)
  IF p_promoter_slug IS NOT NULL AND length(btrim(p_promoter_slug)) > 0 THEN
    SELECT id, name INTO _promoter_id, _promoter_name
      FROM public.partner_promoters
      WHERE partner_id = _list.partner_id
        AND slug = lower(btrim(p_promoter_slug))
        AND is_active = true
      LIMIT 1;
  END IF;

  -- Antifraude por telefone
  IF EXISTS (
    SELECT 1 FROM public.partner_vip_list_entries
     WHERE vip_list_id = _list.id AND status <> 'cancelled'
       AND normalized_phone = _phone_clean
  ) THEN
    RAISE EXCEPTION 'Você já está inscrito nesta Lista VIP.';
  END IF;
  IF _email_clean IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.partner_vip_list_entries
     WHERE vip_list_id = _list.id AND status <> 'cancelled'
       AND lower(email) = _email_clean
  ) THEN
    RAISE EXCEPTION 'Você já está inscrito nesta Lista VIP.';
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
  ) RETURNING * INTO _entry;

  _qr := 'vip:' || _entry.public_token::text;
  UPDATE public.partner_vip_list_entries SET qr_code_payload = _qr WHERE id = _entry.id;

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

GRANT EXECUTE ON FUNCTION public.submit_public_vip_entry(text,text,text,text,text,boolean,boolean,boolean)
  TO anon, authenticated;

-- ============ 6. get_public_vip_list expõe estado operacional ============
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
  _state text;
  _evt_date timestamptz;
BEGIN
  SELECT * INTO _list FROM public.partner_vip_lists WHERE public_slug = p_public_slug;
  IF _list.id IS NULL OR NOT _list.public_enabled THEN RETURN NULL; END IF;

  SELECT name, city, address, slug, logo_url
    INTO _partner FROM public.partners WHERE id = _list.partner_id;

  SELECT COUNT(*) INTO _used
    FROM public.partner_vip_list_entries
    WHERE vip_list_id = _list.id AND status <> 'cancelled';

  _state := public.compute_partner_vip_list_state(
    _list.status, _list.closes_at, _list.event_id, _list.max_entries, _used
  );

  IF _list.event_id IS NOT NULL THEN
    SELECT date_time INTO _evt_date FROM public.events WHERE id = _list.event_id;
  END IF;

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
    'closes_at', _list.closes_at,
    'auto_close_enabled', _list.auto_close_enabled,
    'event_id', _list.event_id,
    'event_date', _evt_date,
    'max_entries', _list.max_entries,
    'used_entries', _used,
    'max_entries_per_person', _list.max_entries_per_person,
    'allow_multiple_people_per_entry', _list.allow_multiple_people_per_entry,
    'status', _list.status,
    'operational_state', _state,
    'requires_approval', _list.requires_approval,
    'partner_id', _list.partner_id,
    'partner_name', _partner.name,
    'partner_city', _partner.city,
    'partner_address', _partner.address,
    'partner_slug', _partner.slug,
    'partner_logo_url', _partner.logo_url,
    'is_open', _state = 'open'
  );
END $$;

GRANT EXECUTE ON FUNCTION public.get_public_vip_list(text) TO anon, authenticated;

-- ============ 7. close_due_partner_vip_lists (manutenção / cron) ============
CREATE OR REPLACE FUNCTION public.close_due_partner_vip_lists()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _n int;
BEGIN
  WITH upd AS (
    UPDATE public.partner_vip_lists
       SET status = 'closed',
           close_reason = COALESCE(close_reason,'auto'),
           updated_at = now()
     WHERE status IN ('open','draft')
       AND auto_close_enabled = true
       AND closes_at IS NOT NULL
       AND now() > closes_at
     RETURNING 1
  )
  SELECT count(*) INTO _n FROM upd;
  RETURN _n;
END $$;

REVOKE ALL ON FUNCTION public.close_due_partner_vip_lists() FROM public;
GRANT EXECUTE ON FUNCTION public.close_due_partner_vip_lists() TO authenticated;
