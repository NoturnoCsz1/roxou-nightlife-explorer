
CREATE OR REPLACE FUNCTION public.close_due_partner_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _affected integer;
BEGIN
  WITH upd AS (
    UPDATE public.partner_reservations
       SET status = 'cancelled',
           close_reason = COALESCE(close_reason, 'time_expired'),
           updated_at = now()
     WHERE auto_close_enabled = true
       AND closes_at IS NOT NULL
       AND now() > closes_at
       AND status IN ('pending')
    RETURNING 1
  )
  SELECT count(*)::int INTO _affected FROM upd;
  RETURN COALESCE(_affected, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.close_due_partner_reservations() FROM public;
GRANT EXECUTE ON FUNCTION public.close_due_partner_reservations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_due_partner_reservations() TO service_role;
