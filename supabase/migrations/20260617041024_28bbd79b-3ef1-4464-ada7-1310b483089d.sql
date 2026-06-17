
CREATE OR REPLACE FUNCTION public.upsert_partner_reservation_settings(_partner_id uuid, _payload jsonb)
RETURNS partner_reservation_settings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.partner_reservation_settings;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  IF _partner_id IS NULL THEN RAISE EXCEPTION 'partner_id required'; END IF;
  IF NOT (public.is_admin() OR public.is_partner_owner_or_admin(_uid, _partner_id)) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501';
  END IF;
  IF _payload IS NULL OR jsonb_typeof(_payload) <> 'object' THEN
    RAISE EXCEPTION 'payload must be a JSON object';
  END IF;

  INSERT INTO public.partner_reservation_settings (
    partner_id, reservations_enabled, max_people_per_reservation,
    max_reservations_per_day, advance_booking_hours, auto_confirm,
    reservations_start_at, reservations_end_at, confirmation_timeout_minutes
  ) VALUES (
    _partner_id,
    COALESCE((_payload->>'reservations_enabled')::boolean, false),
    COALESCE(NULLIF(_payload->>'max_people_per_reservation','')::int, 10),
    COALESCE(NULLIF(_payload->>'max_reservations_per_day','')::int, 50),
    COALESCE(NULLIF(_payload->>'advance_booking_hours','')::int, 2),
    COALESCE((_payload->>'auto_confirm')::boolean, false),
    NULLIF(_payload->>'reservations_start_at','')::timestamptz,
    NULLIF(_payload->>'reservations_end_at','')::timestamptz,
    COALESCE(NULLIF(_payload->>'confirmation_timeout_minutes','')::int, 30)
  )
  ON CONFLICT (partner_id) DO UPDATE SET
    reservations_enabled       = CASE WHEN _payload ? 'reservations_enabled'       THEN (_payload->>'reservations_enabled')::boolean ELSE public.partner_reservation_settings.reservations_enabled END,
    max_people_per_reservation = CASE WHEN _payload ? 'max_people_per_reservation' THEN (_payload->>'max_people_per_reservation')::int ELSE public.partner_reservation_settings.max_people_per_reservation END,
    max_reservations_per_day   = CASE WHEN _payload ? 'max_reservations_per_day'   THEN (_payload->>'max_reservations_per_day')::int ELSE public.partner_reservation_settings.max_reservations_per_day END,
    advance_booking_hours      = CASE WHEN _payload ? 'advance_booking_hours'      THEN (_payload->>'advance_booking_hours')::int ELSE public.partner_reservation_settings.advance_booking_hours END,
    auto_confirm               = CASE WHEN _payload ? 'auto_confirm'               THEN (_payload->>'auto_confirm')::boolean ELSE public.partner_reservation_settings.auto_confirm END,
    reservations_start_at      = CASE WHEN _payload ? 'reservations_start_at'      THEN NULLIF(_payload->>'reservations_start_at','')::timestamptz ELSE public.partner_reservation_settings.reservations_start_at END,
    reservations_end_at        = CASE WHEN _payload ? 'reservations_end_at'        THEN NULLIF(_payload->>'reservations_end_at','')::timestamptz ELSE public.partner_reservation_settings.reservations_end_at END,
    confirmation_timeout_minutes = CASE WHEN _payload ? 'confirmation_timeout_minutes' THEN COALESCE(NULLIF(_payload->>'confirmation_timeout_minutes','')::int, 30) ELSE public.partner_reservation_settings.confirmation_timeout_minutes END,
    updated_at = now()
  RETURNING * INTO _row;

  RETURN _row;
END $$;
