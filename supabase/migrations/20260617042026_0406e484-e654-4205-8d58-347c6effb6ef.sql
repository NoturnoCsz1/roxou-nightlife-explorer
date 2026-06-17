
-- =========================================================
-- Capacity helper: counts ativos = pending_payment + confirmed
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_reservation_types_availability(p_partner_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'type_id', t.id,
    'quantity', t.quantity,
    'reserved', COALESCE(c.reserved, 0),
    'available', GREATEST(t.quantity - COALESCE(c.reserved, 0), 0)
  )), '[]'::jsonb)
  FROM public.partner_reservation_types t
  LEFT JOIN (
    SELECT reservation_type_id, count(*)::int AS reserved
    FROM public.partner_reservations
    WHERE partner_id = p_partner_id
      AND reservation_type_id IS NOT NULL
      AND status IN ('pending_payment','confirmed')
    GROUP BY reservation_type_id
  ) c ON c.reservation_type_id = t.id
  WHERE t.partner_id = p_partner_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_reservation_types_availability(uuid) TO anon, authenticated, service_role;

-- =========================================================
-- Reescreve submit_public_reservation com check de capacidade
-- =========================================================
CREATE OR REPLACE FUNCTION public.submit_public_reservation(
  p_partner_slug text,
  p_type_id uuid,
  p_name text,
  p_phone text,
  p_email text,
  p_guests integer,
  p_reservation_date timestamptz,
  p_notes text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  _price numeric;
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
  IF p_guests IS NULL OR p_guests < 1 THEN
    RAISE EXCEPTION 'Quantidade de pessoas inválida';
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
  IF p_guests > _settings.max_people_per_reservation THEN
    RAISE EXCEPTION 'Máximo de % pessoas por reserva', _settings.max_people_per_reservation;
  END IF;

  SELECT count(*) INTO _today_count FROM public.partner_reservations
    WHERE partner_id = _partner.id
      AND date_trunc('day', reservation_date AT TIME ZONE 'America/Sao_Paulo') = date_trunc('day', p_reservation_date AT TIME ZONE 'America/Sao_Paulo')
      AND status NOT IN ('cancelled','expired','no_show');
  IF _today_count >= _settings.max_reservations_per_day THEN
    RAISE EXCEPTION 'Limite diário de reservas atingido para esta data';
  END IF;

  -- Tipo + verificação de capacidade (lock para evitar race)
  IF p_type_id IS NOT NULL THEN
    SELECT * INTO _type FROM public.partner_reservation_types
      WHERE id = p_type_id AND partner_id = _partner.id AND active = true
      FOR UPDATE;
    IF _type.id IS NULL THEN RAISE EXCEPTION 'Tipo de reserva indisponível'; END IF;

    SELECT count(*)::int INTO _reserved
      FROM public.partner_reservations
     WHERE reservation_type_id = _type.id
       AND status IN ('pending_payment','confirmed');

    IF _reserved >= _type.quantity THEN
      RAISE EXCEPTION 'Esgotado: não há mais % disponível', _type.name;
    END IF;

    _price := _type.price;
  END IF;

  IF _settings.auto_confirm THEN
    _status := 'confirmed';
    _expires := NULL;
  ELSE
    _status := 'pending_payment';
    _expires := now() + (COALESCE(_settings.confirmation_timeout_minutes,30) || ' minutes')::interval;
  END IF;

  _code := public._reservation_short_code();

  INSERT INTO public.partner_reservations(
    partner_id, name, phone, email, people_count, reservation_date, notes,
    status, reservation_type_id, total_price, expires_at, code
  ) VALUES (
    _partner.id, btrim(p_name), _phone_clean, NULLIF(lower(btrim(coalesce(p_email,''))),''),
    p_guests, p_reservation_date, NULLIF(btrim(coalesce(p_notes,'')),''),
    _status, _type.id, _price, _expires, _code
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
END $$;
