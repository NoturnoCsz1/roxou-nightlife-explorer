
-- 1) partner_promoters
CREATE TABLE IF NOT EXISTS public.partner_promoters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  instagram text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS partner_promoters_partner_idx
  ON public.partner_promoters(partner_id, is_active);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_promoters TO authenticated;
GRANT ALL ON public.partner_promoters TO service_role;

ALTER TABLE public.partner_promoters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Partner editors manage promoters" ON public.partner_promoters;
CREATE POLICY "Partner editors manage promoters"
  ON public.partner_promoters
  FOR ALL
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_partner_editor_or_above(auth.uid(), partner_id)
  )
  WITH CHECK (
    public.is_admin()
    OR public.is_partner_editor_or_above(auth.uid(), partner_id)
  );

DROP POLICY IF EXISTS "Partner staff read promoters" ON public.partner_promoters;
CREATE POLICY "Partner staff read promoters"
  ON public.partner_promoters
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_partner_member(auth.uid(), partner_id)
  );

DROP TRIGGER IF EXISTS update_partner_promoters_updated_at ON public.partner_promoters;
CREATE TRIGGER update_partner_promoters_updated_at
  BEFORE UPDATE ON public.partner_promoters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Extend partner_vip_list_entries with promoter snapshot
ALTER TABLE public.partner_vip_list_entries
  ADD COLUMN IF NOT EXISTS promoter_id uuid REFERENCES public.partner_promoters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promoter_name_snapshot text;

CREATE INDEX IF NOT EXISTS partner_vip_list_entries_promoter_idx
  ON public.partner_vip_list_entries(promoter_id);

-- 3) Update add_partner_vip_entry to support promoter
CREATE OR REPLACE FUNCTION public.add_partner_vip_entry(_list_id uuid, _payload jsonb)
 RETURNS public.partner_vip_list_entries
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _list public.partner_vip_lists;
  _row public.partner_vip_list_entries;
  _name text;
  _promoter_id uuid;
  _promoter_snapshot text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO _list FROM public.partner_vip_lists WHERE id = _list_id;
  IF _list.id IS NULL THEN RAISE EXCEPTION 'List not found'; END IF;
  IF NOT (public.is_admin() OR public.is_partner_editor_or_above(_uid, _list.partner_id)) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  _name := NULLIF(btrim(_payload->>'name'),'');
  IF _name IS NULL THEN RAISE EXCEPTION 'name is required'; END IF;

  IF _payload ? 'promoter_id' AND NULLIF(_payload->>'promoter_id','') IS NOT NULL THEN
    _promoter_id := (_payload->>'promoter_id')::uuid;
    SELECT name INTO _promoter_snapshot
      FROM public.partner_promoters
      WHERE id = _promoter_id AND partner_id = _list.partner_id;
    IF _promoter_snapshot IS NULL THEN
      RAISE EXCEPTION 'Promoter not found for this partner';
    END IF;
  END IF;

  IF _payload ? 'promoter_name_snapshot'
     AND NULLIF(btrim(_payload->>'promoter_name_snapshot'),'') IS NOT NULL THEN
    _promoter_snapshot := btrim(_payload->>'promoter_name_snapshot');
  END IF;

  INSERT INTO public.partner_vip_list_entries (
    vip_list_id, partner_id, event_id, name, phone, email, people_count, status,
    promoter_id, promoter_name_snapshot
  ) VALUES (
    _list_id, _list.partner_id, _list.event_id,
    _name,
    NULLIF(btrim(_payload->>'phone'),''),
    NULLIF(btrim(_payload->>'email'),''),
    COALESCE(NULLIF(_payload->>'people_count','')::int, 1),
    COALESCE(NULLIF(_payload->>'status',''), 'pending'),
    _promoter_id,
    _promoter_snapshot
  ) RETURNING * INTO _row;

  RETURN _row;
END; $function$;

-- 4) Update update_partner_vip_entry to support promoter
CREATE OR REPLACE FUNCTION public.update_partner_vip_entry(_entry_id uuid, _payload jsonb)
 RETURNS public.partner_vip_list_entries
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _partner uuid;
  _row public.partner_vip_list_entries;
  _new_promoter uuid;
  _snapshot text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501'; END IF;
  SELECT partner_id INTO _partner FROM public.partner_vip_list_entries WHERE id = _entry_id;
  IF _partner IS NULL THEN RAISE EXCEPTION 'Entry not found'; END IF;
  IF NOT (public.is_admin() OR public.is_partner_editor_or_above(_uid, _partner)) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF _payload ? 'promoter_id' THEN
    IF NULLIF(_payload->>'promoter_id','') IS NULL THEN
      _new_promoter := NULL;
    ELSE
      _new_promoter := (_payload->>'promoter_id')::uuid;
      SELECT name INTO _snapshot FROM public.partner_promoters
        WHERE id = _new_promoter AND partner_id = _partner;
      IF _snapshot IS NULL THEN
        RAISE EXCEPTION 'Promoter not found for this partner';
      END IF;
    END IF;
  END IF;

  UPDATE public.partner_vip_list_entries e SET
    name         = CASE WHEN _payload ? 'name'         THEN COALESCE(NULLIF(btrim(_payload->>'name'),''), e.name) ELSE e.name END,
    phone        = CASE WHEN _payload ? 'phone'        THEN NULLIF(btrim(_payload->>'phone'),'') ELSE e.phone END,
    email        = CASE WHEN _payload ? 'email'        THEN NULLIF(btrim(_payload->>'email'),'') ELSE e.email END,
    people_count = CASE WHEN _payload ? 'people_count' THEN COALESCE(NULLIF(_payload->>'people_count','')::int, e.people_count) ELSE e.people_count END,
    status       = CASE WHEN _payload ? 'status'       THEN COALESCE(NULLIF(_payload->>'status',''), e.status) ELSE e.status END,
    promoter_id  = CASE WHEN _payload ? 'promoter_id'  THEN _new_promoter ELSE e.promoter_id END,
    promoter_name_snapshot = CASE
      WHEN _payload ? 'promoter_id' THEN COALESCE(_snapshot, e.promoter_name_snapshot)
      WHEN _payload ? 'promoter_name_snapshot' THEN NULLIF(btrim(_payload->>'promoter_name_snapshot'),'')
      ELSE e.promoter_name_snapshot
    END
  WHERE e.id = _entry_id RETURNING * INTO _row;

  RETURN _row;
END; $function$;

-- 5) Add no_show RPC
CREATE OR REPLACE FUNCTION public.no_show_partner_vip_entry(_entry_id uuid)
 RETURNS public.partner_vip_list_entries
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  UPDATE public.partner_vip_list_entries
    SET status = 'no_show'
    WHERE id = _entry_id RETURNING * INTO _row;
  RETURN _row;
END; $function$;
