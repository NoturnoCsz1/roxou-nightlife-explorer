-- Fase 9F: SECURITY DEFINER function to allow partner owners/admins to update
-- a strict whitelist of safe profile fields on public.partners.
-- No new RLS policy: function bypasses RLS by definer rights and enforces
-- authorization via public.is_partner_owner_or_admin(auth.uid(), _partner_id).

CREATE OR REPLACE FUNCTION public.update_partner_safe_profile(
  _partner_id uuid,
  _payload jsonb
)
RETURNS public.partners
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.partners;
  _allowed text[] := ARRAY[
    'short_description',
    'full_description',
    'instagram',
    'whatsapp',
    'logo_url'
  ];
  _key text;
  _val text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF _partner_id IS NULL THEN
    RAISE EXCEPTION 'partner_id is required';
  END IF;

  IF NOT (
    public.is_admin()
    OR public.is_partner_owner_or_admin(_uid, _partner_id)
  ) THEN
    RAISE EXCEPTION 'Forbidden: requires partner owner/admin or Roxou admin'
      USING ERRCODE = '42501';
  END IF;

  IF _payload IS NULL OR jsonb_typeof(_payload) <> 'object' THEN
    RAISE EXCEPTION 'payload must be a JSON object';
  END IF;

  -- Apply only whitelisted columns. Any other key in _payload is ignored.
  UPDATE public.partners p
  SET
    short_description = CASE WHEN _payload ? 'short_description'
      THEN NULLIF(btrim(_payload->>'short_description'), '') ELSE p.short_description END,
    full_description = CASE WHEN _payload ? 'full_description'
      THEN NULLIF(btrim(_payload->>'full_description'), '') ELSE p.full_description END,
    instagram = CASE WHEN _payload ? 'instagram'
      THEN NULLIF(btrim(_payload->>'instagram'), '') ELSE p.instagram END,
    whatsapp = CASE WHEN _payload ? 'whatsapp'
      THEN NULLIF(regexp_replace(_payload->>'whatsapp', '[^0-9+]', '', 'g'), '') ELSE p.whatsapp END,
    logo_url = CASE WHEN _payload ? 'logo_url'
      THEN NULLIF(btrim(_payload->>'logo_url'), '') ELSE p.logo_url END,
    updated_at = now()
  WHERE p.id = _partner_id
  RETURNING p.* INTO _row;

  IF _row.id IS NULL THEN
    RAISE EXCEPTION 'Partner not found';
  END IF;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.update_partner_safe_profile(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_partner_safe_profile(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_partner_safe_profile(uuid, jsonb) TO service_role;

COMMENT ON FUNCTION public.update_partner_safe_profile(uuid, jsonb) IS
'Fase 9F: allows partner owner/admin (or Roxou admin) to update a strict whitelist of safe profile fields on partners. Ignores any non-whitelisted keys in the payload.';
