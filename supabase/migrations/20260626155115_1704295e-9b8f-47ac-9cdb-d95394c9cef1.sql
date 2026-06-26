
CREATE OR REPLACE FUNCTION public.partner_pro_request_exists_for_phone(_phone_hash text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.partner_pro_requests
    WHERE phone_hash = _phone_hash
      AND stage NOT IN ('rejected')
  );
$$;

REVOKE ALL ON FUNCTION public.partner_pro_request_exists_for_phone(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.partner_pro_request_exists_for_phone(text) TO anon, authenticated, service_role;
