
-- =====================================================================
-- FASE 9H — Sistema de Reservas do Partner Pro
-- =====================================================================

-- 1) Tabela: partner_reservations
CREATE TABLE IF NOT EXISTS public.partner_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text,
  email text,
  people_count integer NOT NULL DEFAULT 1 CHECK (people_count >= 1 AND people_count <= 50),
  reservation_date timestamptz NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','cancelled','completed','no_show')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_reservations_partner_idx
  ON public.partner_reservations (partner_id, reservation_date DESC);
CREATE INDEX IF NOT EXISTS partner_reservations_event_idx
  ON public.partner_reservations (event_id);
CREATE INDEX IF NOT EXISTS partner_reservations_status_idx
  ON public.partner_reservations (partner_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_reservations TO authenticated;
GRANT ALL ON public.partner_reservations TO service_role;

ALTER TABLE public.partner_reservations ENABLE ROW LEVEL SECURITY;

-- 2) Tabela: partner_reservation_settings (uma linha por parceiro)
CREATE TABLE IF NOT EXISTS public.partner_reservation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL UNIQUE REFERENCES public.partners(id) ON DELETE CASCADE,
  reservations_enabled boolean NOT NULL DEFAULT false,
  max_people_per_reservation integer NOT NULL DEFAULT 10,
  max_reservations_per_day integer NOT NULL DEFAULT 50,
  advance_booking_hours integer NOT NULL DEFAULT 2,
  auto_confirm boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_reservation_settings TO authenticated;
GRANT ALL ON public.partner_reservation_settings TO service_role;

ALTER TABLE public.partner_reservation_settings ENABLE ROW LEVEL SECURITY;

-- 3) Triggers updated_at
DROP TRIGGER IF EXISTS trg_partner_reservations_updated_at ON public.partner_reservations;
CREATE TRIGGER trg_partner_reservations_updated_at
  BEFORE UPDATE ON public.partner_reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_partner_reservation_settings_updated_at ON public.partner_reservation_settings;
CREATE TRIGGER trg_partner_reservation_settings_updated_at
  BEFORE UPDATE ON public.partner_reservation_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Helper: is_partner_reservation_manager (qualquer staff ativo)
CREATE OR REPLACE FUNCTION public.is_partner_reservation_manager(_user uuid, _partner uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.partner_users
    WHERE user_id = _user
      AND partner_id = _partner
      AND is_active = true
      AND role IN ('owner','admin','editor','attendant')
  )
$$;

-- 5) RLS Policies — partner_reservations
DROP POLICY IF EXISTS "Admins manage all reservations" ON public.partner_reservations;
CREATE POLICY "Admins manage all reservations"
  ON public.partner_reservations FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Partner staff read own reservations" ON public.partner_reservations;
CREATE POLICY "Partner staff read own reservations"
  ON public.partner_reservations FOR SELECT
  TO authenticated
  USING (public.is_partner_reservation_manager(auth.uid(), partner_id));

-- Mutations passam pelos RPCs SECURITY DEFINER; bloqueia direto.
-- (sem policies de INSERT/UPDATE/DELETE para não-admin = negado por padrão)

-- 6) RLS Policies — partner_reservation_settings
DROP POLICY IF EXISTS "Admins manage all reservation settings" ON public.partner_reservation_settings;
CREATE POLICY "Admins manage all reservation settings"
  ON public.partner_reservation_settings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Partner staff read own reservation settings" ON public.partner_reservation_settings;
CREATE POLICY "Partner staff read own reservation settings"
  ON public.partner_reservation_settings FOR SELECT
  TO authenticated
  USING (public.is_partner_reservation_manager(auth.uid(), partner_id));

-- 7) RPC: create_partner_reservation
CREATE OR REPLACE FUNCTION public.create_partner_reservation(_partner_id uuid, _payload jsonb)
RETURNS public.partner_reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.partner_reservations;
  _name text;
  _date timestamptz;
  _people int;
  _status text;
  _event uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF _partner_id IS NULL THEN
    RAISE EXCEPTION 'partner_id required';
  END IF;
  -- Apenas owner/admin podem criar
  IF NOT (public.is_admin() OR public.is_partner_owner_or_admin(_uid, _partner_id)) THEN
    RAISE EXCEPTION 'Forbidden: requires partner owner/admin' USING ERRCODE = '42501';
  END IF;
  IF _payload IS NULL OR jsonb_typeof(_payload) <> 'object' THEN
    RAISE EXCEPTION 'payload must be a JSON object';
  END IF;

  _name := NULLIF(btrim(_payload->>'name'), '');
  IF _name IS NULL THEN RAISE EXCEPTION 'name is required'; END IF;
  IF _payload->>'reservation_date' IS NULL THEN
    RAISE EXCEPTION 'reservation_date is required';
  END IF;
  _date := (_payload->>'reservation_date')::timestamptz;
  _people := COALESCE(NULLIF(_payload->>'people_count','')::int, 1);
  _status := COALESCE(NULLIF(_payload->>'status',''), 'pending');
  IF _status NOT IN ('pending','confirmed','cancelled','completed','no_show') THEN
    _status := 'pending';
  END IF;
  IF _payload ? 'event_id' AND NULLIF(_payload->>'event_id','') IS NOT NULL THEN
    _event := (_payload->>'event_id')::uuid;
  END IF;

  INSERT INTO public.partner_reservations (
    partner_id, event_id, user_id, name, phone, email,
    people_count, reservation_date, notes, status
  ) VALUES (
    _partner_id,
    _event,
    NULL,
    _name,
    NULLIF(btrim(_payload->>'phone'), ''),
    NULLIF(btrim(_payload->>'email'), ''),
    _people,
    _date,
    NULLIF(btrim(_payload->>'notes'), ''),
    _status
  )
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_partner_reservation(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_partner_reservation(uuid, jsonb) TO authenticated, service_role;

-- 8) RPC: update_partner_reservation (apenas owner/admin)
CREATE OR REPLACE FUNCTION public.update_partner_reservation(_reservation_id uuid, _payload jsonb)
RETURNS public.partner_reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _partner uuid;
  _row public.partner_reservations;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  SELECT partner_id INTO _partner FROM public.partner_reservations WHERE id = _reservation_id;
  IF _partner IS NULL THEN RAISE EXCEPTION 'Reservation not found'; END IF;
  IF NOT (public.is_admin() OR public.is_partner_owner_or_admin(_uid, _partner)) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  IF _payload IS NULL OR jsonb_typeof(_payload) <> 'object' THEN
    RAISE EXCEPTION 'payload must be a JSON object';
  END IF;

  UPDATE public.partner_reservations r
  SET
    name             = CASE WHEN _payload ? 'name'             THEN COALESCE(NULLIF(btrim(_payload->>'name'), ''), r.name) ELSE r.name END,
    phone            = CASE WHEN _payload ? 'phone'            THEN NULLIF(btrim(_payload->>'phone'), '') ELSE r.phone END,
    email            = CASE WHEN _payload ? 'email'            THEN NULLIF(btrim(_payload->>'email'), '') ELSE r.email END,
    people_count     = CASE WHEN _payload ? 'people_count'     THEN COALESCE(NULLIF(_payload->>'people_count','')::int, r.people_count) ELSE r.people_count END,
    reservation_date = CASE WHEN _payload ? 'reservation_date' THEN (_payload->>'reservation_date')::timestamptz ELSE r.reservation_date END,
    notes            = CASE WHEN _payload ? 'notes'            THEN NULLIF(btrim(_payload->>'notes'), '') ELSE r.notes END,
    event_id         = CASE WHEN _payload ? 'event_id'         THEN NULLIF(_payload->>'event_id','')::uuid ELSE r.event_id END
  WHERE r.id = _reservation_id
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.update_partner_reservation(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_partner_reservation(uuid, jsonb) TO authenticated, service_role;

-- 9) RPC: set_partner_reservation_status — controle de transição por role
CREATE OR REPLACE FUNCTION public.set_partner_reservation_status(_reservation_id uuid, _status text)
RETURNS public.partner_reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _partner uuid;
  _row public.partner_reservations;
  _role text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF _status NOT IN ('pending','confirmed','cancelled','completed','no_show') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  SELECT partner_id INTO _partner FROM public.partner_reservations WHERE id = _reservation_id;
  IF _partner IS NULL THEN RAISE EXCEPTION 'Reservation not found'; END IF;

  -- Admin bypass
  IF public.is_admin() THEN
    UPDATE public.partner_reservations SET status = _status WHERE id = _reservation_id RETURNING * INTO _row;
    RETURN _row;
  END IF;

  SELECT role INTO _role FROM public.partner_users
    WHERE user_id = _uid AND partner_id = _partner AND is_active = true LIMIT 1;

  IF _role IS NULL THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  -- Permissões por role:
  -- owner/admin: tudo
  -- editor: confirm
  -- attendant: confirm, complete, no_show
  IF _role IN ('owner','admin') THEN
    -- ok
    NULL;
  ELSIF _role = 'editor' THEN
    IF _status <> 'confirmed' THEN
      RAISE EXCEPTION 'Editor only allowed to confirm' USING ERRCODE = '42501';
    END IF;
  ELSIF _role = 'attendant' THEN
    IF _status NOT IN ('confirmed','completed','no_show') THEN
      RAISE EXCEPTION 'Attendant cannot set this status' USING ERRCODE = '42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.partner_reservations SET status = _status WHERE id = _reservation_id RETURNING * INTO _row;
  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.set_partner_reservation_status(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_partner_reservation_status(uuid, text) TO authenticated, service_role;

-- 10) RPC: upsert_partner_reservation_settings
CREATE OR REPLACE FUNCTION public.upsert_partner_reservation_settings(_partner_id uuid, _payload jsonb)
RETURNS public.partner_reservation_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.partner_reservation_settings;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF _partner_id IS NULL THEN
    RAISE EXCEPTION 'partner_id required';
  END IF;
  IF NOT (public.is_admin() OR public.is_partner_owner_or_admin(_uid, _partner_id)) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  IF _payload IS NULL OR jsonb_typeof(_payload) <> 'object' THEN
    RAISE EXCEPTION 'payload must be a JSON object';
  END IF;

  INSERT INTO public.partner_reservation_settings (
    partner_id, reservations_enabled, max_people_per_reservation,
    max_reservations_per_day, advance_booking_hours, auto_confirm
  ) VALUES (
    _partner_id,
    COALESCE((_payload->>'reservations_enabled')::boolean, false),
    COALESCE(NULLIF(_payload->>'max_people_per_reservation','')::int, 10),
    COALESCE(NULLIF(_payload->>'max_reservations_per_day','')::int, 50),
    COALESCE(NULLIF(_payload->>'advance_booking_hours','')::int, 2),
    COALESCE((_payload->>'auto_confirm')::boolean, false)
  )
  ON CONFLICT (partner_id) DO UPDATE SET
    reservations_enabled       = CASE WHEN _payload ? 'reservations_enabled'       THEN (_payload->>'reservations_enabled')::boolean ELSE public.partner_reservation_settings.reservations_enabled END,
    max_people_per_reservation = CASE WHEN _payload ? 'max_people_per_reservation' THEN (_payload->>'max_people_per_reservation')::int ELSE public.partner_reservation_settings.max_people_per_reservation END,
    max_reservations_per_day   = CASE WHEN _payload ? 'max_reservations_per_day'   THEN (_payload->>'max_reservations_per_day')::int ELSE public.partner_reservation_settings.max_reservations_per_day END,
    advance_booking_hours      = CASE WHEN _payload ? 'advance_booking_hours'      THEN (_payload->>'advance_booking_hours')::int ELSE public.partner_reservation_settings.advance_booking_hours END,
    auto_confirm               = CASE WHEN _payload ? 'auto_confirm'               THEN (_payload->>'auto_confirm')::boolean ELSE public.partner_reservation_settings.auto_confirm END,
    updated_at = now()
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_partner_reservation_settings(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_partner_reservation_settings(uuid, jsonb) TO authenticated, service_role;
