
-- FASE 10B — Partner Pilot admin helpers

-- 1) Lookup user by email (admin only)
CREATE OR REPLACE FUNCTION public.admin_find_user_by_email(_email text)
RETURNS TABLE (
  user_id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin required' USING ERRCODE = '42501';
  END IF;
  IF _email IS NULL OR length(btrim(_email)) = 0 THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT u.id, u.email::text, u.created_at, u.last_sign_in_at
    FROM auth.users u
    WHERE lower(u.email) = lower(btrim(_email))
    LIMIT 1;
END;
$$;

-- 2) List partner team (admin only)
CREATE OR REPLACE FUNCTION public.admin_list_partner_team(_partner_id uuid)
RETURNS TABLE (
  partner_user_id uuid,
  user_id uuid,
  email text,
  role text,
  is_active boolean,
  beta_enabled boolean,
  last_sign_in_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT pu.id, pu.user_id, u.email::text, pu.role, pu.is_active,
           COALESCE(ba.access_enabled, false), u.last_sign_in_at, pu.created_at
    FROM public.partner_users pu
    LEFT JOIN auth.users u ON u.id = pu.user_id
    LEFT JOIN public.partner_beta_access ba
      ON ba.user_id = pu.user_id AND ba.partner_id = pu.partner_id
    WHERE pu.partner_id = _partner_id
    ORDER BY pu.created_at DESC;
END;
$$;

-- 3) Link user to partner (admin only): creates/reactivates partner_users + partner_beta_access
CREATE OR REPLACE FUNCTION public.admin_link_partner_pilot(
  _partner_id uuid,
  _user_id uuid,
  _role text DEFAULT 'owner',
  _notes text DEFAULT 'Piloto Partner Pro'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin required' USING ERRCODE = '42501';
  END IF;
  IF _partner_id IS NULL OR _user_id IS NULL THEN
    RAISE EXCEPTION 'partner_id e user_id são obrigatórios';
  END IF;
  IF _role NOT IN ('owner','admin','editor','attendant') THEN
    _role := 'owner';
  END IF;

  INSERT INTO public.partner_users (user_id, partner_id, role, is_active)
  VALUES (_user_id, _partner_id, _role, true)
  ON CONFLICT (user_id, partner_id) DO UPDATE
    SET is_active = true, role = EXCLUDED.role, updated_at = now();

  INSERT INTO public.partner_beta_access (user_id, partner_id, invited_by, access_enabled, beta_role, notes)
  VALUES (_user_id, _partner_id, _uid, true, 'partner', _notes)
  ON CONFLICT (user_id, partner_id) DO UPDATE
    SET access_enabled = true, invited_by = EXCLUDED.invited_by, notes = COALESCE(EXCLUDED.notes, public.partner_beta_access.notes), updated_at = now();

  RETURN jsonb_build_object('ok', true, 'partner_id', _partner_id, 'user_id', _user_id, 'role', _role);
END;
$$;

-- 4) Revoke pilot access
CREATE OR REPLACE FUNCTION public.admin_revoke_partner_pilot(
  _partner_id uuid,
  _user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.partner_users
    SET is_active = false, updated_at = now()
    WHERE partner_id = _partner_id AND user_id = _user_id;

  UPDATE public.partner_beta_access
    SET access_enabled = false, updated_at = now()
    WHERE partner_id = _partner_id AND user_id = _user_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 5) Upsert subscription (admin only)
CREATE OR REPLACE FUNCTION public.admin_upsert_partner_subscription(
  _partner_id uuid,
  _plan text,
  _status text,
  _expires_at timestamptz DEFAULT NULL
)
RETURNS public.partner_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.partner_subscriptions;
  _existing_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin required' USING ERRCODE = '42501';
  END IF;
  IF _plan NOT IN ('free','pro','premium','enterprise') THEN
    RAISE EXCEPTION 'plano inválido';
  END IF;
  IF _status NOT IN ('trial','active','past_due','canceled','expired') THEN
    RAISE EXCEPTION 'status inválido';
  END IF;

  SELECT id INTO _existing_id FROM public.partner_subscriptions
    WHERE partner_id = _partner_id
    ORDER BY created_at DESC LIMIT 1;

  IF _existing_id IS NULL THEN
    INSERT INTO public.partner_subscriptions (partner_id, plan, status, started_at, expires_at)
    VALUES (_partner_id, _plan, _status, now(), _expires_at)
    RETURNING * INTO _row;
  ELSE
    UPDATE public.partner_subscriptions
      SET plan = _plan, status = _status,
          started_at = COALESCE(started_at, now()),
          expires_at = COALESCE(_expires_at, expires_at),
          updated_at = now()
      WHERE id = _existing_id
      RETURNING * INTO _row;
  END IF;

  RETURN _row;
END;
$$;

-- 6) Pilot status snapshot
CREATE OR REPLACE FUNCTION public.admin_partner_pilot_status(_partner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _events int;
  _reservations int;
  _vip_lists int;
  _feedback int;
  _team int;
  _beta int;
  _sub jsonb;
  _last_seen timestamptz;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin required' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*) INTO _events FROM public.events
    WHERE partner_id = _partner_id AND submitted_by_partner = true;
  SELECT COUNT(*) INTO _reservations FROM public.partner_reservations WHERE partner_id = _partner_id;
  SELECT COUNT(*) INTO _vip_lists FROM public.partner_vip_lists WHERE partner_id = _partner_id;
  SELECT COUNT(*) INTO _feedback FROM public.partner_beta_feedback WHERE partner_id = _partner_id;
  SELECT COUNT(*) INTO _team FROM public.partner_users WHERE partner_id = _partner_id AND is_active = true;
  SELECT COUNT(*) INTO _beta FROM public.partner_beta_access WHERE partner_id = _partner_id AND access_enabled = true;

  SELECT MAX(u.last_sign_in_at) INTO _last_seen
    FROM public.partner_users pu
    JOIN auth.users u ON u.id = pu.user_id
    WHERE pu.partner_id = _partner_id AND pu.is_active = true;

  SELECT to_jsonb(s) INTO _sub FROM (
    SELECT plan, status, started_at, expires_at
    FROM public.partner_subscriptions
    WHERE partner_id = _partner_id
    ORDER BY created_at DESC LIMIT 1
  ) s;

  RETURN jsonb_build_object(
    'events_created', _events,
    'reservations_count', _reservations,
    'vip_lists_count', _vip_lists,
    'feedback_count', _feedback,
    'active_team', _team,
    'active_beta', _beta,
    'last_sign_in_at', _last_seen,
    'subscription', _sub
  );
END;
$$;
