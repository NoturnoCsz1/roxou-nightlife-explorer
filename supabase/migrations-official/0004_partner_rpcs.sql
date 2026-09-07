-- =====================================================================
-- Partner Pro — Fase 3 — RPCs (Supabase OFICIAL foteitrhbfwbzzeanxve)
-- NÃO APLICAR NO LEGADO. Não executado automaticamente.
--
-- Regras de TODA função SECURITY DEFINER aqui:
--  - SET search_path = public (seguro)
--  - valida auth.uid()
--  - valida membership em organization_members (via helpers oficiais)
--  - valida venue pertencente à organization
--  - nunca confia em role enviada pelo frontend
--  - nunca permite escalada horizontal entre organizations
--  - não retorna PII desnecessária
--
-- Nenhum helper legado é usado (user_manages_partner, is_partner_member,
-- is_partner_owner_or_admin).
-- =====================================================================

-- Guarda-corpo reutilizado por todas as RPCs de gestão.
CREATE OR REPLACE FUNCTION public.assert_org_operation(
  _organization_id uuid, _venue_id uuid DEFAULT NULL, _require_manager boolean DEFAULT true
) RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = '42501';
  END IF;
  IF _require_manager THEN
    IF NOT (public.is_org_manager_or_owner(_organization_id) OR public.is_admin_or_superadmin()) THEN
      RAISE EXCEPTION 'Sem permissão de gestão nesta organização.' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF NOT (public.is_org_member(_organization_id) OR public.is_staff_or_admin()) THEN
      RAISE EXCEPTION 'Sem vínculo com esta organização.' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF _venue_id IS NOT NULL
     AND NOT public.venue_belongs_to_organization(_venue_id, _organization_id) THEN
    RAISE EXCEPTION 'Estabelecimento não pertence à organização.' USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.assert_org_operation(uuid, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assert_org_operation(uuid, uuid, boolean) TO authenticated;

-- ============================ RESERVAS ==============================

CREATE OR REPLACE FUNCTION public.partner_create_reservation(
  p_organization_id uuid, p_venue_id uuid, p_payload jsonb
) RETURNS public.reservations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.reservations;
BEGIN
  PERFORM public.assert_org_operation(p_organization_id, p_venue_id, false);

  INSERT INTO public.reservations (
    organization_id, venue_id, event_id, reservation_type_id,
    name, phone, email, people_count, reservation_date, notes, status
  ) VALUES (
    p_organization_id, p_venue_id,
    NULLIF(p_payload->>'event_id','')::uuid,
    NULLIF(p_payload->>'reservation_type_id','')::uuid,
    trim(p_payload->>'name'),
    NULLIF(p_payload->>'phone',''),
    NULLIF(p_payload->>'email',''),
    COALESCE((p_payload->>'people_count')::int, 1),
    (p_payload->>'reservation_date')::timestamptz,
    NULLIF(p_payload->>'notes',''),
    COALESCE((p_payload->>'status')::public.reservation_status, 'pending')
  ) RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.partner_update_reservation(
  p_reservation_id uuid, p_payload jsonb
) RETURNS public.reservations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.reservations;
BEGIN
  SELECT * INTO v_row FROM public.reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reserva não encontrada.'; END IF;
  PERFORM public.assert_org_operation(v_row.organization_id, v_row.venue_id, true);

  UPDATE public.reservations SET
    name = COALESCE(NULLIF(p_payload->>'name',''), name),
    phone = COALESCE(p_payload->>'phone', phone),
    email = COALESCE(p_payload->>'email', email),
    people_count = COALESCE((p_payload->>'people_count')::int, people_count),
    reservation_date = COALESCE((p_payload->>'reservation_date')::timestamptz, reservation_date),
    notes = COALESCE(p_payload->>'notes', notes),
    reservation_type_id = COALESCE(NULLIF(p_payload->>'reservation_type_id','')::uuid, reservation_type_id)
  WHERE id = p_reservation_id RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.partner_set_reservation_status(
  p_reservation_id uuid, p_status public.reservation_status
) RETURNS public.reservations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.reservations;
BEGIN
  SELECT * INTO v_row FROM public.reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reserva não encontrada.'; END IF;
  PERFORM public.assert_org_operation(v_row.organization_id, v_row.venue_id, true);

  UPDATE public.reservations SET status = p_status
  WHERE id = p_reservation_id RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

-- Check-in: aceito também por staff/validator (operação de portaria).
CREATE OR REPLACE FUNCTION public.partner_check_in_reservation(p_reservation_id uuid)
RETURNS public.reservations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.reservations;
BEGIN
  SELECT * INTO v_row FROM public.reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reserva não encontrada.'; END IF;
  PERFORM public.assert_org_operation(v_row.organization_id, v_row.venue_id, false);

  UPDATE public.reservations
    SET checked_in_at = COALESCE(checked_in_at, now()),
        checked_in_by = COALESCE(checked_in_by, auth.uid()),
        status = 'completed'
  WHERE id = p_reservation_id RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.partner_confirm_reservation_payment(p_reservation_id uuid)
RETURNS public.reservations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.reservations;
BEGIN
  SELECT * INTO v_row FROM public.reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reserva não encontrada.'; END IF;
  PERFORM public.assert_org_operation(v_row.organization_id, v_row.venue_id, true);

  UPDATE public.reservations
    SET payment_status = 'paid', payment_confirmed_at = now(),
        status = CASE WHEN status = 'pending_payment' THEN 'confirmed' ELSE status END
  WHERE id = p_reservation_id RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.partner_release_reservation_table(p_reservation_id uuid)
RETURNS public.reservations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.reservations;
BEGIN
  SELECT * INTO v_row FROM public.reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reserva não encontrada.'; END IF;
  PERFORM public.assert_org_operation(v_row.organization_id, v_row.venue_id, false);

  UPDATE public.reservations SET released_at = now(), status = 'completed'
  WHERE id = p_reservation_id RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.partner_upsert_reservation_settings(
  p_organization_id uuid, p_venue_id uuid, p_payload jsonb
) RETURNS public.reservation_settings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.reservation_settings;
BEGIN
  PERFORM public.assert_org_operation(p_organization_id, p_venue_id, true);

  INSERT INTO public.reservation_settings AS s (organization_id, venue_id)
  VALUES (p_organization_id, p_venue_id)
  ON CONFLICT (organization_id, venue_id) DO NOTHING;

  UPDATE public.reservation_settings SET
    reservations_enabled = COALESCE((p_payload->>'reservations_enabled')::boolean, reservations_enabled),
    max_people_per_reservation = COALESCE((p_payload->>'max_people_per_reservation')::int, max_people_per_reservation),
    max_reservations_per_day = COALESCE((p_payload->>'max_reservations_per_day')::int, max_reservations_per_day),
    advance_booking_hours = COALESCE((p_payload->>'advance_booking_hours')::int, advance_booking_hours),
    auto_confirm = COALESCE((p_payload->>'auto_confirm')::boolean, auto_confirm),
    confirmation_timeout_minutes = COALESCE((p_payload->>'confirmation_timeout_minutes')::int, confirmation_timeout_minutes),
    deposit_enabled = COALESCE((p_payload->>'deposit_enabled')::boolean, deposit_enabled),
    deposit_type = COALESCE((p_payload->>'deposit_type')::public.reservation_deposit_type, deposit_type),
    deposit_value = COALESCE((p_payload->>'deposit_value')::numeric, deposit_value),
    pix_key = COALESCE(p_payload->>'pix_key', pix_key),
    pix_receiver_name = COALESCE(p_payload->>'pix_receiver_name', pix_receiver_name),
    payment_instructions = COALESCE(p_payload->>'payment_instructions', payment_instructions),
    slot_interval_minutes = COALESCE((p_payload->>'slot_interval_minutes')::int, slot_interval_minutes),
    default_reservation_duration_minutes = COALESCE((p_payload->>'default_reservation_duration_minutes')::int, default_reservation_duration_minutes),
    daily_open_time = COALESCE((p_payload->>'daily_open_time')::time, daily_open_time),
    daily_close_time = COALESCE((p_payload->>'daily_close_time')::time, daily_close_time),
    reservations_start_at = COALESCE((p_payload->>'reservations_start_at')::timestamptz, reservations_start_at),
    reservations_end_at = COALESCE((p_payload->>'reservations_end_at')::timestamptz, reservations_end_at)
  WHERE organization_id = p_organization_id AND venue_id = p_venue_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.partner_upsert_reservation_type(
  p_organization_id uuid, p_venue_id uuid, p_payload jsonb
) RETURNS public.reservation_types
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.reservation_types; v_id uuid := NULLIF(p_payload->>'id','')::uuid;
BEGIN
  PERFORM public.assert_org_operation(p_organization_id, p_venue_id, true);

  IF v_id IS NULL THEN
    INSERT INTO public.reservation_types (
      organization_id, venue_id, kind, name, description, seats, quantity, price,
      minimum_consumption, extra_people_limit, extra_people_price, duration_minutes,
      requires_guest_count, active, sort_order
    ) VALUES (
      p_organization_id, p_venue_id,
      COALESCE((p_payload->>'kind')::public.reservation_type_kind, 'table'),
      trim(p_payload->>'name'), NULLIF(p_payload->>'description',''),
      COALESCE((p_payload->>'seats')::int, 1), COALESCE((p_payload->>'quantity')::int, 1),
      COALESCE((p_payload->>'price')::numeric, 0),
      (p_payload->>'minimum_consumption')::numeric,
      COALESCE((p_payload->>'extra_people_limit')::int, 0),
      (p_payload->>'extra_people_price')::numeric,
      (p_payload->>'duration_minutes')::int,
      COALESCE((p_payload->>'requires_guest_count')::boolean, false),
      COALESCE((p_payload->>'active')::boolean, true),
      COALESCE((p_payload->>'sort_order')::int, 0)
    ) RETURNING * INTO v_row;
  ELSE
    UPDATE public.reservation_types SET
      kind = COALESCE((p_payload->>'kind')::public.reservation_type_kind, kind),
      name = COALESCE(NULLIF(p_payload->>'name',''), name),
      description = COALESCE(p_payload->>'description', description),
      seats = COALESCE((p_payload->>'seats')::int, seats),
      quantity = COALESCE((p_payload->>'quantity')::int, quantity),
      price = COALESCE((p_payload->>'price')::numeric, price),
      minimum_consumption = COALESCE((p_payload->>'minimum_consumption')::numeric, minimum_consumption),
      extra_people_limit = COALESCE((p_payload->>'extra_people_limit')::int, extra_people_limit),
      extra_people_price = COALESCE((p_payload->>'extra_people_price')::numeric, extra_people_price),
      duration_minutes = COALESCE((p_payload->>'duration_minutes')::int, duration_minutes),
      requires_guest_count = COALESCE((p_payload->>'requires_guest_count')::boolean, requires_guest_count),
      active = COALESCE((p_payload->>'active')::boolean, active),
      sort_order = COALESCE((p_payload->>'sort_order')::int, sort_order)
    WHERE id = v_id AND organization_id = p_organization_id AND venue_id = p_venue_id
    RETURNING * INTO v_row;
    IF NOT FOUND THEN RAISE EXCEPTION 'Tipo não encontrado nesta organização.'; END IF;
  END IF;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.partner_reservation_types_availability(
  p_organization_id uuid, p_venue_id uuid
) RETURNS TABLE (type_id uuid, quantity int, reserved int, available int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_org_operation(p_organization_id, p_venue_id, false);
  RETURN QUERY
  SELECT t.id, t.quantity,
         COALESCE(r.used, 0)::int,
         GREATEST(t.quantity - COALESCE(r.used, 0), 0)::int
  FROM public.reservation_types t
  LEFT JOIN (
    SELECT reservation_type_id, COUNT(*)::int AS used
    FROM public.reservations
    WHERE organization_id = p_organization_id AND venue_id = p_venue_id
      AND status IN ('pending','pending_payment','confirmed')
    GROUP BY reservation_type_id
  ) r ON r.reservation_type_id = t.id
  WHERE t.organization_id = p_organization_id AND t.venue_id = p_venue_id AND t.active;
END;
$$;

CREATE OR REPLACE FUNCTION public.partner_reservation_slot_availability(
  p_organization_id uuid, p_venue_id uuid, p_reservation_type_id uuid, p_date date
) RETURNS TABLE (
  slot_start timestamptz, slot_end timestamptz,
  quantity_total int, reserved_count int, available_count int
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_settings public.reservation_settings;
  v_type public.reservation_types;
  v_step interval;
  v_open timestamptz;
  v_close timestamptz;
BEGIN
  PERFORM public.assert_org_operation(p_organization_id, p_venue_id, false);

  SELECT * INTO v_settings FROM public.reservation_settings
   WHERE organization_id = p_organization_id AND venue_id = p_venue_id;
  SELECT * INTO v_type FROM public.reservation_types
   WHERE id = p_reservation_type_id AND organization_id = p_organization_id;
  IF v_type IS NULL THEN RAISE EXCEPTION 'Tipo de reserva inválido.'; END IF;

  v_step := make_interval(mins => COALESCE(v_settings.slot_interval_minutes, 30));
  v_open := (p_date + COALESCE(v_settings.daily_open_time, '18:00'::time))
              AT TIME ZONE 'America/Sao_Paulo';
  v_close := v_open + interval '6 hours';

  RETURN QUERY
  SELECT s AS slot_start, s + v_step AS slot_end, v_type.quantity,
         COALESCE(c.used, 0)::int,
         GREATEST(v_type.quantity - COALESCE(c.used, 0), 0)::int
  FROM generate_series(v_open, v_close, v_step) s
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS used FROM public.reservations r
     WHERE r.organization_id = p_organization_id AND r.venue_id = p_venue_id
       AND r.reservation_type_id = p_reservation_type_id
       AND r.status IN ('pending','pending_payment','confirmed')
       AND r.reservation_date >= s AND r.reservation_date < s + v_step
  ) c ON true;
END;
$$;

CREATE OR REPLACE FUNCTION public.partner_notify_waitlist_entry(p_entry_id uuid)
RETURNS public.reservation_waitlist
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.reservation_waitlist;
BEGIN
  SELECT * INTO v_row FROM public.reservation_waitlist WHERE id = p_entry_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Entrada não encontrada.'; END IF;
  PERFORM public.assert_org_operation(v_row.organization_id, v_row.venue_id, true);

  UPDATE public.reservation_waitlist
    SET status = 'notified', notified_at = now(), expires_at = now() + interval '2 hours'
  WHERE id = p_entry_id RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.partner_cancel_waitlist_entry(p_entry_id uuid)
RETURNS public.reservation_waitlist
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.reservation_waitlist;
BEGIN
  SELECT * INTO v_row FROM public.reservation_waitlist WHERE id = p_entry_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Entrada não encontrada.'; END IF;
  PERFORM public.assert_org_operation(v_row.organization_id, v_row.venue_id, true);

  UPDATE public.reservation_waitlist SET status = 'cancelled'
  WHERE id = p_entry_id RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

-- ================================ VIP ================================

CREATE OR REPLACE FUNCTION public.partner_create_vip_list(
  p_organization_id uuid, p_venue_id uuid, p_payload jsonb
) RETURNS public.vip_lists
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.vip_lists;
BEGIN
  PERFORM public.assert_org_operation(p_organization_id, p_venue_id, true);

  INSERT INTO public.vip_lists (
    organization_id, venue_id, event_id, title, description, starts_at, ends_at,
    max_entries, max_entries_per_person, requires_approval,
    allow_multiple_people_per_entry, rules, closes_at, auto_close_enabled, status
  ) VALUES (
    p_organization_id, p_venue_id,
    NULLIF(p_payload->>'event_id','')::uuid,
    trim(p_payload->>'title'), NULLIF(p_payload->>'description',''),
    (p_payload->>'starts_at')::timestamptz, (p_payload->>'ends_at')::timestamptz,
    (p_payload->>'max_entries')::int,
    COALESCE((p_payload->>'max_entries_per_person')::int, 1),
    COALESCE((p_payload->>'requires_approval')::boolean, false),
    COALESCE((p_payload->>'allow_multiple_people_per_entry')::boolean, false),
    NULLIF(p_payload->>'rules',''),
    (p_payload->>'closes_at')::timestamptz,
    COALESCE((p_payload->>'auto_close_enabled')::boolean, true),
    'draft'
  ) RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.partner_update_vip_list(
  p_vip_list_id uuid, p_payload jsonb
) RETURNS public.vip_lists
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.vip_lists;
BEGIN
  SELECT * INTO v_row FROM public.vip_lists WHERE id = p_vip_list_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lista não encontrada.'; END IF;
  PERFORM public.assert_org_operation(v_row.organization_id, v_row.venue_id, true);

  UPDATE public.vip_lists SET
    title = COALESCE(NULLIF(p_payload->>'title',''), title),
    description = COALESCE(p_payload->>'description', description),
    event_id = COALESCE(NULLIF(p_payload->>'event_id','')::uuid, event_id),
    starts_at = COALESCE((p_payload->>'starts_at')::timestamptz, starts_at),
    ends_at = COALESCE((p_payload->>'ends_at')::timestamptz, ends_at),
    max_entries = COALESCE((p_payload->>'max_entries')::int, max_entries),
    max_entries_per_person = COALESCE((p_payload->>'max_entries_per_person')::int, max_entries_per_person),
    requires_approval = COALESCE((p_payload->>'requires_approval')::boolean, requires_approval),
    allow_multiple_people_per_entry = COALESCE((p_payload->>'allow_multiple_people_per_entry')::boolean, allow_multiple_people_per_entry),
    public_enabled = COALESCE((p_payload->>'public_enabled')::boolean, public_enabled),
    public_title = COALESCE(p_payload->>'public_title', public_title),
    public_description = COALESCE(p_payload->>'public_description', public_description),
    public_cover_url = COALESCE(p_payload->>'public_cover_url', public_cover_url),
    rules = COALESCE(p_payload->>'rules', rules),
    closes_at = COALESCE((p_payload->>'closes_at')::timestamptz, closes_at),
    auto_close_enabled = COALESCE((p_payload->>'auto_close_enabled')::boolean, auto_close_enabled)
  WHERE id = p_vip_list_id RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.partner_set_vip_list_state(
  p_vip_list_id uuid, p_state text, p_reason text DEFAULT NULL
) RETURNS public.vip_lists
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.vip_lists;
BEGIN
  IF p_state NOT IN ('open','closed','archived') THEN
    RAISE EXCEPTION 'Estado inválido.';
  END IF;
  SELECT * INTO v_row FROM public.vip_lists WHERE id = p_vip_list_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lista não encontrada.'; END IF;
  PERFORM public.assert_org_operation(v_row.organization_id, v_row.venue_id, true);

  UPDATE public.vip_lists
    SET status = p_state::public.vip_list_status,
        close_reason = CASE WHEN p_state = 'closed' THEN p_reason ELSE close_reason END
  WHERE id = p_vip_list_id RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.partner_add_vip_entry(
  p_vip_list_id uuid, p_payload jsonb
) RETURNS public.vip_list_entries
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_list public.vip_lists; v_row public.vip_list_entries;
        v_promoter public.promoter_profiles;
BEGIN
  SELECT * INTO v_list FROM public.vip_lists WHERE id = p_vip_list_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lista não encontrada.'; END IF;
  PERFORM public.assert_org_operation(v_list.organization_id, v_list.venue_id, false);

  IF NULLIF(p_payload->>'promoter_profile_id','') IS NOT NULL THEN
    SELECT * INTO v_promoter FROM public.promoter_profiles
     WHERE id = (p_payload->>'promoter_profile_id')::uuid
       AND organization_id = v_list.organization_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Promoter não pertence à organização.'; END IF;
  END IF;

  INSERT INTO public.vip_list_entries (
    vip_list_id, organization_id, venue_id, event_id,
    promoter_profile_id, promoter_name_snapshot,
    name, phone, email, people_count, status, source
  ) VALUES (
    p_vip_list_id, v_list.organization_id, v_list.venue_id, v_list.event_id,
    v_promoter.id, v_promoter.name,
    trim(p_payload->>'name'), NULLIF(p_payload->>'phone',''), NULLIF(p_payload->>'email',''),
    COALESCE((p_payload->>'people_count')::int, 1),
    CASE WHEN v_list.requires_approval THEN 'pending' ELSE 'approved' END,
    'manual'
  ) RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.partner_update_vip_entry(
  p_entry_id uuid, p_payload jsonb
) RETURNS public.vip_list_entries
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.vip_list_entries;
BEGIN
  SELECT * INTO v_row FROM public.vip_list_entries WHERE id = p_entry_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Entrada não encontrada.'; END IF;
  PERFORM public.assert_org_operation(v_row.organization_id, v_row.venue_id, true);

  UPDATE public.vip_list_entries SET
    name = COALESCE(NULLIF(p_payload->>'name',''), name),
    phone = COALESCE(p_payload->>'phone', phone),
    email = COALESCE(p_payload->>'email', email),
    people_count = COALESCE((p_payload->>'people_count')::int, people_count)
  WHERE id = p_entry_id RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

-- Mudança de status. check_in é permitido a qualquer membro (inclui validator).
CREATE OR REPLACE FUNCTION public.partner_set_vip_entry_status(
  p_entry_id uuid, p_status public.vip_entry_status
) RETURNS public.vip_list_entries
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.vip_list_entries;
BEGIN
  SELECT * INTO v_row FROM public.vip_list_entries WHERE id = p_entry_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Entrada não encontrada.'; END IF;
  PERFORM public.assert_org_operation(
    v_row.organization_id, v_row.venue_id,
    p_status NOT IN ('checked_in','no_show')
  );

  UPDATE public.vip_list_entries SET
    status = p_status,
    checked_in_at = CASE WHEN p_status = 'checked_in' THEN COALESCE(checked_in_at, now()) ELSE checked_in_at END,
    checked_in_by = CASE WHEN p_status = 'checked_in' THEN COALESCE(checked_in_by, auth.uid()) ELSE checked_in_by END
  WHERE id = p_entry_id RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

-- ============================ VALIDADOR ==============================

CREATE OR REPLACE FUNCTION public.partner_resolve_validation_token(
  p_organization_id uuid, p_venue_id uuid, p_token text
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_entry public.vip_list_entries; v_res public.reservations;
BEGIN
  PERFORM public.assert_org_operation(p_organization_id, p_venue_id, false);

  SELECT * INTO v_entry FROM public.vip_list_entries
   WHERE public_token = p_token
     AND organization_id = p_organization_id AND venue_id = p_venue_id;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true, 'kind', 'vip_entry', 'display_name', v_entry.name,
      'people_count', v_entry.people_count, 'status', v_entry.status,
      'checked_in_at', v_entry.checked_in_at, 'message', 'Convidado encontrado.');
  END IF;

  SELECT * INTO v_res FROM public.reservations
   WHERE public_token = p_token
     AND organization_id = p_organization_id AND venue_id = p_venue_id;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', true, 'kind', 'reservation', 'display_name', v_res.name,
      'people_count', v_res.people_count, 'status', v_res.status,
      'checked_in_at', v_res.checked_in_at, 'message', 'Reserva encontrada.');
  END IF;

  RETURN jsonb_build_object('ok', false, 'kind', null, 'display_name', null,
    'people_count', null, 'status', null, 'checked_in_at', null,
    'message', 'Código não encontrado nesta operação.');
END;
$$;

CREATE OR REPLACE FUNCTION public.partner_validate_check_in(
  p_organization_id uuid, p_venue_id uuid, p_token text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_entry public.vip_list_entries; v_res public.reservations;
BEGIN
  PERFORM public.assert_org_operation(p_organization_id, p_venue_id, false);

  UPDATE public.vip_list_entries
     SET status = 'checked_in',
         checked_in_at = COALESCE(checked_in_at, now()),
         checked_in_by = COALESCE(checked_in_by, auth.uid())
   WHERE public_token = p_token
     AND organization_id = p_organization_id AND venue_id = p_venue_id
     AND status IN ('pending','approved','checked_in')
  RETURNING * INTO v_entry;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'kind', 'vip_entry',
      'display_name', v_entry.name, 'people_count', v_entry.people_count,
      'status', v_entry.status, 'checked_in_at', v_entry.checked_in_at,
      'message', 'Check-in confirmado.');
  END IF;

  UPDATE public.reservations
     SET checked_in_at = COALESCE(checked_in_at, now()),
         checked_in_by = COALESCE(checked_in_by, auth.uid())
   WHERE public_token = p_token
     AND organization_id = p_organization_id AND venue_id = p_venue_id
     AND status IN ('pending','pending_payment','confirmed','completed')
  RETURNING * INTO v_res;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'kind', 'reservation',
      'display_name', v_res.name, 'people_count', v_res.people_count,
      'status', v_res.status, 'checked_in_at', v_res.checked_in_at,
      'message', 'Check-in confirmado.');
  END IF;

  RETURN jsonb_build_object('ok', false, 'kind', null, 'display_name', null,
    'people_count', null, 'status', null, 'checked_in_at', null,
    'message', 'Código inválido ou fora desta operação.');
END;
$$;

CREATE OR REPLACE FUNCTION public.partner_undo_check_in(p_kind text, p_record_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_entry public.vip_list_entries; v_res public.reservations;
BEGIN
  IF p_kind = 'vip_entry' THEN
    SELECT * INTO v_entry FROM public.vip_list_entries WHERE id = p_record_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Registro não encontrado.'; END IF;
    PERFORM public.assert_org_operation(v_entry.organization_id, v_entry.venue_id, false);
    UPDATE public.vip_list_entries
       SET status = 'approved', checked_in_at = NULL, checked_in_by = NULL
     WHERE id = p_record_id RETURNING * INTO v_entry;
    RETURN jsonb_build_object('ok', true, 'kind', 'vip_entry',
      'display_name', v_entry.name, 'people_count', v_entry.people_count,
      'status', v_entry.status, 'checked_in_at', NULL, 'message', 'Check-in desfeito.');
  ELSIF p_kind = 'reservation' THEN
    SELECT * INTO v_res FROM public.reservations WHERE id = p_record_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Registro não encontrado.'; END IF;
    PERFORM public.assert_org_operation(v_res.organization_id, v_res.venue_id, false);
    UPDATE public.reservations
       SET checked_in_at = NULL, checked_in_by = NULL, status = 'confirmed'
     WHERE id = p_record_id RETURNING * INTO v_res;
    RETURN jsonb_build_object('ok', true, 'kind', 'reservation',
      'display_name', v_res.name, 'people_count', v_res.people_count,
      'status', v_res.status, 'checked_in_at', NULL, 'message', 'Check-in desfeito.');
  END IF;
  RAISE EXCEPTION 'Tipo inválido.';
END;
$$;

-- ============================ PROMOTORES =============================

CREATE OR REPLACE FUNCTION public.partner_upsert_promoter_profile(
  p_organization_id uuid, p_promoter_id uuid, p_payload jsonb
) RETURNS public.promoter_profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.promoter_profiles; v_member public.organization_members;
BEGIN
  PERFORM public.assert_org_operation(p_organization_id, NULL, true);

  IF NULLIF(p_payload->>'organization_member_id','') IS NOT NULL THEN
    SELECT * INTO v_member FROM public.organization_members
     WHERE id = (p_payload->>'organization_member_id')::uuid
       AND organization_id = p_organization_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Membro não pertence à organização.'; END IF;
  END IF;

  IF p_promoter_id IS NULL THEN
    INSERT INTO public.promoter_profiles (
      organization_id, user_id, organization_member_id, name, phone, instagram, slug, is_active
    ) VALUES (
      p_organization_id, v_member.user_id, v_member.id,
      trim(p_payload->>'name'), NULLIF(p_payload->>'phone',''),
      NULLIF(p_payload->>'instagram',''),
      COALESCE(NULLIF(p_payload->>'slug',''), encode(gen_random_bytes(6),'hex')),
      COALESCE((p_payload->>'is_active')::boolean, true)
    ) RETURNING * INTO v_row;
  ELSE
    UPDATE public.promoter_profiles SET
      name = COALESCE(NULLIF(p_payload->>'name',''), name),
      phone = COALESCE(p_payload->>'phone', phone),
      instagram = COALESCE(p_payload->>'instagram', instagram),
      slug = COALESCE(NULLIF(p_payload->>'slug',''), slug),
      organization_member_id = COALESCE(v_member.id, organization_member_id),
      user_id = COALESCE(v_member.user_id, user_id),
      is_active = COALESCE((p_payload->>'is_active')::boolean, is_active)
    WHERE id = p_promoter_id AND organization_id = p_organization_id
    RETURNING * INTO v_row;
    IF NOT FOUND THEN RAISE EXCEPTION 'Promoter não encontrado nesta organização.'; END IF;
  END IF;

  RETURN v_row;
END;
$$;

-- Métricas agregadas: nunca retorna PII de convidados.
CREATE OR REPLACE FUNCTION public.partner_promoter_metrics(
  p_organization_id uuid, p_promoter_profile_id uuid DEFAULT NULL, p_vip_list_id uuid DEFAULT NULL
) RETURNS TABLE (
  promoter_profile_id uuid, entries_total int, entries_checked_in int, people_total int
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_self uuid;
BEGIN
  PERFORM public.assert_org_operation(p_organization_id, NULL, false);

  -- Promoter só vê o próprio escopo.
  SELECT p.id INTO v_self FROM public.promoter_profiles p
   WHERE p.organization_id = p_organization_id AND p.user_id = auth.uid();
  IF v_self IS NOT NULL AND NOT public.is_org_manager_or_owner(p_organization_id) THEN
    p_promoter_profile_id := v_self;
  END IF;

  RETURN QUERY
  SELECT e.promoter_profile_id,
         COUNT(*)::int,
         COUNT(*) FILTER (WHERE e.status = 'checked_in')::int,
         COALESCE(SUM(e.people_count), 0)::int
  FROM public.vip_list_entries e
  WHERE e.organization_id = p_organization_id
    AND e.promoter_profile_id IS NOT NULL
    AND (p_promoter_profile_id IS NULL OR e.promoter_profile_id = p_promoter_profile_id)
    AND (p_vip_list_id IS NULL OR e.vip_list_id = p_vip_list_id)
  GROUP BY e.promoter_profile_id;
END;
$$;

-- ======================== SUPERFÍCIE PÚBLICA =========================
-- Sem listagem. Sempre token forte ou slug + validação de estado.

CREATE OR REPLACE FUNCTION public.public_get_vip_list_by_slug(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.vip_lists; v_used int;
BEGIN
  SELECT * INTO v FROM public.vip_lists
   WHERE public_slug = p_slug AND public_enabled AND status = 'open';
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT COUNT(*)::int INTO v_used FROM public.vip_list_entries
   WHERE vip_list_id = v.id AND status <> 'cancelled';

  RETURN jsonb_build_object(
    'title', COALESCE(v.public_title, v.title),
    'description', COALESCE(v.public_description, v.description),
    'cover_url', v.public_cover_url,
    'rules', v.rules,
    'starts_at', v.starts_at, 'ends_at', v.ends_at,
    'allow_multiple_people_per_entry', v.allow_multiple_people_per_entry,
    'is_full', v.max_entries IS NOT NULL AND v_used >= v.max_entries
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.public_submit_vip_entry(p_slug text, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.vip_lists; v_row public.vip_list_entries;
        v_promoter public.promoter_profiles; v_used int; v_phone text;
BEGIN
  SELECT * INTO v FROM public.vip_lists
   WHERE public_slug = p_slug AND public_enabled AND status = 'open';
  IF NOT FOUND THEN RAISE EXCEPTION 'Lista indisponível.'; END IF;

  v_phone := regexp_replace(COALESCE(p_payload->>'phone',''), '\D', '', 'g');
  IF length(v_phone) < 10 THEN RAISE EXCEPTION 'Telefone inválido.'; END IF;
  IF length(trim(COALESCE(p_payload->>'name',''))) < 2 THEN
    RAISE EXCEPTION 'Nome inválido.';
  END IF;

  SELECT COUNT(*)::int INTO v_used FROM public.vip_list_entries
   WHERE vip_list_id = v.id AND status <> 'cancelled';
  IF v.max_entries IS NOT NULL AND v_used >= v.max_entries THEN
    RAISE EXCEPTION 'Lista esgotada.';
  END IF;

  -- Limite por pessoa (anti-flood básico; rate limiting fica no backend/edge).
  IF (SELECT COUNT(*) FROM public.vip_list_entries
        WHERE vip_list_id = v.id AND normalized_phone = v_phone
          AND status <> 'cancelled') >= v.max_entries_per_person THEN
    RAISE EXCEPTION 'Limite de inscrições atingido para este telefone.';
  END IF;

  IF NULLIF(p_payload->>'promoter_slug','') IS NOT NULL THEN
    SELECT * INTO v_promoter FROM public.promoter_profiles
     WHERE organization_id = v.organization_id
       AND slug = p_payload->>'promoter_slug' AND is_active;
  END IF;

  INSERT INTO public.vip_list_entries (
    vip_list_id, organization_id, venue_id, event_id,
    promoter_profile_id, promoter_name_snapshot,
    name, phone, normalized_phone, email, people_count, status, source,
    public_submitted_at, marketing_consent, whatsapp_consent, email_consent
  ) VALUES (
    v.id, v.organization_id, v.venue_id, v.event_id,
    v_promoter.id, v_promoter.name,
    trim(p_payload->>'name'), p_payload->>'phone', v_phone,
    NULLIF(p_payload->>'email',''),
    LEAST(GREATEST(COALESCE((p_payload->>'people_count')::int, 1), 1), 10),
    CASE WHEN v.requires_approval THEN 'pending' ELSE 'approved' END,
    'public', now(),
    COALESCE((p_payload->>'marketing_consent')::boolean, false),
    COALESCE((p_payload->>'whatsapp_consent')::boolean, false),
    COALESCE((p_payload->>'email_consent')::boolean, false)
  ) RETURNING * INTO v_row;

  RETURN jsonb_build_object('public_token', v_row.public_token, 'status', v_row.status);
END;
$$;

CREATE OR REPLACE FUNCTION public.public_get_vip_entry_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.vip_list_entries; v_list public.vip_lists;
BEGIN
  IF length(COALESCE(p_token,'')) < 16 THEN RETURN NULL; END IF;
  SELECT * INTO v FROM public.vip_list_entries WHERE public_token = p_token;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO v_list FROM public.vip_lists WHERE id = v.vip_list_id;

  RETURN jsonb_build_object(
    'name', v.name, 'people_count', v.people_count, 'status', v.status,
    'checked_in_at', v.checked_in_at, 'qr_code_payload', v.qr_code_payload,
    'list_title', COALESCE(v_list.public_title, v_list.title),
    'starts_at', v_list.starts_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.public_get_reservation_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.reservations;
BEGIN
  IF length(COALESCE(p_token,'')) < 16 THEN RETURN NULL; END IF;
  SELECT * INTO v FROM public.reservations WHERE public_token = p_token;
  IF NOT FOUND THEN RETURN NULL; END IF;

  RETURN jsonb_build_object(
    'name', v.name, 'people_count', v.people_count, 'status', v.status,
    'reservation_date', v.reservation_date, 'code', v.code,
    'payment_status', v.payment_status, 'total_price', v.total_price,
    'deposit_amount', v.deposit_amount, 'remaining_amount', v.remaining_amount,
    'checked_in_at', v.checked_in_at
  );
END;
$$;

-- ------------------------------ GRANTS ------------------------------
REVOKE ALL ON FUNCTION public.partner_create_reservation(uuid, uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.partner_update_reservation(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.partner_set_reservation_status(uuid, public.reservation_status) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.partner_check_in_reservation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.partner_confirm_reservation_payment(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.partner_release_reservation_table(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.partner_upsert_reservation_settings(uuid, uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.partner_upsert_reservation_type(uuid, uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.partner_reservation_types_availability(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.partner_reservation_slot_availability(uuid, uuid, uuid, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.partner_notify_waitlist_entry(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.partner_cancel_waitlist_entry(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.partner_create_vip_list(uuid, uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.partner_update_vip_list(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.partner_set_vip_list_state(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.partner_add_vip_entry(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.partner_update_vip_entry(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.partner_set_vip_entry_status(uuid, public.vip_entry_status) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.partner_resolve_validation_token(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.partner_validate_check_in(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.partner_undo_check_in(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.partner_upsert_promoter_profile(uuid, uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.partner_promoter_metrics(uuid, uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.partner_create_reservation(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_update_reservation(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_set_reservation_status(uuid, public.reservation_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_check_in_reservation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_confirm_reservation_payment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_release_reservation_table(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_upsert_reservation_settings(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_upsert_reservation_type(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_reservation_types_availability(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_reservation_slot_availability(uuid, uuid, uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_notify_waitlist_entry(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_cancel_waitlist_entry(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_create_vip_list(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_update_vip_list(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_set_vip_list_state(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_add_vip_entry(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_update_vip_entry(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_set_vip_entry_status(uuid, public.vip_entry_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_resolve_validation_token(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_validate_check_in(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_undo_check_in(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_upsert_promoter_profile(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_promoter_metrics(uuid, uuid, uuid) TO authenticated;

-- Superfície pública (anon + authenticated), sempre com token/slug.
REVOKE ALL ON FUNCTION public.public_get_vip_list_by_slug(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_submit_vip_entry(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_get_vip_entry_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_get_reservation_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_get_vip_list_by_slug(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_submit_vip_entry(text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_get_vip_entry_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_get_reservation_by_token(text) TO anon, authenticated;
