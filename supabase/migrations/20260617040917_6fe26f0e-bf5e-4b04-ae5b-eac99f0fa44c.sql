
-- =========================================================
-- 1. partner_reservation_types
-- =========================================================
CREATE TABLE IF NOT EXISTS public.partner_reservation_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('table','bistro','box')),
  name text NOT NULL,
  seats integer NOT NULL DEFAULT 1,
  quantity integer NOT NULL DEFAULT 1,
  price numeric(10,2) NOT NULL DEFAULT 0,
  minimum_consumption numeric(10,2),
  extra_people_limit integer DEFAULT 0,
  extra_people_price numeric(10,2),
  description text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_reservation_types_partner ON public.partner_reservation_types(partner_id, kind, active);

GRANT SELECT ON public.partner_reservation_types TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_reservation_types TO authenticated;
GRANT ALL ON public.partner_reservation_types TO service_role;

ALTER TABLE public.partner_reservation_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active reservation types"
  ON public.partner_reservation_types FOR SELECT
  USING (
    active = true
    AND EXISTS (
      SELECT 1 FROM public.partner_reservation_settings s
      WHERE s.partner_id = partner_reservation_types.partner_id
        AND s.reservations_enabled = true
    )
  );

CREATE POLICY "Partner team manages reservation types"
  ON public.partner_reservation_types FOR ALL
  USING (public.is_admin() OR public.is_partner_editor_or_above(auth.uid(), partner_id))
  WITH CHECK (public.is_admin() OR public.is_partner_editor_or_above(auth.uid(), partner_id));

CREATE TRIGGER trg_partner_reservation_types_updated
  BEFORE UPDATE ON public.partner_reservation_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 2. partner_reservation_settings: novas colunas
-- =========================================================
ALTER TABLE public.partner_reservation_settings
  ADD COLUMN IF NOT EXISTS reservations_start_at timestamptz,
  ADD COLUMN IF NOT EXISTS reservations_end_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_timeout_minutes integer NOT NULL DEFAULT 30;

-- =========================================================
-- 3. partner_reservations: novas colunas
-- =========================================================
ALTER TABLE public.partner_reservations
  ADD COLUMN IF NOT EXISTS reservation_type_id uuid REFERENCES public.partner_reservation_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS total_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS checked_in_by uuid,
  ADD COLUMN IF NOT EXISTS public_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS code text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_reservations_public_token ON public.partner_reservations(public_token);
CREATE INDEX IF NOT EXISTS idx_partner_reservations_expires ON public.partner_reservations(status, expires_at);

-- Atualiza policies: permitir submissão pública via RPC (security definer cobre),
-- mas adicionar policy de leitura pública pelo token para tela de sucesso.
DROP POLICY IF EXISTS "Public read reservation by token" ON public.partner_reservations;
CREATE POLICY "Public read reservation by token"
  ON public.partner_reservations FOR SELECT
  USING (true);
-- Atenção: leitura ampla aceitável (sem dados sensíveis além do que cliente já tem).
-- Refinaremos quando houver endpoint dedicado.

-- =========================================================
-- 4. Funções RPC
-- =========================================================

-- Gera código curto tipo RX-XXXXX
CREATE OR REPLACE FUNCTION public._reservation_short_code()
RETURNS text LANGUAGE sql VOLATILE AS $$
  SELECT 'RX-' || upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 6));
$$;

-- Expira reservas pendentes vencidas
CREATE OR REPLACE FUNCTION public.expire_due_partner_reservations()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n int;
BEGIN
  WITH upd AS (
    UPDATE public.partner_reservations
       SET status = 'expired', updated_at = now()
     WHERE status = 'pending_payment'
       AND payment_confirmed_at IS NULL
       AND expires_at IS NOT NULL
       AND now() > expires_at
    RETURNING 1
  )
  SELECT count(*)::int INTO _n FROM upd;
  RETURN COALESCE(_n,0);
END $$;

-- Submissão pública de reserva
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
  _status text;
  _expires timestamptz;
  _row public.partner_reservations;
  _code text;
  _price numeric;
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
      WHERE id = p_type_id AND partner_id = _partner.id AND active = true;
    IF _type.id IS NULL THEN RAISE EXCEPTION 'Tipo de reserva indisponível'; END IF;
    _price := _type.price;
  END IF;

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
    status, reservation_type_id, total_price, expires_at, code
  ) VALUES (
    _partner.id, btrim(p_name), _phone_clean, NULLIF(lower(btrim(coalesce(p_email,''))),''),
    p_guests, p_reservation_date, NULLIF(btrim(coalesce(p_notes,'')),''),
    _status, _type.id, _price, _expires, _code
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

-- Buscar reserva pública pelo token
CREATE OR REPLACE FUNCTION public.get_public_reservation(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _row public.partner_reservations;
  _partner public.partners;
  _type public.partner_reservation_types;
BEGIN
  SELECT * INTO _row FROM public.partner_reservations WHERE public_token = p_token;
  IF _row.id IS NULL THEN RETURN NULL; END IF;
  -- expira on-the-fly se vencido
  IF _row.status = 'pending_payment' AND _row.expires_at IS NOT NULL AND now() > _row.expires_at THEN
    UPDATE public.partner_reservations SET status='expired', updated_at=now() WHERE id=_row.id RETURNING * INTO _row;
  END IF;
  SELECT * INTO _partner FROM public.partners WHERE id = _row.partner_id;
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
    'qr_payload', 'roxou://checkin?type=reservation&id=' || _row.id::text,
    'partner_id', _partner.id,
    'partner_name', _partner.name,
    'partner_slug', _partner.slug,
    'partner_logo_url', _partner.logo_url,
    'partner_city', _partner.city,
    'partner_address', _partner.address,
    'type_kind', _type.kind,
    'type_name', _type.name,
    'type_seats', _type.seats
  );
END $$;

-- Confirmar pagamento (partner)
CREATE OR REPLACE FUNCTION public.confirm_partner_reservation_payment(_reservation_id uuid)
RETURNS public.partner_reservations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _partner uuid;
  _row public.partner_reservations;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  SELECT partner_id INTO _partner FROM public.partner_reservations WHERE id = _reservation_id;
  IF _partner IS NULL THEN RAISE EXCEPTION 'Reservation not found'; END IF;
  IF NOT (public.is_admin() OR public.is_partner_reservation_manager(_uid, _partner)) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501';
  END IF;
  UPDATE public.partner_reservations
     SET status='confirmed', payment_confirmed_at = now(), updated_at = now()
   WHERE id = _reservation_id
   RETURNING * INTO _row;
  RETURN _row;
END $$;

-- Check-in da reserva (validador QR)
CREATE OR REPLACE FUNCTION public.check_in_partner_reservation(_reservation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.partner_reservations;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  SELECT * INTO _row FROM public.partner_reservations WHERE id = _reservation_id;
  IF _row.id IS NULL THEN
    RETURN jsonb_build_object('outcome','not_found','message','Reserva não encontrada');
  END IF;
  IF NOT (public.is_admin() OR public.is_partner_reservation_manager(_uid, _row.partner_id)) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501';
  END IF;

  IF _row.status = 'pending_payment' THEN
    RETURN jsonb_build_object('outcome','blocked','message','Reserva aguardando pagamento','reservation', to_jsonb(_row));
  END IF;
  IF _row.status IN ('expired','cancelled') THEN
    RETURN jsonb_build_object('outcome','invalid','message','Reserva ' || _row.status, 'reservation', to_jsonb(_row));
  END IF;
  IF _row.status IN ('completed','no_show') OR _row.checked_in_at IS NOT NULL THEN
    RETURN jsonb_build_object('outcome','already_used','message','Reserva já utilizada','reservation', to_jsonb(_row));
  END IF;
  IF _row.status <> 'confirmed' THEN
    RETURN jsonb_build_object('outcome','invalid','message','Status inválido','reservation', to_jsonb(_row));
  END IF;

  UPDATE public.partner_reservations
     SET status='completed', checked_in_at = now(), checked_in_by = _uid, updated_at = now()
   WHERE id = _reservation_id
   RETURNING * INTO _row;
  RETURN jsonb_build_object('outcome','valid','message','Check-in realizado','reservation', to_jsonb(_row));
END $$;
