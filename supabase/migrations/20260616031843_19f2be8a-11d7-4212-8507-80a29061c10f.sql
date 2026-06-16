
-- Fase 10A — Partner access requests

CREATE TABLE IF NOT EXISTS public.partner_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  requested_name text,
  requested_email text,
  requested_phone text,
  message text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.partner_access_requests TO authenticated;
GRANT ALL ON public.partner_access_requests TO service_role;

-- One pending request per (user, partner)
CREATE UNIQUE INDEX IF NOT EXISTS partner_access_requests_pending_unique
  ON public.partner_access_requests (user_id, partner_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS partner_access_requests_status_idx
  ON public.partner_access_requests (status, created_at DESC);

ALTER TABLE public.partner_access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can create own access requests"
  ON public.partner_access_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can view own access requests"
  ON public.partner_access_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "users can cancel own pending requests"
  ON public.partner_access_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status IN ('pending','cancelled'));

CREATE POLICY "admins can update any request"
  ON public.partner_access_requests
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TRIGGER partner_access_requests_set_updated_at
  BEFORE UPDATE ON public.partner_access_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RPCs ============

CREATE OR REPLACE FUNCTION public.request_partner_access(
  _partner_id uuid,
  _payload jsonb
) RETURNS public.partner_access_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.partner_access_requests;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF _partner_id IS NULL THEN
    RAISE EXCEPTION 'partner_id is required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.partners WHERE id = _partner_id) THEN
    RAISE EXCEPTION 'Estabelecimento não encontrado';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.partner_users
    WHERE user_id = _uid AND partner_id = _partner_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Você já tem acesso ativo a este estabelecimento';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.partner_access_requests
    WHERE user_id = _uid AND partner_id = _partner_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Já existe uma solicitação pendente para este estabelecimento';
  END IF;

  INSERT INTO public.partner_access_requests (
    user_id, partner_id, requested_name, requested_email, requested_phone, message
  ) VALUES (
    _uid,
    _partner_id,
    NULLIF(btrim(_payload->>'requested_name'), ''),
    NULLIF(btrim(_payload->>'requested_email'), ''),
    NULLIF(regexp_replace(COALESCE(_payload->>'requested_phone',''), '[^0-9+]', '', 'g'), ''),
    NULLIF(btrim(_payload->>'message'), '')
  )
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_partner_access_request(_request_id uuid)
RETURNS public.partner_access_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _req public.partner_access_requests;
BEGIN
  IF _uid IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _req FROM public.partner_access_requests WHERE id = _request_id;
  IF _req.id IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF _req.status <> 'pending' THEN
    RAISE EXCEPTION 'Request is not pending (status=%)', _req.status;
  END IF;

  -- Vincula parceiro (owner ativo)
  INSERT INTO public.partner_users (user_id, partner_id, role, is_active)
  VALUES (_req.user_id, _req.partner_id, 'owner', true)
  ON CONFLICT (user_id, partner_id) DO UPDATE
    SET is_active = true, role = 'owner';

  -- Libera beta
  INSERT INTO public.partner_beta_access (user_id, partner_id, invited_by, access_enabled, beta_role, notes)
  VALUES (_req.user_id, _req.partner_id, _uid, true, 'partner', 'Aprovado via solicitação')
  ON CONFLICT (user_id, partner_id) DO UPDATE
    SET access_enabled = true, invited_by = EXCLUDED.invited_by;

  UPDATE public.partner_access_requests
  SET status = 'approved', reviewed_by = _uid, reviewed_at = now()
  WHERE id = _request_id
  RETURNING * INTO _req;

  RETURN _req;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_partner_access_request(_request_id uuid)
RETURNS public.partner_access_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _req public.partner_access_requests;
BEGIN
  IF _uid IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO _req FROM public.partner_access_requests WHERE id = _request_id;
  IF _req.id IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF _req.status <> 'pending' THEN
    RAISE EXCEPTION 'Request is not pending (status=%)', _req.status;
  END IF;

  UPDATE public.partner_access_requests
  SET status = 'rejected', reviewed_by = _uid, reviewed_at = now()
  WHERE id = _request_id
  RETURNING * INTO _req;

  RETURN _req;
END;
$$;
