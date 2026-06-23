
-- =========================================================
-- ROXOU EXCURSÕES — Fase 7.4 (GPS ao vivo + Operação)
-- =========================================================

-- 1) Novos campos em excursion_trips ---------------------
ALTER TABLE public.excursion_trips
  ADD COLUMN IF NOT EXISTS driver_id UUID,
  ADD COLUMN IF NOT EXISTS operation_status TEXT NOT NULL DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS gps_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gps_ended_at TIMESTAMPTZ;

-- Constraint via DO block (CHECK não pode ser IF NOT EXISTS direto)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'excursion_trips_operation_status_check'
  ) THEN
    ALTER TABLE public.excursion_trips
      ADD CONSTRAINT excursion_trips_operation_status_check
      CHECK (operation_status IN (
        'scheduled','boarding','en_route','arrived','returning','completed','cancelled'
      ));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_excursion_trips_driver
  ON public.excursion_trips(driver_id) WHERE driver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_excursion_trips_op_status
  ON public.excursion_trips(operation_status, session_date DESC);

-- 2) GPS pings -------------------------------------------
CREATE TABLE IF NOT EXISTS public.excursion_gps_pings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.excursion_trips(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  driver_id UUID,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  accuracy DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_excursion_gps_trip_recorded
  ON public.excursion_gps_pings(trip_id, recorded_at DESC);

GRANT SELECT, INSERT ON public.excursion_gps_pings TO authenticated;
GRANT ALL ON public.excursion_gps_pings TO service_role;

ALTER TABLE public.excursion_gps_pings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partner staff read own gps pings"
  ON public.excursion_gps_pings FOR SELECT
  USING (public.is_partner_member(auth.uid(), partner_id) OR public.is_admin());

CREATE POLICY "Partner staff insert own gps pings"
  ON public.excursion_gps_pings FOR INSERT
  WITH CHECK (public.is_partner_member(auth.uid(), partner_id) OR public.is_admin());

-- 3) Realtime --------------------------------------------
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.excursion_gps_pings;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.excursion_trips;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

ALTER TABLE public.excursion_gps_pings REPLICA IDENTITY FULL;
ALTER TABLE public.excursion_trips REPLICA IDENTITY FULL;

-- 4) RPC: motorista/equipe envia ping --------------------
CREATE OR REPLACE FUNCTION public.excursion_push_gps(
  _trip_id UUID,
  _lat DOUBLE PRECISION,
  _lng DOUBLE PRECISION,
  _speed DOUBLE PRECISION DEFAULT NULL,
  _heading DOUBLE PRECISION DEFAULT NULL,
  _accuracy DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip RECORD;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  END IF;

  SELECT id, partner_id, driver_id INTO v_trip
  FROM public.excursion_trips WHERE id = _trip_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'trip_not_found');
  END IF;

  IF NOT (public.is_partner_member(v_uid, v_trip.partner_id) OR public.is_admin()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;

  IF _lat IS NULL OR _lng IS NULL
     OR _lat < -90 OR _lat > 90 OR _lng < -180 OR _lng > 180 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_coords');
  END IF;

  INSERT INTO public.excursion_gps_pings(
    trip_id, partner_id, driver_id, lat, lng, speed, heading, accuracy
  ) VALUES (
    _trip_id, v_trip.partner_id, v_uid, _lat, _lng, _speed, _heading, _accuracy
  );

  -- marca gps_started_at no primeiro ping
  UPDATE public.excursion_trips
    SET gps_started_at = COALESCE(gps_started_at, now())
    WHERE id = _trip_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.excursion_push_gps(UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION)
  TO authenticated;

-- 5) RPC: muda operation_status --------------------------
CREATE OR REPLACE FUNCTION public.excursion_set_operation_status(
  _trip_id UUID,
  _status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip RECORD;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  END IF;
  IF _status NOT IN ('scheduled','boarding','en_route','arrived','returning','completed','cancelled') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_status');
  END IF;

  SELECT id, partner_id INTO v_trip FROM public.excursion_trips WHERE id = _trip_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'trip_not_found');
  END IF;

  IF NOT (public.is_partner_member(v_uid, v_trip.partner_id) OR public.is_admin()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;

  UPDATE public.excursion_trips
    SET operation_status = _status,
        gps_ended_at = CASE WHEN _status IN ('completed','cancelled')
                            THEN COALESCE(gps_ended_at, now())
                            ELSE gps_ended_at END
    WHERE id = _trip_id;

  RETURN jsonb_build_object('ok', true, 'operation_status', _status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.excursion_set_operation_status(UUID, TEXT) TO authenticated;

-- 6) RPC pública: passageiro consulta posição ao vivo ----
CREATE OR REPLACE FUNCTION public.public_get_excursion_live(_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seat RECORD;
  v_trip RECORD;
  v_ping RECORD;
BEGIN
  SELECT s.* INTO v_seat
  FROM public.excursion_seats s
  WHERE s.qr_token = _token;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT id, operation_status, gps_started_at, gps_ended_at, departure_at, return_at
    INTO v_trip
  FROM public.excursion_trips WHERE id = v_seat.trip_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT lat, lng, speed, heading, recorded_at INTO v_ping
  FROM public.excursion_gps_pings
  WHERE trip_id = v_trip.id
  ORDER BY recorded_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'operation_status', v_trip.operation_status,
    'gps_started_at', v_trip.gps_started_at,
    'gps_ended_at', v_trip.gps_ended_at,
    'departure_at', v_trip.departure_at,
    'return_at', v_trip.return_at,
    'ping', CASE WHEN v_ping.lat IS NULL THEN NULL ELSE jsonb_build_object(
      'lat', v_ping.lat,
      'lng', v_ping.lng,
      'speed', v_ping.speed,
      'heading', v_ping.heading,
      'recorded_at', v_ping.recorded_at
    ) END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_get_excursion_live(UUID) TO anon, authenticated;
