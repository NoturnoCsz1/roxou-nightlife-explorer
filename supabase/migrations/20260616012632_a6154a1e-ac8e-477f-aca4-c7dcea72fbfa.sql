-- ============================================================
-- Fase 9G — Partner Events
-- Source-of-truth = public.events (no parallel table).
-- ============================================================

-- 1) Origin flag for events submitted via Partner Pro.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS submitted_by_partner boolean NOT NULL DEFAULT false;

-- 2) Role helper: editor-or-above (owner | admin | editor) for a given partner.
CREATE OR REPLACE FUNCTION public.is_partner_editor_or_above(_user uuid, _partner uuid)
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
      AND role IN ('owner','admin','editor')
  )
$$;

REVOKE ALL ON FUNCTION public.is_partner_editor_or_above(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_partner_editor_or_above(uuid, uuid) TO authenticated, service_role;

-- 3) SELECT policy: partner staff (any active role) can read events of their partner.
DROP POLICY IF EXISTS "Partner staff read own partner events" ON public.events;
CREATE POLICY "Partner staff read own partner events"
ON public.events
FOR SELECT
TO authenticated
USING (
  partner_id IS NOT NULL
  AND public.is_partner_member(auth.uid(), partner_id)
);

-- 4) Slug helper for partner-submitted events.
CREATE OR REPLACE FUNCTION public._partner_event_slug(_title text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(
           regexp_replace(
             regexp_replace(coalesce(_title, 'evento'), '[^a-zA-Z0-9]+', '-', 'g'),
             '(^-+|-+$)', '', 'g'
           )
         ) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)
$$;

-- 5) CREATE event (editor+).
CREATE OR REPLACE FUNCTION public.create_partner_event(
  _partner_id uuid,
  _payload jsonb
)
RETURNS public.events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.events;
  _title text;
  _date timestamptz;
  _city text;
  _tags text[] := '{}';
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF _partner_id IS NULL THEN
    RAISE EXCEPTION 'partner_id required';
  END IF;
  IF NOT (public.is_admin() OR public.is_partner_editor_or_above(_uid, _partner_id)) THEN
    RAISE EXCEPTION 'Forbidden: requires partner editor/admin/owner or Roxou admin'
      USING ERRCODE = '42501';
  END IF;
  IF _payload IS NULL OR jsonb_typeof(_payload) <> 'object' THEN
    RAISE EXCEPTION 'payload must be a JSON object';
  END IF;

  _title := NULLIF(btrim(_payload->>'title'), '');
  IF _title IS NULL THEN
    RAISE EXCEPTION 'title is required';
  END IF;
  IF _payload->>'date_time' IS NULL THEN
    RAISE EXCEPTION 'date_time is required';
  END IF;
  _date := (_payload->>'date_time')::timestamptz;

  SELECT p.city INTO _city FROM public.partners p WHERE p.id = _partner_id;

  IF jsonb_typeof(_payload->'opportunity_tags') = 'array' THEN
    SELECT COALESCE(array_agg(value::text), '{}')::text[]
      INTO _tags
      FROM jsonb_array_elements_text(_payload->'opportunity_tags') AS value
      WHERE length(btrim(value)) > 0;
  END IF;

  INSERT INTO public.events (
    title, slug, description, short_summary, image_url, date_time,
    venue_name, category, sub_category, instagram_caption, ticket_url,
    opportunity_tags, partner_id, city, status, submitted_by_partner
  ) VALUES (
    _title,
    public._partner_event_slug(_title),
    NULLIF(btrim(_payload->>'description'), ''),
    NULLIF(btrim(_payload->>'short_summary'), ''),
    NULLIF(btrim(_payload->>'image_url'), ''),
    _date,
    NULLIF(btrim(_payload->>'venue_name'), ''),
    COALESCE(NULLIF(btrim(_payload->>'category'), ''), 'festa'),
    NULLIF(btrim(_payload->>'sub_category'), ''),
    NULLIF(btrim(_payload->>'instagram_caption'), ''),
    NULLIF(btrim(_payload->>'ticket_url'), ''),
    _tags,
    _partner_id,
    COALESCE(_city, 'Presidente Prudente'),
    'draft',
    true
  )
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_partner_event(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_partner_event(uuid, jsonb) TO authenticated, service_role;

-- 6) UPDATE event (editor+). Whitelisted columns only; status is preserved.
CREATE OR REPLACE FUNCTION public.update_partner_event(
  _event_id uuid,
  _payload jsonb
)
RETURNS public.events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _partner uuid;
  _row public.events;
  _tags text[];
  _has_tags boolean := false;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF _event_id IS NULL THEN
    RAISE EXCEPTION 'event_id required';
  END IF;

  SELECT partner_id INTO _partner FROM public.events WHERE id = _event_id;
  IF _partner IS NULL THEN
    RAISE EXCEPTION 'Event not found or not linked to a partner';
  END IF;

  IF NOT (public.is_admin() OR public.is_partner_editor_or_above(_uid, _partner)) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  IF _payload IS NULL OR jsonb_typeof(_payload) <> 'object' THEN
    RAISE EXCEPTION 'payload must be a JSON object';
  END IF;

  IF jsonb_typeof(_payload->'opportunity_tags') = 'array' THEN
    SELECT COALESCE(array_agg(value::text), '{}')::text[]
      INTO _tags
      FROM jsonb_array_elements_text(_payload->'opportunity_tags') AS value
      WHERE length(btrim(value)) > 0;
    _has_tags := true;
  END IF;

  UPDATE public.events e
  SET
    title             = CASE WHEN _payload ? 'title'             THEN COALESCE(NULLIF(btrim(_payload->>'title'), ''), e.title) ELSE e.title END,
    description       = CASE WHEN _payload ? 'description'       THEN NULLIF(btrim(_payload->>'description'), '') ELSE e.description END,
    short_summary     = CASE WHEN _payload ? 'short_summary'     THEN NULLIF(btrim(_payload->>'short_summary'), '') ELSE e.short_summary END,
    image_url         = CASE WHEN _payload ? 'image_url'         THEN NULLIF(btrim(_payload->>'image_url'), '') ELSE e.image_url END,
    date_time         = CASE WHEN _payload ? 'date_time'         THEN (_payload->>'date_time')::timestamptz ELSE e.date_time END,
    venue_name        = CASE WHEN _payload ? 'venue_name'        THEN NULLIF(btrim(_payload->>'venue_name'), '') ELSE e.venue_name END,
    category          = CASE WHEN _payload ? 'category'          THEN COALESCE(NULLIF(btrim(_payload->>'category'), ''), e.category) ELSE e.category END,
    sub_category      = CASE WHEN _payload ? 'sub_category'      THEN NULLIF(btrim(_payload->>'sub_category'), '') ELSE e.sub_category END,
    instagram_caption = CASE WHEN _payload ? 'instagram_caption' THEN NULLIF(btrim(_payload->>'instagram_caption'), '') ELSE e.instagram_caption END,
    ticket_url        = CASE WHEN _payload ? 'ticket_url'        THEN NULLIF(btrim(_payload->>'ticket_url'), '') ELSE e.ticket_url END,
    opportunity_tags  = CASE WHEN _has_tags                      THEN _tags ELSE e.opportunity_tags END
  WHERE e.id = _event_id
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.update_partner_event(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_partner_event(uuid, jsonb) TO authenticated, service_role;

-- 7) DUPLICATE event (owner/admin).
CREATE OR REPLACE FUNCTION public.duplicate_partner_event(_event_id uuid)
RETURNS public.events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _src public.events;
  _row public.events;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO _src FROM public.events WHERE id = _event_id;
  IF _src.id IS NULL OR _src.partner_id IS NULL THEN
    RAISE EXCEPTION 'Event not found or not linked to a partner';
  END IF;
  IF NOT (public.is_admin() OR public.is_partner_owner_or_admin(_uid, _src.partner_id)) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.events (
    title, slug, description, short_summary, image_url, date_time,
    venue_name, category, sub_category, instagram_caption, ticket_url,
    opportunity_tags, partner_id, city, status, submitted_by_partner
  ) VALUES (
    _src.title || ' (cópia)',
    public._partner_event_slug(_src.title),
    _src.description, _src.short_summary, _src.image_url, _src.date_time,
    _src.venue_name, _src.category, _src.sub_category, _src.instagram_caption, _src.ticket_url,
    _src.opportunity_tags, _src.partner_id, _src.city, 'draft', true
  )
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.duplicate_partner_event(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.duplicate_partner_event(uuid) TO authenticated, service_role;

-- 8) ARCHIVE event (owner/admin) — soft, never hard-delete.
CREATE OR REPLACE FUNCTION public.archive_partner_event(_event_id uuid)
RETURNS public.events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _partner uuid;
  _row public.events;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  SELECT partner_id INTO _partner FROM public.events WHERE id = _event_id;
  IF _partner IS NULL THEN
    RAISE EXCEPTION 'Event not found or not linked to a partner';
  END IF;
  IF NOT (public.is_admin() OR public.is_partner_owner_or_admin(_uid, _partner)) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.events SET status = 'archived' WHERE id = _event_id
  RETURNING * INTO _row;
  RETURN _row;
END;
$$;

REVOKE ALL ON FUNCTION public.archive_partner_event(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.archive_partner_event(uuid) TO authenticated, service_role;

COMMENT ON COLUMN public.events.submitted_by_partner IS
'Fase 9G: true when the event was created via Partner Pro (Roxou Partner Pro flow).';
