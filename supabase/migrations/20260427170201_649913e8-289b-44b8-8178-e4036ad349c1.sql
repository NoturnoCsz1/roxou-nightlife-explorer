-- Validate ride request temporal windows
CREATE OR REPLACE FUNCTION public.validate_ride_request_time_window()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.event_date IS NOT NULL THEN
    IF now() > (NEW.event_date + interval '1 hour') THEN
      RAISE EXCEPTION 'A janela de solicitações para este evento expirou. Combine com antecedência para o próximo!';
    END IF;

    IF NEW.event_date::date <> (NEW.event_date AT TIME ZONE 'America/Sao_Paulo')::date THEN
      RAISE EXCEPTION 'A data da carona deve ser a mesma data do evento.';
    END IF;

    IF NEW.event_date > (NEW.event_date + interval '4 hours') THEN
      RAISE EXCEPTION 'O horário da carona não pode ser posterior ao término estimado do evento.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_ride_request_time_window_trigger ON public.ride_requests;
CREATE TRIGGER validate_ride_request_time_window_trigger
BEFORE INSERT OR UPDATE ON public.ride_requests
FOR EACH ROW
EXECUTE FUNCTION public.validate_ride_request_time_window();

-- Function used by the scheduled job to keep old ride requests out of searches
CREATE OR REPLACE FUNCTION public.expire_stale_ride_requests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.ride_requests
  SET status = 'completed', updated_at = now()
  WHERE status = 'open'
    AND event_date IS NOT NULL
    AND event_date < (now() - interval '4 hours');

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;