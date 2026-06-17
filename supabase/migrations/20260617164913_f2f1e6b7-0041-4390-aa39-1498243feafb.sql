
-- ============================================================
-- Sprint UX Reservas Pro: slot grid + duration + manual release
-- ============================================================

-- 1) New columns -----------------------------------------------------------

ALTER TABLE public.partner_reservation_settings
  ADD COLUMN IF NOT EXISTS slot_interval_minutes integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS default_reservation_duration_minutes integer NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS daily_open_time time NOT NULL DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS daily_close_time time NOT NULL DEFAULT '23:30';

ALTER TABLE public.partner_reservation_types
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS requires_guest_count boolean NOT NULL DEFAULT false;

ALTER TABLE public.partner_reservations
  ADD COLUMN IF NOT EXISTS released_at timestamptz,
  ADD COLUMN IF NOT EXISTS duration_minutes integer;

CREATE INDEX IF NOT EXISTS idx_partner_reservations_type_overlap
  ON public.partner_reservations(reservation_type_id, reservation_date)
  WHERE status IN ('pending','pending_payment','confirmed');

-- 2) Helper: resolve effective duration ------------------------------------

CREATE OR REPLACE FUNCTION public._effective_reservation_duration(
  _type_id uuid,
  _partner_id uuid
) RETURNS integer
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT duration_minutes FROM public.partner_reservation_types WHERE id = _type_id),
    (SELECT default_reservation_duration_minutes FROM public.partner_reservation_settings WHERE partner_id = _partner_id),
    90
  )
$$;

-- 3) Slot availability RPC -------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_reservation_slot_availability(
  p_partner_id uuid,
  p_reservation_type_id uuid,
  p_date date
) RETURNS TABLE(
  slot_start timestamptz,
  slot_end   timestamptz,
  quantity_total integer,
  reserved_count integer,
  available_count integer
)
LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  _settings public.partner_reservation_settings;
  _type public.partner_reservation_types;
  _interval int;
  _duration int;
  _open_time time;
  _close_time time;
  _first timestamptz;
  _last  timestamptz;
BEGIN
  SELECT * INTO _settings FROM public.partner_reservation_settings WHERE partner_id = p_partner_id;
  SELECT * INTO _type FROM public.partner_reservation_types WHERE id = p_reservation_type_id AND partner_id = p_partner_id;
  IF _type.id IS NULL THEN RETURN; END IF;

  _interval   := COALESCE(_settings.slot_interval_minutes, 30);
  _duration   := COALESCE(_type.duration_minutes, _settings.default_reservation_duration_minutes, 90);
  _open_time  := COALESCE(_settings.daily_open_time, '18:00'::time);
  _close_time := COALESCE(_settings.daily_close_time, '23:30'::time);

  -- Build SP-local timestamps for the requested day
  _first := ((p_date::timestamp + _open_time)  AT TIME ZONE 'America/Sao_Paulo');
  _last  := ((p_date::timestamp + _close_time) AT TIME ZONE 'America/Sao_Paulo');

  RETURN QUERY
  WITH slots AS (
    SELECT gs AS s_start,
           gs + (_duration || ' minutes')::interval AS s_end
      FROM generate_series(
        _first,
        _last - (_interval || ' minutes')::interval,
        (_interval || ' minutes')::interval
      ) gs
  )
  SELECT
    sl.s_start,
    sl.s_end,
    _type.quantity::int,
    COALESCE(cnt.c, 0)::int,
    GREATEST(_type.quantity - COALESCE(cnt.c, 0), 0)::int
  FROM slots sl
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS c
      FROM public.partner_reservations r
     WHERE r.reservation_type_id = _type.id
       AND r.status IN ('pending','pending_payment','confirmed')
       AND r.reservation_date < sl.s_end
       AND COALESCE(
             r.released_at,
             r.reservation_date + (COALESCE(r.duration_minutes, _duration) || ' minutes')::interval
           ) > sl.s_start
  ) cnt ON true
  ORDER BY sl.s_start;
END $$;

GRANT EXECUTE ON FUNCTION public.get_reservation_slot_availability(uuid, uuid, date) TO anon, authenticated;

-- 4) Release table RPC -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.release_partner_reservation_table(
  _reservation_id uuid
) RETURNS public.partner_reservations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _partner uuid;
  _row public.partner_reservations;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  SELECT partner_id INTO _partner FROM public.partner_reservations WHERE id = _reservation_id;
  IF _partner IS NULL THEN RAISE EXCEPTION 'Reservation not found'; END IF;
  IF NOT (public.is_admin() OR public.is_partner_reservation_manager(_uid, _partner)) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.partner_reservations
     SET released_at = now(), updated_at = now()
   WHERE id = _reservation_id
   RETURNING * INTO _row;

  RETURN _row;
END $$;

REVOKE EXECUTE ON FUNCTION public.release_partner_reservation_table(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.release_partner_reservation_table(uuid) TO authenticated;

-- 5) Update upsert_partner_reservation_settings (accept new fields) --------

CREATE OR REPLACE FUNCTION public.upsert_partner_reservation_settings(_partner_id uuid, _payload jsonb)
 RETURNS public.partner_reservation_settings
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _row public.partner_reservation_settings;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  IF _partner_id IS NULL THEN RAISE EXCEPTION 'partner_id required'; END IF;
  IF NOT (public.is_admin() OR public.is_partner_owner_or_admin(_uid, _partner_id)) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501';
  END IF;
  IF _payload IS NULL OR jsonb_typeof(_payload) <> 'object' THEN
    RAISE EXCEPTION 'payload must be a JSON object';
  END IF;

  INSERT INTO public.partner_reservation_settings (
    partner_id, reservations_enabled, max_people_per_reservation,
    max_reservations_per_day, advance_booking_hours, auto_confirm,
    reservations_start_at, reservations_end_at, confirmation_timeout_minutes,
    deposit_enabled, deposit_type, deposit_value, payment_instructions,
    pix_key, pix_receiver_name,
    slot_interval_minutes, default_reservation_duration_minutes,
    daily_open_time, daily_close_time
  ) VALUES (
    _partner_id,
    COALESCE((_payload->>'reservations_enabled')::boolean, false),
    COALESCE(NULLIF(_payload->>'max_people_per_reservation','')::int, 10),
    COALESCE(NULLIF(_payload->>'max_reservations_per_day','')::int, 50),
    COALESCE(NULLIF(_payload->>'advance_booking_hours','')::int, 2),
    COALESCE((_payload->>'auto_confirm')::boolean, false),
    NULLIF(_payload->>'reservations_start_at','')::timestamptz,
    NULLIF(_payload->>'reservations_end_at','')::timestamptz,
    COALESCE(NULLIF(_payload->>'confirmation_timeout_minutes','')::int, 30),
    COALESCE((_payload->>'deposit_enabled')::boolean, false),
    COALESCE(NULLIF(_payload->>'deposit_type',''), 'fixed'),
    COALESCE(NULLIF(_payload->>'deposit_value','')::numeric, 0),
    NULLIF(_payload->>'payment_instructions',''),
    NULLIF(_payload->>'pix_key',''),
    NULLIF(_payload->>'pix_receiver_name',''),
    COALESCE(NULLIF(_payload->>'slot_interval_minutes','')::int, 30),
    COALESCE(NULLIF(_payload->>'default_reservation_duration_minutes','')::int, 90),
    COALESCE(NULLIF(_payload->>'daily_open_time','')::time, '18:00'::time),
    COALESCE(NULLIF(_payload->>'daily_close_time','')::time, '23:30'::time)
  )
  ON CONFLICT (partner_id) DO UPDATE SET
    reservations_enabled       = CASE WHEN _payload ? 'reservations_enabled'       THEN (_payload->>'reservations_enabled')::boolean ELSE public.partner_reservation_settings.reservations_enabled END,
    max_people_per_reservation = CASE WHEN _payload ? 'max_people_per_reservation' THEN (_payload->>'max_people_per_reservation')::int ELSE public.partner_reservation_settings.max_people_per_reservation END,
    max_reservations_per_day   = CASE WHEN _payload ? 'max_reservations_per_day'   THEN (_payload->>'max_reservations_per_day')::int ELSE public.partner_reservation_settings.max_reservations_per_day END,
    advance_booking_hours      = CASE WHEN _payload ? 'advance_booking_hours'      THEN (_payload->>'advance_booking_hours')::int ELSE public.partner_reservation_settings.advance_booking_hours END,
    auto_confirm               = CASE WHEN _payload ? 'auto_confirm'               THEN (_payload->>'auto_confirm')::boolean ELSE public.partner_reservation_settings.auto_confirm END,
    reservations_start_at      = CASE WHEN _payload ? 'reservations_start_at'      THEN NULLIF(_payload->>'reservations_start_at','')::timestamptz ELSE public.partner_reservation_settings.reservations_start_at END,
    reservations_end_at        = CASE WHEN _payload ? 'reservations_end_at'        THEN NULLIF(_payload->>'reservations_end_at','')::timestamptz ELSE public.partner_reservation_settings.reservations_end_at END,
    confirmation_timeout_minutes = CASE WHEN _payload ? 'confirmation_timeout_minutes' THEN COALESCE(NULLIF(_payload->>'confirmation_timeout_minutes','')::int, 30) ELSE public.partner_reservation_settings.confirmation_timeout_minutes END,
    deposit_enabled            = CASE WHEN _payload ? 'deposit_enabled'            THEN (_payload->>'deposit_enabled')::boolean ELSE public.partner_reservation_settings.deposit_enabled END,
    deposit_type               = CASE WHEN _payload ? 'deposit_type'               THEN COALESCE(NULLIF(_payload->>'deposit_type',''),'fixed') ELSE public.partner_reservation_settings.deposit_type END,
    deposit_value              = CASE WHEN _payload ? 'deposit_value'              THEN COALESCE(NULLIF(_payload->>'deposit_value','')::numeric, 0) ELSE public.partner_reservation_settings.deposit_value END,
    payment_instructions       = CASE WHEN _payload ? 'payment_instructions'       THEN NULLIF(_payload->>'payment_instructions','') ELSE public.partner_reservation_settings.payment_instructions END,
    pix_key                    = CASE WHEN _payload ? 'pix_key'                    THEN NULLIF(_payload->>'pix_key','') ELSE public.partner_reservation_settings.pix_key END,
    pix_receiver_name          = CASE WHEN _payload ? 'pix_receiver_name'          THEN NULLIF(_payload->>'pix_receiver_name','') ELSE public.partner_reservation_settings.pix_receiver_name END,
    slot_interval_minutes      = CASE WHEN _payload ? 'slot_interval_minutes'      THEN COALESCE(NULLIF(_payload->>'slot_interval_minutes','')::int, public.partner_reservation_settings.slot_interval_minutes) ELSE public.partner_reservation_settings.slot_interval_minutes END,
    default_reservation_duration_minutes = CASE WHEN _payload ? 'default_reservation_duration_minutes' THEN COALESCE(NULLIF(_payload->>'default_reservation_duration_minutes','')::int, public.partner_reservation_settings.default_reservation_duration_minutes) ELSE public.partner_reservation_settings.default_reservation_duration_minutes END,
    daily_open_time            = CASE WHEN _payload ? 'daily_open_time'            THEN COALESCE(NULLIF(_payload->>'daily_open_time','')::time, public.partner_reservation_settings.daily_open_time) ELSE public.partner_reservation_settings.daily_open_time END,
    daily_close_time           = CASE WHEN _payload ? 'daily_close_time'           THEN COALESCE(NULLIF(_payload->>'daily_close_time','')::time, public.partner_reservation_settings.daily_close_time) ELSE public.partner_reservation_settings.daily_close_time END,
    updated_at = now()
  RETURNING * INTO _row;

  RETURN _row;
END $function$;

-- 6) submit_public_reservation: overlap check + capacity fix + duration snapshot

CREATE OR REPLACE FUNCTION public.submit_public_reservation(
  p_partner_slug text, p_type_id uuid, p_name text, p_phone text, p_email text,
  p_guests integer, p_reservation_date timestamp with time zone, p_notes text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _partner public.partners;
  _settings public.partner_reservation_settings;
  _type public.partner_reservation_types;
  _phone_clean text;
  _today_count int;
  _reserved int;
  _status text;
  _expires timestamptz;
  _row public.partner_reservations;
  _code text;
  _price numeric := 0;
  _deposit numeric := 0;
  _remaining numeric := 0;
  _duration int := 90;
  _guests int;
  _new_end timestamptz;
BEGIN
  IF p_partner_slug IS NULL OR length(btrim(p_partner_slug))=0 THEN
    RAISE EXCEPTION 'Estabelecimento inválido';
  END IF;
  IF p_name IS NULL OR length(btrim(p_name))=0 THEN
    RAISE EXCEPTION 'Nome é obrigatório';
  END IF;
  _phone_clean := regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
  IF length(_phone_clean) < 10 THEN
    RAISE EXCEPTION 'Telefone inválido';
  END IF;
  IF p_reservation_date IS NULL THEN
    RAISE EXCEPTION 'Informe data e horário';
  END IF;

  SELECT * INTO _partner FROM public.partners WHERE slug = lower(btrim(p_partner_slug)) LIMIT 1;
  IF _partner.id IS NULL THEN RAISE EXCEPTION 'Estabelecimento não encontrado'; END IF;

  SELECT * INTO _settings FROM public.partner_reservation_settings WHERE partner_id = _partner.id;
  IF _settings.id IS NULL OR NOT _settings.reservations_enabled THEN
    RAISE EXCEPTION 'Este estabelecimento não está aceitando reservas';
  END IF;

  IF _settings.reservations_start_at IS NOT NULL AND now() < _settings.reservations_start_at THEN
    RAISE EXCEPTION 'As reservas ainda não estão abertas';
  END IF;
  IF _settings.reservations_end_at IS NOT NULL AND now() > _settings.reservations_end_at THEN
    RAISE EXCEPTION 'O período de reservas foi encerrado';
  END IF;
  IF _settings.advance_booking_hours IS NOT NULL AND p_reservation_date < (now() + (_settings.advance_booking_hours || ' hours')::interval) THEN
    RAISE EXCEPTION 'Reserva com antecedência mínima de % horas', _settings.advance_booking_hours;
  END IF;

  IF p_type_id IS NOT NULL THEN
    SELECT * INTO _type FROM public.partner_reservation_types
      WHERE id = p_type_id AND partner_id = _partner.id AND active = true
      FOR UPDATE;
    IF _type.id IS NULL THEN RAISE EXCEPTION 'Tipo de reserva indisponível'; END IF;
    _price := COALESCE(_type.price, 0);
    _duration := COALESCE(_type.duration_minutes, _settings.default_reservation_duration_minutes, 90);

    -- Fixed-capacity types force people_count = seats
    IF _type.requires_guest_count = false THEN
      _guests := _type.seats;
    ELSE
      _guests := COALESCE(p_guests, _type.seats);
      IF _guests < 1 THEN RAISE EXCEPTION 'Quantidade de pessoas inválida'; END IF;
    END IF;

    -- Overlap-based availability (backend authoritative)
    _new_end := p_reservation_date + (_duration || ' minutes')::interval;
    SELECT count(*)::int INTO _reserved
      FROM public.partner_reservations r
     WHERE r.reservation_type_id = _type.id
       AND r.status IN ('pending','pending_payment','confirmed')
       AND r.reservation_date < _new_end
       AND COALESCE(
             r.released_at,
             r.reservation_date + (COALESCE(r.duration_minutes, _duration) || ' minutes')::interval
           ) > p_reservation_date;
    IF _reserved >= _type.quantity THEN
      RAISE EXCEPTION 'Horário esgotado para este tipo de reserva';
    END IF;
  ELSE
    -- No type: legacy free-form reservation, requires explicit guest count
    IF p_guests IS NULL OR p_guests < 1 THEN
      RAISE EXCEPTION 'Quantidade de pessoas inválida';
    END IF;
    _guests := p_guests;
    _duration := COALESCE(_settings.default_reservation_duration_minutes, 90);
  END IF;

  IF _guests > _settings.max_people_per_reservation THEN
    RAISE EXCEPTION 'Máximo de % pessoas por reserva', _settings.max_people_per_reservation;
  END IF;

  SELECT count(*) INTO _today_count FROM public.partner_reservations
    WHERE partner_id = _partner.id
      AND date_trunc('day', reservation_date AT TIME ZONE 'America/Sao_Paulo') = date_trunc('day', p_reservation_date AT TIME ZONE 'America/Sao_Paulo')
      AND status NOT IN ('cancelled','expired','no_show');
  IF _today_count >= _settings.max_reservations_per_day THEN
    RAISE EXCEPTION 'Limite diário de reservas atingido para esta data';
  END IF;

  -- Deposit calculation
  IF _settings.deposit_enabled THEN
    IF _settings.deposit_type = 'percent' THEN
      _deposit := ROUND(_price * COALESCE(_settings.deposit_value,0) / 100.0, 2);
    ELSIF _settings.deposit_type = 'full' THEN
      _deposit := _price;
    ELSE
      _deposit := COALESCE(_settings.deposit_value, 0);
    END IF;
    IF _deposit > _price THEN _deposit := _price; END IF;
  END IF;
  _remaining := GREATEST(_price - _deposit, 0);

  IF _settings.auto_confirm THEN
    _status := 'confirmed'; _expires := NULL;
  ELSE
    _status := 'pending_payment';
    _expires := now() + (COALESCE(_settings.confirmation_timeout_minutes,30) || ' minutes')::interval;
  END IF;

  _code := public._reservation_short_code();

  INSERT INTO public.partner_reservations(
    partner_id, name, phone, email, people_count, reservation_date, notes,
    status, reservation_type_id, total_price, expires_at, code,
    deposit_amount, remaining_amount, payment_status, duration_minutes
  ) VALUES (
    _partner.id, btrim(p_name), _phone_clean, NULLIF(lower(btrim(coalesce(p_email,''))),''),
    _guests, p_reservation_date, NULLIF(btrim(coalesce(p_notes,'')),''),
    _status, _type.id, _price, _expires, _code,
    _deposit, _remaining, CASE WHEN _status='confirmed' THEN 'paid' ELSE 'pending' END,
    _duration
  ) RETURNING * INTO _row;

  RETURN jsonb_build_object(
    'id', _row.id,
    'public_token', _row.public_token,
    'code', _row.code,
    'status', _row.status,
    'expires_at', _row.expires_at,
    'qr_payload', 'roxou://checkin?type=reservation&id=' || _row.id::text,
    'partner_name', _partner.name,
    'partner_slug', _partner.slug
  );
END $function$;

-- 7) create_partner_reservation: same overlap + duration snapshot ---------

CREATE OR REPLACE FUNCTION public.create_partner_reservation(_partner_id uuid, _payload jsonb)
 RETURNS public.partner_reservations
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _row public.partner_reservations;
  _name text;
  _date timestamptz;
  _people int;
  _status text;
  _event uuid;
  _type_id uuid;
  _type public.partner_reservation_types;
  _settings public.partner_reservation_settings;
  _duration int := 90;
  _reserved int;
  _new_end timestamptz;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  IF _partner_id IS NULL THEN RAISE EXCEPTION 'partner_id required'; END IF;
  IF NOT (public.is_admin() OR public.is_partner_owner_or_admin(_uid, _partner_id)) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501';
  END IF;
  IF _payload IS NULL OR jsonb_typeof(_payload) <> 'object' THEN
    RAISE EXCEPTION 'payload must be a JSON object';
  END IF;

  _name := NULLIF(btrim(_payload->>'name'), '');
  IF _name IS NULL THEN RAISE EXCEPTION 'name is required'; END IF;
  IF _payload->>'reservation_date' IS NULL THEN
    RAISE EXCEPTION 'reservation_date is required';
  END IF;
  _date := (_payload->>'reservation_date')::timestamptz;
  _status := COALESCE(NULLIF(_payload->>'status',''), 'pending');
  IF _status NOT IN ('pending','confirmed','cancelled','completed','no_show') THEN _status := 'pending'; END IF;
  IF _payload ? 'event_id' AND NULLIF(_payload->>'event_id','') IS NOT NULL THEN
    _event := (_payload->>'event_id')::uuid;
  END IF;
  IF _payload ? 'reservation_type_id' AND NULLIF(_payload->>'reservation_type_id','') IS NOT NULL THEN
    _type_id := (_payload->>'reservation_type_id')::uuid;
  END IF;

  SELECT * INTO _settings FROM public.partner_reservation_settings WHERE partner_id = _partner_id;

  IF _type_id IS NOT NULL THEN
    SELECT * INTO _type FROM public.partner_reservation_types
      WHERE id = _type_id AND partner_id = _partner_id FOR UPDATE;
    IF _type.id IS NULL THEN RAISE EXCEPTION 'Tipo de reserva inválido'; END IF;
    _duration := COALESCE(_type.duration_minutes, _settings.default_reservation_duration_minutes, 90);

    IF _type.requires_guest_count = false THEN
      _people := _type.seats;
    ELSE
      _people := COALESCE(NULLIF(_payload->>'people_count','')::int, _type.seats);
    END IF;

    _new_end := _date + (_duration || ' minutes')::interval;
    SELECT count(*)::int INTO _reserved
      FROM public.partner_reservations r
     WHERE r.reservation_type_id = _type.id
       AND r.status IN ('pending','pending_payment','confirmed')
       AND r.reservation_date < _new_end
       AND COALESCE(
             r.released_at,
             r.reservation_date + (COALESCE(r.duration_minutes, _duration) || ' minutes')::interval
           ) > _date;
    IF _reserved >= _type.quantity THEN
      RAISE EXCEPTION 'Horário esgotado para este tipo de reserva';
    END IF;
  ELSE
    _people := COALESCE(NULLIF(_payload->>'people_count','')::int, 1);
    _duration := COALESCE(_settings.default_reservation_duration_minutes, 90);
  END IF;

  INSERT INTO public.partner_reservations (
    partner_id, event_id, user_id, name, phone, email,
    people_count, reservation_date, notes, status,
    reservation_type_id, duration_minutes
  ) VALUES (
    _partner_id, _event, NULL, _name,
    NULLIF(btrim(_payload->>'phone'), ''),
    NULLIF(btrim(_payload->>'email'), ''),
    _people, _date, NULLIF(btrim(_payload->>'notes'), ''), _status,
    _type_id, _duration
  ) RETURNING * INTO _row;

  RETURN _row;
END $function$;
