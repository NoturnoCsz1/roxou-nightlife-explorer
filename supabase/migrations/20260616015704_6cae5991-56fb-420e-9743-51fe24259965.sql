-- Fase 9I — Partner VIP Lists

-- ============ TABLES ============

CREATE TABLE public.partner_vip_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  max_entries integer,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','closed','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_vip_lists TO authenticated;
GRANT ALL ON public.partner_vip_lists TO service_role;

ALTER TABLE public.partner_vip_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partner staff read own vip lists"
  ON public.partner_vip_lists FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_partner_member(auth.uid(), partner_id));

CREATE POLICY "Admin manage vip lists"
  ON public.partner_vip_lists FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX idx_partner_vip_lists_partner ON public.partner_vip_lists(partner_id);
CREATE INDEX idx_partner_vip_lists_event ON public.partner_vip_lists(event_id);

CREATE TRIGGER trg_partner_vip_lists_updated
  BEFORE UPDATE ON public.partner_vip_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.partner_vip_list_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vip_list_id uuid NOT NULL REFERENCES public.partner_vip_lists(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text,
  email text,
  people_count integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','checked_in','cancelled','no_show')),
  checked_in_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_vip_list_entries TO authenticated;
GRANT ALL ON public.partner_vip_list_entries TO service_role;

ALTER TABLE public.partner_vip_list_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partner staff read own vip entries"
  ON public.partner_vip_list_entries FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_partner_member(auth.uid(), partner_id));

CREATE POLICY "Admin manage vip entries"
  ON public.partner_vip_list_entries FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX idx_partner_vip_entries_list ON public.partner_vip_list_entries(vip_list_id);
CREATE INDEX idx_partner_vip_entries_partner ON public.partner_vip_list_entries(partner_id);

CREATE TRIGGER trg_partner_vip_entries_updated
  BEFORE UPDATE ON public.partner_vip_list_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RPCs ============

CREATE OR REPLACE FUNCTION public.create_partner_vip_list(_partner_id uuid, _payload jsonb)
RETURNS public.partner_vip_lists LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.partner_vip_lists;
  _title text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  IF _partner_id IS NULL THEN RAISE EXCEPTION 'partner_id required'; END IF;
  IF NOT (public.is_admin() OR public.is_partner_editor_or_above(_uid, _partner_id)) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  IF _payload IS NULL OR jsonb_typeof(_payload) <> 'object' THEN
    RAISE EXCEPTION 'payload must be a JSON object';
  END IF;
  _title := NULLIF(btrim(_payload->>'title'), '');
  IF _title IS NULL THEN RAISE EXCEPTION 'title is required'; END IF;

  INSERT INTO public.partner_vip_lists (
    partner_id, event_id, title, description, starts_at, ends_at, max_entries, status
  ) VALUES (
    _partner_id,
    NULLIF(_payload->>'event_id','')::uuid,
    _title,
    NULLIF(btrim(_payload->>'description'),''),
    NULLIF(_payload->>'starts_at','')::timestamptz,
    NULLIF(_payload->>'ends_at','')::timestamptz,
    NULLIF(_payload->>'max_entries','')::int,
    COALESCE(NULLIF(_payload->>'status',''), 'draft')
  ) RETURNING * INTO _row;

  RETURN _row;
END; $$;

CREATE OR REPLACE FUNCTION public.update_partner_vip_list(_list_id uuid, _payload jsonb)
RETURNS public.partner_vip_lists LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _partner uuid;
  _row public.partner_vip_lists;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  SELECT partner_id INTO _partner FROM public.partner_vip_lists WHERE id = _list_id;
  IF _partner IS NULL THEN RAISE EXCEPTION 'List not found'; END IF;
  IF NOT (public.is_admin() OR public.is_partner_editor_or_above(_uid, _partner)) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  IF _payload IS NULL OR jsonb_typeof(_payload) <> 'object' THEN
    RAISE EXCEPTION 'payload must be a JSON object';
  END IF;

  UPDATE public.partner_vip_lists l SET
    title       = CASE WHEN _payload ? 'title'       THEN COALESCE(NULLIF(btrim(_payload->>'title'),''), l.title) ELSE l.title END,
    description = CASE WHEN _payload ? 'description' THEN NULLIF(btrim(_payload->>'description'),'') ELSE l.description END,
    event_id    = CASE WHEN _payload ? 'event_id'    THEN NULLIF(_payload->>'event_id','')::uuid ELSE l.event_id END,
    starts_at   = CASE WHEN _payload ? 'starts_at'   THEN NULLIF(_payload->>'starts_at','')::timestamptz ELSE l.starts_at END,
    ends_at     = CASE WHEN _payload ? 'ends_at'     THEN NULLIF(_payload->>'ends_at','')::timestamptz ELSE l.ends_at END,
    max_entries = CASE WHEN _payload ? 'max_entries' THEN NULLIF(_payload->>'max_entries','')::int ELSE l.max_entries END
  WHERE l.id = _list_id RETURNING * INTO _row;

  RETURN _row;
END; $$;

CREATE OR REPLACE FUNCTION public._set_partner_vip_list_status(_list_id uuid, _status text, _owner_only boolean)
RETURNS public.partner_vip_lists LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _partner uuid;
  _row public.partner_vip_lists;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  SELECT partner_id INTO _partner FROM public.partner_vip_lists WHERE id = _list_id;
  IF _partner IS NULL THEN RAISE EXCEPTION 'List not found'; END IF;
  IF _owner_only THEN
    IF NOT (public.is_admin() OR public.is_partner_owner_or_admin(_uid, _partner)) THEN
      RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NOT (public.is_admin() OR public.is_partner_editor_or_above(_uid, _partner)) THEN
      RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
    END IF;
  END IF;
  UPDATE public.partner_vip_lists SET status = _status WHERE id = _list_id RETURNING * INTO _row;
  RETURN _row;
END; $$;

CREATE OR REPLACE FUNCTION public.open_partner_vip_list(_list_id uuid)
RETURNS public.partner_vip_lists LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public._set_partner_vip_list_status(_list_id, 'open', false);
$$;

CREATE OR REPLACE FUNCTION public.close_partner_vip_list(_list_id uuid)
RETURNS public.partner_vip_lists LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public._set_partner_vip_list_status(_list_id, 'closed', true);
$$;

CREATE OR REPLACE FUNCTION public.archive_partner_vip_list(_list_id uuid)
RETURNS public.partner_vip_lists LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT public._set_partner_vip_list_status(_list_id, 'archived', true);
$$;

CREATE OR REPLACE FUNCTION public.add_partner_vip_entry(_list_id uuid, _payload jsonb)
RETURNS public.partner_vip_list_entries LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _list public.partner_vip_lists;
  _row public.partner_vip_list_entries;
  _name text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO _list FROM public.partner_vip_lists WHERE id = _list_id;
  IF _list.id IS NULL THEN RAISE EXCEPTION 'List not found'; END IF;
  IF NOT (public.is_admin() OR public.is_partner_editor_or_above(_uid, _list.partner_id)) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  _name := NULLIF(btrim(_payload->>'name'),'');
  IF _name IS NULL THEN RAISE EXCEPTION 'name is required'; END IF;

  INSERT INTO public.partner_vip_list_entries (
    vip_list_id, partner_id, event_id, name, phone, email, people_count, status
  ) VALUES (
    _list_id, _list.partner_id, _list.event_id,
    _name,
    NULLIF(btrim(_payload->>'phone'),''),
    NULLIF(btrim(_payload->>'email'),''),
    COALESCE(NULLIF(_payload->>'people_count','')::int, 1),
    COALESCE(NULLIF(_payload->>'status',''), 'pending')
  ) RETURNING * INTO _row;

  RETURN _row;
END; $$;

CREATE OR REPLACE FUNCTION public.update_partner_vip_entry(_entry_id uuid, _payload jsonb)
RETURNS public.partner_vip_list_entries LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _partner uuid;
  _row public.partner_vip_list_entries;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  SELECT partner_id INTO _partner FROM public.partner_vip_list_entries WHERE id = _entry_id;
  IF _partner IS NULL THEN RAISE EXCEPTION 'Entry not found'; END IF;
  IF NOT (public.is_admin() OR public.is_partner_editor_or_above(_uid, _partner)) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.partner_vip_list_entries e SET
    name         = CASE WHEN _payload ? 'name'         THEN COALESCE(NULLIF(btrim(_payload->>'name'),''), e.name) ELSE e.name END,
    phone        = CASE WHEN _payload ? 'phone'        THEN NULLIF(btrim(_payload->>'phone'),'') ELSE e.phone END,
    email        = CASE WHEN _payload ? 'email'        THEN NULLIF(btrim(_payload->>'email'),'') ELSE e.email END,
    people_count = CASE WHEN _payload ? 'people_count' THEN COALESCE(NULLIF(_payload->>'people_count','')::int, e.people_count) ELSE e.people_count END,
    status       = CASE WHEN _payload ? 'status'       THEN COALESCE(NULLIF(_payload->>'status',''), e.status) ELSE e.status END
  WHERE e.id = _entry_id RETURNING * INTO _row;

  RETURN _row;
END; $$;

CREATE OR REPLACE FUNCTION public.check_in_partner_vip_entry(_entry_id uuid)
RETURNS public.partner_vip_list_entries LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _partner uuid;
  _row public.partner_vip_list_entries;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  SELECT partner_id INTO _partner FROM public.partner_vip_list_entries WHERE id = _entry_id;
  IF _partner IS NULL THEN RAISE EXCEPTION 'Entry not found'; END IF;
  -- attendant também pode fazer check-in
  IF NOT (public.is_admin() OR public.is_partner_reservation_manager(_uid, _partner)) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.partner_vip_list_entries
    SET status = 'checked_in', checked_in_at = now()
    WHERE id = _entry_id RETURNING * INTO _row;
  RETURN _row;
END; $$;

CREATE OR REPLACE FUNCTION public.cancel_partner_vip_entry(_entry_id uuid)
RETURNS public.partner_vip_list_entries LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _partner uuid;
  _row public.partner_vip_list_entries;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  SELECT partner_id INTO _partner FROM public.partner_vip_list_entries WHERE id = _entry_id;
  IF _partner IS NULL THEN RAISE EXCEPTION 'Entry not found'; END IF;
  IF NOT (public.is_admin() OR public.is_partner_reservation_manager(_uid, _partner)) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.partner_vip_list_entries SET status = 'cancelled' WHERE id = _entry_id RETURNING * INTO _row;
  RETURN _row;
END; $$;

REVOKE ALL ON FUNCTION public.create_partner_vip_list(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_partner_vip_list(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._set_partner_vip_list_status(uuid, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.open_partner_vip_list(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.close_partner_vip_list(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.archive_partner_vip_list(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_partner_vip_entry(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_partner_vip_entry(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_in_partner_vip_entry(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_partner_vip_entry(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_partner_vip_list(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_partner_vip_list(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.open_partner_vip_list(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.close_partner_vip_list(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.archive_partner_vip_list(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_partner_vip_entry(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_partner_vip_entry(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_in_partner_vip_entry(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_partner_vip_entry(uuid) TO authenticated, service_role;