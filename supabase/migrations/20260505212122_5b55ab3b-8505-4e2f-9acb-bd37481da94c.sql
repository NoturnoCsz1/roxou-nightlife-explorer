
-- 1) Add lat/lng/place_id to events (nullable; backfilled later by admin/geocode)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS maps_place_id text;

-- 2) Strengthen ride_requests: dedicated coord columns + provenance
ALTER TABLE public.ride_requests
  ADD COLUMN IF NOT EXISTS origin_lat double precision,
  ADD COLUMN IF NOT EXISTS origin_lng double precision,
  ADD COLUMN IF NOT EXISTS origin_accuracy double precision,
  ADD COLUMN IF NOT EXISTS origin_source text,
  ADD COLUMN IF NOT EXISTS destination_lat double precision,
  ADD COLUMN IF NOT EXISTS destination_lng double precision;

-- Allow origin_source values
ALTER TABLE public.ride_requests
  DROP CONSTRAINT IF EXISTS ride_requests_origin_source_check;
ALTER TABLE public.ride_requests
  ADD CONSTRAINT ride_requests_origin_source_check
  CHECK (origin_source IS NULL OR origin_source IN ('gps','manual_pin_adjustment','fallback_address'));

-- 3) Trigger: passenger cannot change event_id, destination_*, origin_* on UPDATE
CREATE OR REPLACE FUNCTION public.lock_ride_request_immutable_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins bypass
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.event_id IS DISTINCT FROM OLD.event_id THEN
    RAISE EXCEPTION 'event_id is immutable after the ride is created.';
  END IF;
  IF NEW.destination_lat IS DISTINCT FROM OLD.destination_lat
     OR NEW.destination_lng IS DISTINCT FROM OLD.destination_lng
     OR NEW.destination_address IS DISTINCT FROM OLD.destination_address THEN
    RAISE EXCEPTION 'Destination is locked to the event and cannot be changed.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_ride_request_immutable_fields ON public.ride_requests;
CREATE TRIGGER trg_lock_ride_request_immutable_fields
  BEFORE UPDATE ON public.ride_requests
  FOR EACH ROW EXECUTE FUNCTION public.lock_ride_request_immutable_fields();

-- 4) Validation on INSERT: must have event_id, origin coords, destination coords
CREATE OR REPLACE FUNCTION public.validate_ride_request_event_binding()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.event_id IS NULL THEN
    RAISE EXCEPTION 'Caronas Roxou só podem ser solicitadas a partir de um evento da plataforma.';
  END IF;
  IF NEW.origin_lat IS NULL OR NEW.origin_lng IS NULL THEN
    RAISE EXCEPTION 'Coordenadas de origem (GPS) são obrigatórias.';
  END IF;
  IF NEW.destination_lat IS NULL OR NEW.destination_lng IS NULL THEN
    RAISE EXCEPTION 'O evento selecionado precisa ter localização cadastrada.';
  END IF;
  -- Ensure destination matches event coords (snap to event)
  IF NOT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = NEW.event_id
      AND e.status = 'published'
  ) THEN
    RAISE EXCEPTION 'Evento inválido ou não publicado.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_ride_request_event_binding ON public.ride_requests;
CREATE TRIGGER trg_validate_ride_request_event_binding
  BEFORE INSERT ON public.ride_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_ride_request_event_binding();
