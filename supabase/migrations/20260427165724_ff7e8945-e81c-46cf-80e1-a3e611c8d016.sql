-- Add ride request capacity and contact-control fields
ALTER TABLE public.ride_requests
  ADD COLUMN IF NOT EXISTS seats_available integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS price_note text,
  ADD COLUMN IF NOT EXISTS accepted_offer_id uuid,
  ADD COLUMN IF NOT EXISTS whatsapp_released boolean NOT NULL DEFAULT false;

-- Add passenger/contact fields to offers, keeping passenger_id nullable for legacy rows
ALTER TABLE public.ride_offers
  ADD COLUMN IF NOT EXISTS passenger_id uuid,
  ADD COLUMN IF NOT EXISTS passenger_whatsapp text;

-- Backfill passenger_id on existing passenger-owned requests when possible
UPDATE public.ride_offers ro
SET passenger_id = rr.passenger_id
FROM public.ride_requests rr
WHERE ro.ride_request_id = rr.id
  AND ro.passenger_id IS NULL
  AND rr.passenger_id IS NOT NULL;

-- Validation trigger for ride request capacity
CREATE OR REPLACE FUNCTION public.validate_ride_request_capacity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.passengers_count < 1 OR NEW.passengers_count > 4 THEN
    RAISE EXCEPTION 'A quantidade de passageiros deve ser entre 1 e 4.';
  END IF;

  IF NEW.seats_available < 1 OR NEW.seats_available > 4 THEN
    RAISE EXCEPTION 'O limite de vagas disponíveis é 4.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_ride_request_capacity_trigger ON public.ride_requests;
CREATE TRIGGER validate_ride_request_capacity_trigger
BEFORE INSERT OR UPDATE ON public.ride_requests
FOR EACH ROW
EXECUTE FUNCTION public.validate_ride_request_capacity();

-- Replace broad ride offer policies with stricter passenger/driver rules
DROP POLICY IF EXISTS "Drivers can create offers" ON public.ride_offers;
DROP POLICY IF EXISTS "Drivers can update own offers" ON public.ride_offers;
DROP POLICY IF EXISTS "Participants can view offers" ON public.ride_offers;
DROP POLICY IF EXISTS "Passengers can request driver rides" ON public.ride_offers;
DROP POLICY IF EXISTS "Drivers can create own offers" ON public.ride_offers;
DROP POLICY IF EXISTS "Drivers can update offers on their rides" ON public.ride_offers;
DROP POLICY IF EXISTS "Passengers can update own pending offers" ON public.ride_offers;
DROP POLICY IF EXISTS "Participants can view own ride offers" ON public.ride_offers;

CREATE POLICY "Passengers can request driver rides"
ON public.ride_offers
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = passenger_id
  AND driver_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.ride_requests rr
    WHERE rr.id = ride_offers.ride_request_id
      AND rr.status = 'open'
  )
);

CREATE POLICY "Drivers can create own offers"
ON public.ride_offers
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = driver_id
  AND public.has_role(auth.uid(), 'driver'::app_role)
);

CREATE POLICY "Drivers can update offers on their rides"
ON public.ride_offers
FOR UPDATE
TO authenticated
USING (
  driver_id = auth.uid()
  AND public.has_role(auth.uid(), 'driver'::app_role)
)
WITH CHECK (
  driver_id = auth.uid()
  AND public.has_role(auth.uid(), 'driver'::app_role)
);

CREATE POLICY "Passengers can update own pending offers"
ON public.ride_offers
FOR UPDATE
TO authenticated
USING (passenger_id = auth.uid())
WITH CHECK (passenger_id = auth.uid());

CREATE POLICY "Participants can view own ride offers"
ON public.ride_offers
FOR SELECT
TO authenticated
USING (
  driver_id = auth.uid()
  OR passenger_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.ride_requests rr
    WHERE rr.id = ride_offers.ride_request_id
      AND rr.passenger_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE INDEX IF NOT EXISTS idx_ride_offers_passenger_id ON public.ride_offers(passenger_id);
CREATE INDEX IF NOT EXISTS idx_ride_offers_driver_status ON public.ride_offers(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_ride_requests_open_driverboard ON public.ride_requests(status, created_at DESC);