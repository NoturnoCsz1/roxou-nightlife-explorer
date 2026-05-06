
ALTER TABLE public.ride_requests
  ADD COLUMN IF NOT EXISTS pickup_is_approximate boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS destination_is_approximate boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.validate_ride_request_event_binding()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.event_id IS NULL THEN
    RAISE EXCEPTION 'Caronas Roxou só podem ser solicitadas a partir de um evento da plataforma.';
  END IF;
  -- Origin: allow null coords if textual address was provided (approximate)
  IF (NEW.origin_lat IS NULL OR NEW.origin_lng IS NULL)
     AND COALESCE(NULLIF(TRIM(NEW.pickup_address), ''), NULL) IS NULL THEN
    RAISE EXCEPTION 'Informe um endereço de embarque ou ponto no mapa.';
  END IF;
  IF NEW.origin_lat IS NULL OR NEW.origin_lng IS NULL THEN
    NEW.pickup_is_approximate := true;
  END IF;
  -- Destination: allow null coords if textual address was provided
  IF (NEW.destination_lat IS NULL OR NEW.destination_lng IS NULL)
     AND COALESCE(NULLIF(TRIM(NEW.destination_address), ''), NULL) IS NULL THEN
    RAISE EXCEPTION 'Informe um endereço de destino.';
  END IF;
  IF NEW.destination_lat IS NULL OR NEW.destination_lng IS NULL THEN
    NEW.destination_is_approximate := true;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = NEW.event_id
      AND e.status = 'published'
  ) THEN
    RAISE EXCEPTION 'Evento inválido ou não publicado.';
  END IF;
  RETURN NEW;
END;
$function$;
