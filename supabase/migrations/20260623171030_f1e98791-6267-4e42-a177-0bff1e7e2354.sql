-- =========================================================
-- ROXOU EXCURSÕES — Fase 7.3 (público + QR + embarque)
-- =========================================================

-- 1) Novos campos em excursion_trips ---------------------
ALTER TABLE public.excursion_trips
  ADD COLUMN IF NOT EXISTS public_slug TEXT,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;

-- Slug = 10 primeiros chars do id (sem hifens) por padrão; UNIQUE
UPDATE public.excursion_trips
  SET public_slug = lower(replace(id::text, '-', ''))
  WHERE public_slug IS NULL;

ALTER TABLE public.excursion_trips
  ALTER COLUMN public_slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_excursion_trips_public_slug
  ON public.excursion_trips(public_slug);

CREATE OR REPLACE FUNCTION public.excursion_trips_set_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.public_slug IS NULL OR length(NEW.public_slug) = 0 THEN
    NEW.public_slug := lower(replace(NEW.id::text, '-', ''));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_excursion_trips_set_slug ON public.excursion_trips;
CREATE TRIGGER trg_excursion_trips_set_slug
  BEFORE INSERT ON public.excursion_trips
  FOR EACH ROW EXECUTE FUNCTION public.excursion_trips_set_slug();

-- 2) Novos campos em excursion_seats ---------------------
ALTER TABLE public.excursion_seats
  ADD COLUMN IF NOT EXISTS qr_token UUID,
  ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS boarded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS boarded_by UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_excursion_seats_qr_token
  ON public.excursion_seats(qr_token) WHERE qr_token IS NOT NULL;

-- 3) Tabela de auditoria de embarque ---------------------
CREATE TABLE IF NOT EXISTS public.excursion_board_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.excursion_trips(id) ON DELETE CASCADE,
  seat_id UUID REFERENCES public.excursion_seats(id) ON DELETE SET NULL,
  qr_token UUID,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL,
  message TEXT,
  validated_by UUID,
  passenger_name TEXT,
  seat_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_excursion_board_logs_partner_date
  ON public.excursion_board_logs(partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_excursion_board_logs_trip
  ON public.excursion_board_logs(trip_id, created_at DESC);

GRANT SELECT, INSERT ON public.excursion_board_logs TO authenticated;
GRANT ALL ON public.excursion_board_logs TO service_role;

ALTER TABLE public.excursion_board_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partner staff read own board logs"
  ON public.excursion_board_logs FOR SELECT
  USING (public.is_partner_member(auth.uid(), partner_id) OR public.is_admin());

-- inserção é feita exclusivamente pela função SECURITY DEFINER abaixo;
-- não criamos policy INSERT pública.

-- 4) RPC pública: ver viagem + mapa de assentos ----------
CREATE OR REPLACE FUNCTION public.public_get_excursion_trip(_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip RECORD;
  v_partner RECORD;
  v_seats JSONB;
BEGIN
  SELECT t.* INTO v_trip
  FROM public.excursion_trips t
  WHERE t.public_slug = _slug
    AND t.is_public = true
    AND t.status IN ('open','closed','finished');

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT id, name, slug, city, instagram, whatsapp
    INTO v_partner
  FROM public.partners
  WHERE id = v_trip.partner_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'seat_number', s.seat_number,
    'status', s.status
  ) ORDER BY (
    CASE WHEN s.seat_number ~ '^\d+$' THEN s.seat_number::int ELSE 9999 END
  ), s.seat_number), '[]'::jsonb)
  INTO v_seats
  FROM public.excursion_seats s
  WHERE s.trip_id = v_trip.id;

  RETURN jsonb_build_object(
    'trip', jsonb_build_object(
      'id', v_trip.id,
      'public_slug', v_trip.public_slug,
      'title', v_trip.title,
      'destination', v_trip.destination,
      'departure_address', v_trip.departure_address,
      'departure_at', v_trip.departure_at,
      'return_at', v_trip.return_at,
      'session_date', v_trip.session_date,
      'capacity', v_trip.capacity,
      'price_cents', v_trip.price_cents,
      'status', v_trip.status,
      'notes', v_trip.notes,
      'event_id', v_trip.event_id
    ),
    'partner', to_jsonb(v_partner),
    'seats', v_seats
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_get_excursion_trip(TEXT)
  TO anon, authenticated;

-- 5) RPC pública: reservar assento -----------------------
CREATE OR REPLACE FUNCTION public.public_reserve_excursion_seat(
  _trip_id UUID,
  _seat_id UUID,
  _name TEXT,
  _phone TEXT,
  _doc TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip RECORD;
  v_seat RECORD;
  v_token UUID;
BEGIN
  IF _name IS NULL OR length(trim(_name)) < 2 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_name');
  END IF;
  IF _phone IS NULL OR length(regexp_replace(_phone, '\D', '', 'g')) < 10 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_phone');
  END IF;

  SELECT * INTO v_trip
  FROM public.excursion_trips
  WHERE id = _trip_id AND is_public = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'trip_not_found');
  END IF;
  IF v_trip.status <> 'open' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'trip_not_open');
  END IF;

  -- bloqueia o assento para evitar corrida
  SELECT * INTO v_seat
  FROM public.excursion_seats
  WHERE id = _seat_id AND trip_id = _trip_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'seat_not_found');
  END IF;
  IF v_seat.status <> 'free' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'seat_taken');
  END IF;

  v_token := gen_random_uuid();

  UPDATE public.excursion_seats
  SET
    status = 'reserved',
    passenger_name = trim(_name),
    passenger_phone = trim(_phone),
    passenger_doc = NULLIF(trim(coalesce(_doc, '')), ''),
    qr_token = v_token,
    reserved_at = now()
  WHERE id = _seat_id;

  RETURN jsonb_build_object(
    'ok', true,
    'qr_token', v_token,
    'seat_id', _seat_id,
    'trip_id', _trip_id,
    'public_slug', v_trip.public_slug
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_reserve_excursion_seat(UUID, UUID, TEXT, TEXT, TEXT)
  TO anon, authenticated;

-- 6) RPC pública: comprovante por token ------------------
CREATE OR REPLACE FUNCTION public.public_get_excursion_ticket(_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seat RECORD;
  v_trip RECORD;
  v_partner RECORD;
BEGIN
  SELECT * INTO v_seat
  FROM public.excursion_seats
  WHERE qr_token = _token;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_trip
  FROM public.excursion_trips
  WHERE id = v_seat.trip_id;

  SELECT id, name, slug, city, instagram, whatsapp
    INTO v_partner
  FROM public.partners
  WHERE id = v_trip.partner_id;

  RETURN jsonb_build_object(
    'seat', jsonb_build_object(
      'id', v_seat.id,
      'seat_number', v_seat.seat_number,
      'status', v_seat.status,
      'passenger_name', v_seat.passenger_name,
      'passenger_phone', v_seat.passenger_phone,
      'qr_token', v_seat.qr_token,
      'reserved_at', v_seat.reserved_at,
      'boarded_at', v_seat.boarded_at
    ),
    'trip', jsonb_build_object(
      'id', v_trip.id,
      'public_slug', v_trip.public_slug,
      'title', v_trip.title,
      'destination', v_trip.destination,
      'departure_address', v_trip.departure_address,
      'departure_at', v_trip.departure_at,
      'return_at', v_trip.return_at,
      'session_date', v_trip.session_date,
      'price_cents', v_trip.price_cents,
      'status', v_trip.status
    ),
    'partner', to_jsonb(v_partner)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_get_excursion_ticket(UUID)
  TO anon, authenticated;

-- 7) RPC parceiro: embarcar passageiro -------------------
CREATE OR REPLACE FUNCTION public.board_excursion_seat(_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_seat RECORD;
  v_trip RECORD;
  v_outcome TEXT;
  v_message TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('outcome', 'error', 'message', 'Não autenticado.');
  END IF;

  SELECT * INTO v_seat
  FROM public.excursion_seats
  WHERE qr_token = _token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'not_found', 'message', 'QR não encontrado.');
  END IF;

  SELECT * INTO v_trip FROM public.excursion_trips WHERE id = v_seat.trip_id;

  IF NOT (public.is_partner_member(v_uid, v_trip.partner_id) OR public.is_admin()) THEN
    RETURN jsonb_build_object('outcome', 'error', 'message', 'Sem acesso à viagem.');
  END IF;

  IF v_seat.status = 'boarded' THEN
    v_outcome := 'already_used';
    v_message := 'Passageiro já embarcado.';
  ELSIF v_seat.status = 'cancelled' THEN
    v_outcome := 'expired';
    v_message := 'Reserva cancelada.';
  ELSIF v_seat.status NOT IN ('reserved','paid') THEN
    v_outcome := 'error';
    v_message := 'Assento sem reserva ativa.';
  ELSIF v_trip.status = 'cancelled' THEN
    v_outcome := 'expired';
    v_message := 'Viagem cancelada.';
  ELSE
    UPDATE public.excursion_seats
    SET status = 'boarded',
        boarded_at = now(),
        boarded_by = v_uid
    WHERE id = v_seat.id;
    v_outcome := 'valid';
    v_message := 'Embarque confirmado!';
    v_seat.status := 'boarded';
  END IF;

  INSERT INTO public.excursion_board_logs (
    trip_id, seat_id, qr_token, partner_id, outcome, message,
    validated_by, passenger_name, seat_number
  ) VALUES (
    v_trip.id, v_seat.id, _token, v_trip.partner_id, v_outcome, v_message,
    v_uid, v_seat.passenger_name, v_seat.seat_number
  );

  RETURN jsonb_build_object(
    'outcome', v_outcome,
    'message', v_message,
    'seat', jsonb_build_object(
      'id', v_seat.id,
      'seat_number', v_seat.seat_number,
      'status', v_seat.status,
      'passenger_name', v_seat.passenger_name
    ),
    'trip', jsonb_build_object(
      'id', v_trip.id,
      'title', v_trip.title,
      'destination', v_trip.destination,
      'departure_at', v_trip.departure_at
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.board_excursion_seat(UUID) TO authenticated;