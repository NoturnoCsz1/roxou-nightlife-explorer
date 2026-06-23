
-- =========================================================
-- ROXOU EXCURSÕES — Fase 7.2 (schema + RLS)
-- =========================================================

-- 1) Vehicles ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.excursion_vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  plate TEXT,
  capacity INTEGER NOT NULL DEFAULT 0 CHECK (capacity >= 0 AND capacity <= 200),
  seat_layout JSONB,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_excursion_vehicles_partner
  ON public.excursion_vehicles(partner_id) WHERE is_active = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.excursion_vehicles TO authenticated;
GRANT ALL ON public.excursion_vehicles TO service_role;

ALTER TABLE public.excursion_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partner staff manage own vehicles"
  ON public.excursion_vehicles FOR ALL
  USING (public.is_partner_member(auth.uid(), partner_id) OR public.is_admin())
  WITH CHECK (public.is_partner_member(auth.uid(), partner_id) OR public.is_admin());

-- 2) Trips ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.excursion_trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.excursion_vehicles(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  destination TEXT,
  departure_address TEXT,
  departure_at TIMESTAMPTZ NOT NULL,
  return_at TIMESTAMPTZ,
  session_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  capacity INTEGER NOT NULL DEFAULT 0 CHECK (capacity >= 0 AND capacity <= 200),
  price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','open','closed','cancelled','finished')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_excursion_trips_partner_session
  ON public.excursion_trips(partner_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_excursion_trips_vehicle
  ON public.excursion_trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_excursion_trips_status
  ON public.excursion_trips(partner_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.excursion_trips TO authenticated;
GRANT ALL ON public.excursion_trips TO service_role;

ALTER TABLE public.excursion_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partner staff manage own trips"
  ON public.excursion_trips FOR ALL
  USING (public.is_partner_member(auth.uid(), partner_id) OR public.is_admin())
  WITH CHECK (public.is_partner_member(auth.uid(), partner_id) OR public.is_admin());

-- 3) Seats ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.excursion_seats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.excursion_trips(id) ON DELETE CASCADE,
  seat_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'free'
    CHECK (status IN ('free','reserved','paid','boarded','cancelled')),
  passenger_name TEXT,
  passenger_phone TEXT,
  passenger_doc TEXT,
  notes TEXT,
  hold_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trip_id, seat_number)
);

CREATE INDEX IF NOT EXISTS idx_excursion_seats_trip
  ON public.excursion_seats(trip_id);
CREATE INDEX IF NOT EXISTS idx_excursion_seats_status
  ON public.excursion_seats(trip_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.excursion_seats TO authenticated;
GRANT ALL ON public.excursion_seats TO service_role;

ALTER TABLE public.excursion_seats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partner staff manage own seats"
  ON public.excursion_seats FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.excursion_trips t
      WHERE t.id = excursion_seats.trip_id
        AND (public.is_partner_member(auth.uid(), t.partner_id) OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.excursion_trips t
      WHERE t.id = excursion_seats.trip_id
        AND (public.is_partner_member(auth.uid(), t.partner_id) OR public.is_admin())
    )
  );

-- 4) updated_at triggers ---------------------------------
DROP TRIGGER IF EXISTS trg_excursion_vehicles_updated ON public.excursion_vehicles;
CREATE TRIGGER trg_excursion_vehicles_updated
  BEFORE UPDATE ON public.excursion_vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_excursion_trips_updated ON public.excursion_trips;
CREATE TRIGGER trg_excursion_trips_updated
  BEFORE UPDATE ON public.excursion_trips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_excursion_seats_updated ON public.excursion_seats;
CREATE TRIGGER trg_excursion_seats_updated
  BEFORE UPDATE ON public.excursion_seats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Auto-generate seats when trip created ---------------
CREATE OR REPLACE FUNCTION public.excursion_generate_seats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.capacity > 0 THEN
    INSERT INTO public.excursion_seats (trip_id, seat_number, status)
    SELECT NEW.id, gs::text, 'free'
    FROM generate_series(1, NEW.capacity) AS gs
    ON CONFLICT (trip_id, seat_number) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_excursion_trips_seed_seats ON public.excursion_trips;
CREATE TRIGGER trg_excursion_trips_seed_seats
  AFTER INSERT ON public.excursion_trips
  FOR EACH ROW EXECUTE FUNCTION public.excursion_generate_seats();
