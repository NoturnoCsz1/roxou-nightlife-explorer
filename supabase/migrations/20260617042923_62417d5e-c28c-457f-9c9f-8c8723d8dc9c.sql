
-- =========================================================
-- 1. partner_reservation_settings: campos de pagamento/sinal
-- =========================================================
ALTER TABLE public.partner_reservation_settings
  ADD COLUMN IF NOT EXISTS deposit_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_type text NOT NULL DEFAULT 'fixed'
    CHECK (deposit_type IN ('fixed','percent','full')),
  ADD COLUMN IF NOT EXISTS deposit_value numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_instructions text,
  ADD COLUMN IF NOT EXISTS pix_key text,
  ADD COLUMN IF NOT EXISTS pix_receiver_name text;

-- =========================================================
-- 2. partner_reservations: campos de pagamento
-- =========================================================
ALTER TABLE public.partner_reservations
  ADD COLUMN IF NOT EXISTS deposit_amount numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending','paid','waived','refunded'));

-- =========================================================
-- 3. partner_reservation_waitlist
-- =========================================================
CREATE TABLE IF NOT EXISTS public.partner_reservation_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  reservation_type_id uuid NOT NULL REFERENCES public.partner_reservation_types(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  guests_count integer NOT NULL DEFAULT 1,
  notes text,
  status text NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting','notified','accepted','expired','cancelled')),
  notified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_partner_status
  ON public.partner_reservation_waitlist(partner_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_waitlist_type
  ON public.partner_reservation_waitlist(reservation_type_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_reservation_waitlist TO authenticated;
GRANT ALL ON public.partner_reservation_waitlist TO service_role;

ALTER TABLE public.partner_reservation_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Partner team manages waitlist" ON public.partner_reservation_waitlist;
CREATE POLICY "Partner team manages waitlist"
  ON public.partner_reservation_waitlist FOR ALL
  USING (public.is_admin() OR public.is_partner_editor_or_above(auth.uid(), partner_id))
  WITH CHECK (public.is_admin() OR public.is_partner_editor_or_above(auth.uid(), partner_id));

DROP TRIGGER IF EXISTS trg_waitlist_updated ON public.partner_reservation_waitlist;
CREATE TRIGGER trg_waitlist_updated
  BEFORE UPDATE ON public.partner_reservation_waitlist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 4. upsert_partner_reservation_settings: aceita novos campos
-- =========================================================
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
    reservations_start_at, reservations_end_at, confirmation_timeout_minutes,
    deposit_enabled, deposit_type, deposit_value, payment_instructions,
    pix_key, pix_receiver_name
  ) VALUES (
    _partner_id,
    COALESCE((_payload->>'reservations_enabled')::boolean, false),
    COALESCE(NULLIF(_payload->>'max_people_per_reservation','')::int, 10),
    COALESCE(NULLIF(_payload->>'max_reservations_per_day','')::int, 50),
    COALESCE(NULLIF(_payload->>'advance_booking_hours','')::int, 2),
    COALESCE((_payload->>'auto_confirm')::boolean, false),
    NULLIF(_payload->>'reservations_start_at','')::timestamptz,
    NULLIF(_payload->>'reservations_end_at','')::timestamptz,
    COALESCE(NULLIF(_payload->>'confirmation_timeout_minutes','')::int, 30),
    COALESCE((_payload->>'deposit_enabled')::boolean, false),
    COALESCE(NULLIF(_payload->>'deposit_type',''), 'fixed'),
    COALESCE(NULLIF(_payload->>'deposit_value','')::numeric, 0),
    NULLIF(_payload->>'payment_instructions',''),
    NULLIF(_payload->>'pix_key',''),
    NULLIF(_payload->>'pix_receiver_name','')
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
    deposit_enabled            = CASE WHEN _payload ? 'deposit_enabled'            THEN (_payload->>'deposit_enabled')::boolean ELSE public.partner_reservation_settings.deposit_enabled END,
    deposit_type               = CASE WHEN _payload ? 'deposit_type'               THEN COALESCE(NULLIF(_payload->>'deposit_type',''),'fixed') ELSE public.partner_reservation_settings.deposit_type END,
    deposit_value              = CASE WHEN _payload ? 'deposit_value'              THEN COALESCE(NULLIF(_payload->>'deposit_value','')::numeric, 0) ELSE public.partner_reservation_settings.deposit_value END,
    payment_instructions       = CASE WHEN _payload ? 'payment_instructions'       THEN NULLIF(_payload->>'payment_instructions','') ELSE public.partner_reservation_settings.payment_instructions END,
    pix_key                    = CASE WHEN _payload ? 'pix_key'                    THEN NULLIF(_payload->>'pix_key','') ELSE public.partner_reservation_settings.pix_key END,
    pix_receiver_name          = CASE WHEN _payload ? 'pix_receiver_name'          THEN NULLIF(_payload->>'pix_receiver_name','') ELSE public.partner_reservation_settings.pix_receiver_name END,
    updated_at = now()
  RETURNING * INTO _row;

  RETURN _row;
END $$;

-- =========================================================
-- 5. submit_public_reservation: calcula sinal/restante
-- =========================================================
CREATE OR REPLACE FUNCTION public.submit_public_reservation(
  p_partner_slug text,
  p_type_id uuid,
  p_name text,
  p_phone text,
  p_email text,
  p_guests integer,
  p_reservation_date timestamptz,
  p_notes text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _partner public.partners;
  _settings public.partner_reservation_settings;
  _type public.partner_reservation_types;
  _phone_clean text;
  _today_count int;
  _reserved int;
  _status text;
  _expires timestamptz;
  _row public.partner_reservations;
  _code text;
  _price numeric := 0;
  _deposit numeric := 0;
  _remaining numeric := 0;
BEGIN
  IF p_partner_slug IS NULL OR length(btrim(p_partner_slug))=0 THEN
    RAISE EXCEPTION 'Estabelecimento inválido';
  END IF;
  IF p_name IS NULL OR length(btrim(p_name))=0 THEN
    RAISE EXCEPTION 'Nome é obrigatório';
  END IF;
  _phone_clean := regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
  IF length(_phone_clean) < 10 THEN
    RAISE EXCEPTION 'Telefone inválido';
  END IF;
  IF p_guests IS NULL OR p_guests < 1 THEN
    RAISE EXCEPTION 'Quantidade de pessoas inválida';
  END IF;
  IF p_reservation_date IS NULL THEN
    RAISE EXCEPTION 'Informe data e horário';
  END IF;

  SELECT * INTO _partner FROM public.partners WHERE slug = lower(btrim(p_partner_slug)) LIMIT 1;
  IF _partner.id IS NULL THEN RAISE EXCEPTION 'Estabelecimento não encontrado'; END IF;

  SELECT * INTO _settings FROM public.partner_reservation_settings WHERE partner_id = _partner.id;
  IF _settings.id IS NULL OR NOT _settings.reservations_enabled THEN
    RAISE EXCEPTION 'Este estabelecimento não está aceitando reservas';
  END IF;

  IF _settings.reservations_start_at IS NOT NULL AND now() < _settings.reservations_start_at THEN
    RAISE EXCEPTION 'As reservas ainda não estão abertas';
  END IF;
  IF _settings.reservations_end_at IS NOT NULL AND now() > _settings.reservations_end_at THEN
    RAISE EXCEPTION 'O período de reservas foi encerrado';
  END IF;
  IF _settings.advance_booking_hours IS NOT NULL AND p_reservation_date < (now() + (_settings.advance_booking_hours || ' hours')::interval) THEN
    RAISE EXCEPTION 'Reserva com antecedência mínima de % horas', _settings.advance_booking_hours;
  END IF;
  IF p_guests > _settings.max_people_per_reservation THEN
    RAISE EXCEPTION 'Máximo de % pessoas por reserva', _settings.max_people_per_reservation;
  END IF;

  SELECT count(*) INTO _today_count FROM public.partner_reservations
    WHERE partner_id = _partner.id
      AND date_trunc('day', reservation_date AT TIME ZONE 'America/Sao_Paulo') = date_trunc('day', p_reservation_date AT TIME ZONE 'America/Sao_Paulo')
      AND status NOT IN ('cancelled','expired','no_show');
  IF _today_count >= _settings.max_reservations_per_day THEN
    RAISE EXCEPTION 'Limite diário de reservas atingido para esta data';
  END IF;

  IF p_type_id IS NOT NULL THEN
    SELECT * INTO _type FROM public.partner_reservation_types
      WHERE id = p_type_id AND partner_id = _partner.id AND active = true
      FOR UPDATE;
    IF _type.id IS NULL THEN RAISE EXCEPTION 'Tipo de reserva indisponível'; END IF;

    SELECT count(*)::int INTO _reserved
      FROM public.partner_reservations
     WHERE reservation_type_id = _type.id
       AND status IN ('pending_payment','confirmed');

    IF _reserved >= _type.quantity THEN
      RAISE EXCEPTION 'Esgotado: não há mais % disponível', _type.name;
    END IF;

    _price := COALESCE(_type.price, 0);
  END IF;

  -- Cálculo de sinal
  IF _settings.deposit_enabled THEN
    IF _settings.deposit_type = 'percent' THEN
      _deposit := ROUND(_price * COALESCE(_settings.deposit_value,0) / 100.0, 2);
    ELSIF _settings.deposit_type = 'full' THEN
      _deposit := _price;
    ELSE
      _deposit := COALESCE(_settings.deposit_value, 0);
    END IF;
    IF _deposit > _price THEN _deposit := _price; END IF;
  END IF;
  _remaining := GREATEST(_price - _deposit, 0);

  IF _settings.auto_confirm THEN
    _status := 'confirmed';
    _expires := NULL;
  ELSE
    _status := 'pending_payment';
    _expires := now() + (COALESCE(_settings.confirmation_timeout_minutes,30) || ' minutes')::interval;
  END IF;

  _code := public._reservation_short_code();

  INSERT INTO public.partner_reservations(
    partner_id, name, phone, email, people_count, reservation_date, notes,
    status, reservation_type_id, total_price, expires_at, code,
    deposit_amount, remaining_amount, payment_status
  ) VALUES (
    _partner.id, btrim(p_name), _phone_clean, NULLIF(lower(btrim(coalesce(p_email,''))),''),
    p_guests, p_reservation_date, NULLIF(btrim(coalesce(p_notes,'')),''),
    _status, _type.id, _price, _expires, _code,
    _deposit, _remaining, CASE WHEN _status='confirmed' THEN 'paid' ELSE 'pending' END
  ) RETURNING * INTO _row;

  RETURN jsonb_build_object(
    'id', _row.id,
    'public_token', _row.public_token,
    'code', _row.code,
    'status', _row.status,
    'expires_at', _row.expires_at,
    'qr_payload', 'roxou://checkin?type=reservation&id=' || _row.id::text,
    'partner_name', _partner.name,
    'partner_slug', _partner.slug
  );
END $$;

-- =========================================================
-- 6. confirm_partner_reservation_payment: marca pago
-- =========================================================
CREATE OR REPLACE FUNCTION public.confirm_partner_reservation_payment(_reservation_id uuid)
RETURNS partner_reservations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.partner_reservations;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  SELECT * INTO _row FROM public.partner_reservations WHERE id = _reservation_id;
  IF _row.id IS NULL THEN RAISE EXCEPTION 'Reserva não encontrada'; END IF;
  IF NOT (public.is_admin() OR public.is_partner_editor_or_above(_uid, _row.partner_id)) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501';
  END IF;

  UPDATE public.partner_reservations
     SET status = 'confirmed',
         payment_status = 'paid',
         payment_confirmed_at = now(),
         updated_at = now()
   WHERE id = _reservation_id
   RETURNING * INTO _row;
  RETURN _row;
END $$;
REVOKE ALL ON FUNCTION public.confirm_partner_reservation_payment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_partner_reservation_payment(uuid) TO authenticated, service_role;

-- =========================================================
-- 7. waive_partner_reservation_deposit: dispensa sinal
-- =========================================================
CREATE OR REPLACE FUNCTION public.waive_partner_reservation_deposit(_reservation_id uuid)
RETURNS partner_reservations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.partner_reservations;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  SELECT * INTO _row FROM public.partner_reservations WHERE id = _reservation_id;
  IF _row.id IS NULL THEN RAISE EXCEPTION 'Reserva não encontrada'; END IF;
  IF NOT (public.is_admin() OR public.is_partner_editor_or_above(_uid, _row.partner_id)) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501';
  END IF;

  UPDATE public.partner_reservations
     SET payment_status = 'waived',
         status = 'confirmed',
         payment_confirmed_at = now(),
         updated_at = now()
   WHERE id = _reservation_id
   RETURNING * INTO _row;
  RETURN _row;
END $$;
REVOKE ALL ON FUNCTION public.waive_partner_reservation_deposit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.waive_partner_reservation_deposit(uuid) TO authenticated, service_role;

-- =========================================================
-- 8. Lista de espera: RPCs
-- =========================================================

-- 8.1 Submissão pública
CREATE OR REPLACE FUNCTION public.submit_reservation_waitlist(
  p_partner_slug text,
  p_type_id uuid,
  p_name text,
  p_phone text,
  p_guests integer,
  p_notes text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _partner public.partners;
  _settings public.partner_reservation_settings;
  _type public.partner_reservation_types;
  _phone_clean text;
  _row public.partner_reservation_waitlist;
BEGIN
  IF p_name IS NULL OR length(btrim(p_name))=0 THEN
    RAISE EXCEPTION 'Nome é obrigatório';
  END IF;
  _phone_clean := regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
  IF length(_phone_clean) < 10 THEN
    RAISE EXCEPTION 'Telefone inválido';
  END IF;
  IF p_type_id IS NULL THEN
    RAISE EXCEPTION 'Tipo de reserva obrigatório';
  END IF;

  SELECT * INTO _partner FROM public.partners WHERE slug = lower(btrim(p_partner_slug)) LIMIT 1;
  IF _partner.id IS NULL THEN RAISE EXCEPTION 'Estabelecimento não encontrado'; END IF;

  SELECT * INTO _settings FROM public.partner_reservation_settings WHERE partner_id = _partner.id;
  IF _settings.id IS NULL OR NOT _settings.reservations_enabled THEN
    RAISE EXCEPTION 'Reservas indisponíveis neste estabelecimento';
  END IF;

  SELECT * INTO _type FROM public.partner_reservation_types
   WHERE id = p_type_id AND partner_id = _partner.id AND active = true;
  IF _type.id IS NULL THEN RAISE EXCEPTION 'Tipo indisponível'; END IF;

  INSERT INTO public.partner_reservation_waitlist(
    partner_id, reservation_type_id, name, phone, guests_count, notes, status
  ) VALUES (
    _partner.id, _type.id, btrim(p_name), _phone_clean,
    COALESCE(p_guests, 1), NULLIF(btrim(coalesce(p_notes,'')),''),
    'waiting'
  ) RETURNING * INTO _row;

  RETURN jsonb_build_object('id', _row.id, 'status', _row.status);
END $$;
REVOKE ALL ON FUNCTION public.submit_reservation_waitlist(text, uuid, text, text, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_reservation_waitlist(text, uuid, text, text, integer, text) TO anon, authenticated, service_role;

-- 8.2 Listar para parceiro
CREATE OR REPLACE FUNCTION public.get_partner_reservation_waitlist(_partner_id uuid)
RETURNS SETOF partner_reservation_waitlist
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  IF NOT (public.is_admin() OR public.is_partner_editor_or_above(_uid, _partner_id)) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501';
  END IF;
  RETURN QUERY
    SELECT * FROM public.partner_reservation_waitlist
     WHERE partner_id = _partner_id
     ORDER BY created_at DESC;
END $$;
REVOKE ALL ON FUNCTION public.get_partner_reservation_waitlist(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_partner_reservation_waitlist(uuid) TO authenticated, service_role;

-- 8.3 Notificar entrada
CREATE OR REPLACE FUNCTION public.notify_waitlist_entry(_entry_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.partner_reservation_waitlist;
  _settings public.partner_reservation_settings;
  _partner public.partners;
  _type public.partner_reservation_types;
  _timeout int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  SELECT * INTO _row FROM public.partner_reservation_waitlist WHERE id = _entry_id;
  IF _row.id IS NULL THEN RAISE EXCEPTION 'Entrada não encontrada'; END IF;
  IF NOT (public.is_admin() OR public.is_partner_editor_or_above(_uid, _row.partner_id)) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501';
  END IF;

  SELECT * INTO _settings FROM public.partner_reservation_settings WHERE partner_id = _row.partner_id;
  SELECT * INTO _partner FROM public.partners WHERE id = _row.partner_id;
  SELECT * INTO _type FROM public.partner_reservation_types WHERE id = _row.reservation_type_id;
  _timeout := COALESCE(_settings.confirmation_timeout_minutes, 30);

  UPDATE public.partner_reservation_waitlist
     SET status = 'notified',
         notified_at = now(),
         expires_at = now() + (_timeout || ' minutes')::interval,
         updated_at = now()
   WHERE id = _entry_id
   RETURNING * INTO _row;

  RETURN jsonb_build_object(
    'id', _row.id,
    'status', _row.status,
    'expires_at', _row.expires_at,
    'partner_name', _partner.name,
    'partner_slug', _partner.slug,
    'type_name', _type.name,
    'type_kind', _type.kind,
    'reservation_url', '/' || _partner.slug || '/reservas?type=' || _type.id::text
  );
END $$;
REVOKE ALL ON FUNCTION public.notify_waitlist_entry(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_waitlist_entry(uuid) TO authenticated, service_role;

-- 8.4 Cancelar entrada
CREATE OR REPLACE FUNCTION public.cancel_waitlist_entry(_entry_id uuid)
RETURNS partner_reservation_waitlist
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.partner_reservation_waitlist;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  SELECT * INTO _row FROM public.partner_reservation_waitlist WHERE id = _entry_id;
  IF _row.id IS NULL THEN RAISE EXCEPTION 'Entrada não encontrada'; END IF;
  IF NOT (public.is_admin() OR public.is_partner_editor_or_above(_uid, _row.partner_id)) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501';
  END IF;

  UPDATE public.partner_reservation_waitlist
     SET status = 'cancelled', updated_at = now()
   WHERE id = _entry_id
   RETURNING * INTO _row;
  RETURN _row;
END $$;
REVOKE ALL ON FUNCTION public.cancel_waitlist_entry(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_waitlist_entry(uuid) TO authenticated, service_role;

-- 8.5 Expirar entradas notificadas
CREATE OR REPLACE FUNCTION public.expire_due_waitlist_entries()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n int;
BEGIN
  WITH upd AS (
    UPDATE public.partner_reservation_waitlist
       SET status='expired', updated_at = now()
     WHERE status = 'notified'
       AND expires_at IS NOT NULL
       AND now() > expires_at
    RETURNING 1
  )
  SELECT count(*)::int INTO _n FROM upd;
  RETURN COALESCE(_n,0);
END $$;

-- =========================================================
-- 9. Cron: roda expirações a cada 5 minutos
-- =========================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    PERFORM cron.unschedule('expire_reservation_waitlist')
      WHERE EXISTS (
        SELECT 1 FROM cron.job WHERE jobname='expire_reservation_waitlist'
      );
    PERFORM cron.schedule(
      'expire_reservation_waitlist',
      '*/5 * * * *',
      $cron$SELECT public.expire_due_waitlist_entries();$cron$
    );
  END IF;
END $$;
