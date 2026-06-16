-- Recriar compute_partner_vip_list_state com nova assinatura (adiciona starts_at e ends_at).
DROP FUNCTION IF EXISTS public.compute_partner_vip_list_state(text, timestamptz, uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.compute_partner_vip_list_state(
  _status       text,
  _closes_at    timestamptz,
  _event_id     uuid,
  _max_entries  integer,
  _used         integer,
  _starts_at    timestamptz DEFAULT NULL,
  _ends_at      timestamptz DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  _evt_date  timestamptz;
  _day_ref   timestamptz;
  _deadline  timestamptz;
BEGIN
  -- Arquivada: mapeada para 'closed' (compatível com os consumidores existentes).
  IF _status = 'archived' THEN
    RETURN 'closed';
  END IF;

  -- Fechamento manual / por closes_at (não bloqueia o cálculo de ended abaixo,
  -- mas tem prioridade sobre 'open'/'sold_out').
  IF _status = 'closed' THEN
    RETURN 'closed';
  END IF;
  IF _closes_at IS NOT NULL AND now() > _closes_at THEN
    RETURN 'closed';
  END IF;

  -- Resolve data do evento (se houver vínculo).
  IF _event_id IS NOT NULL THEN
    SELECT date_time INTO _evt_date FROM public.events WHERE id = _event_id;
  END IF;

  -- Deadline principal = ends_at.
  -- Fallback = fim do dia em America/Sao_Paulo da data do evento OU do starts_at.
  -- starts_at sozinho NUNCA é deadline direto.
  IF _ends_at IS NOT NULL THEN
    _deadline := _ends_at;
  ELSE
    _day_ref := COALESCE(_evt_date, _starts_at);
    IF _day_ref IS NOT NULL THEN
      -- início do dia seguinte em SP (exclusivo)
      _deadline := (((_day_ref AT TIME ZONE 'America/Sao_Paulo')::date + 1)::timestamp)
                   AT TIME ZONE 'America/Sao_Paulo';
    END IF;
  END IF;

  IF _deadline IS NOT NULL AND now() > _deadline THEN
    RETURN 'ended';
  END IF;

  -- Lotação.
  IF _max_entries IS NOT NULL AND _used >= _max_entries THEN
    RETURN 'sold_out';
  END IF;

  -- Sem referência temporal e não fechada → permanece aberta (nunca encerra por tempo).
  RETURN 'open';
END
$function$;

-- Atualiza submit_public_vip_entry para passar starts_at/ends_at.
CREATE OR REPLACE FUNCTION public.submit_public_vip_entry(
  p_public_slug text,
  p_name text,
  p_phone text,
  p_email text,
  p_promoter_slug text DEFAULT NULL::text,
  p_marketing_consent boolean DEFAULT false,
  p_whatsapp_consent boolean DEFAULT false,
  p_email_consent boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    _list.status, _list.closes_at, _list.event_id, _list.max_entries, _used,
    _list.starts_at, _list.ends_at
  );

  IF _state = 'ended' THEN RAISE EXCEPTION 'Esta Lista VIP foi encerrada.'; END IF;
  IF _state = 'closed' THEN RAISE EXCEPTION 'Esta Lista VIP foi fechada para novas inscrições.'; END IF;
  IF _state = 'sold_out' THEN RAISE EXCEPTION 'Capacidade esgotada'; END IF;

  IF p_promoter_slug IS NOT NULL AND length(btrim(p_promoter_slug)) > 0 THEN
    SELECT id, name INTO _promoter_id, _promoter_name
      FROM public.partner_promoters
      WHERE partner_id = _list.partner_id
        AND slug = lower(btrim(p_promoter_slug))
        AND is_active = true
      LIMIT 1;
  END IF;

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
END
$function$;

-- Atualiza get_public_vip_list para passar starts_at/ends_at no cálculo.
CREATE OR REPLACE FUNCTION public.get_public_vip_list(p_public_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    _list.status, _list.closes_at, _list.event_id, _list.max_entries, _used,
    _list.starts_at, _list.ends_at
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
END
$function$;