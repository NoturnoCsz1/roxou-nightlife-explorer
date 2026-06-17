
CREATE OR REPLACE FUNCTION public.get_public_reservation(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _row public.partner_reservations;
  _partner public.partners;
  _type public.partner_reservation_types;
  _settings public.partner_reservation_settings;
BEGIN
  SELECT * INTO _row FROM public.partner_reservations WHERE public_token = p_token;
  IF _row.id IS NULL THEN RETURN NULL; END IF;
  IF _row.status = 'pending_payment' AND _row.expires_at IS NOT NULL AND now() > _row.expires_at THEN
    UPDATE public.partner_reservations SET status='expired', updated_at=now() WHERE id=_row.id RETURNING * INTO _row;
  END IF;
  SELECT * INTO _partner FROM public.partners WHERE id = _row.partner_id;
  SELECT * INTO _settings FROM public.partner_reservation_settings WHERE partner_id = _row.partner_id;
  IF _row.reservation_type_id IS NOT NULL THEN
    SELECT * INTO _type FROM public.partner_reservation_types WHERE id = _row.reservation_type_id;
  END IF;
  RETURN jsonb_build_object(
    'id', _row.id,
    'public_token', _row.public_token,
    'code', _row.code,
    'status', _row.status,
    'expires_at', _row.expires_at,
    'name', _row.name,
    'phone', _row.phone,
    'people_count', _row.people_count,
    'reservation_date', _row.reservation_date,
    'notes', _row.notes,
    'total_price', _row.total_price,
    'deposit_amount', _row.deposit_amount,
    'remaining_amount', _row.remaining_amount,
    'payment_status', _row.payment_status,
    'payment_method', _row.payment_method,
    'checked_in_at', _row.checked_in_at,
    'qr_payload', 'roxou://checkin?type=reservation&id=' || _row.id::text,
    'partner_id', _partner.id,
    'partner_name', _partner.name,
    'partner_slug', _partner.slug,
    'partner_logo_url', _partner.logo_url,
    'partner_city', _partner.city,
    'partner_address', _partner.address,
    'partner_phone', _partner.phone,
    'type_kind', _type.kind,
    'type_name', _type.name,
    'type_seats', _type.seats,
    'deposit_enabled', COALESCE(_settings.deposit_enabled, false),
    'pix_key', _settings.pix_key,
    'pix_receiver_name', _settings.pix_receiver_name,
    'payment_instructions', _settings.payment_instructions
  );
END $$;
