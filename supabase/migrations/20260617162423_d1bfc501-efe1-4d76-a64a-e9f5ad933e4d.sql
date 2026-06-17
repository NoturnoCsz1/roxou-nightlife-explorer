
-- ───── R5: Índices para escala
CREATE INDEX IF NOT EXISTS idx_partner_reservations_customer_id
  ON public.partner_reservations(customer_id)
  WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_partner_vip_entries_customer_id
  ON public.partner_vip_list_entries(customer_id)
  WHERE customer_id IS NOT NULL;

-- ───── R7: Auditoria de vínculos
ALTER TABLE public.partner_reservations
  ADD COLUMN IF NOT EXISTS customer_linked_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_linked_by uuid;

ALTER TABLE public.partner_vip_list_entries
  ADD COLUMN IF NOT EXISTS customer_linked_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_linked_by uuid;

-- ───── Helper: normalize_phone
CREATE OR REPLACE FUNCTION public.normalize_phone(_input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(regexp_replace(COALESCE(_input,''), '[^0-9]', '', 'g'), '');
$$;

-- ───── R1: link_record_to_customer com checagem de contato
CREATE OR REPLACE FUNCTION public.link_record_to_customer(_kind text, _public_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _user_email text;
  _user_phone_meta text;
  _profile_phone text;
  _norm_user_phone text;

  _rec_email text;
  _rec_phone text;
  _rec_customer uuid;
  _rec_id uuid;

  _norm_rec_phone text;
  _email_match boolean := false;
  _phone_match boolean := false;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF _public_token IS NULL THEN
    RAISE EXCEPTION 'public_token required';
  END IF;
  IF _kind NOT IN ('reservation','vip_entry') THEN
    RAISE EXCEPTION 'invalid kind: %', _kind;
  END IF;

  -- Garante customer_profiles
  INSERT INTO public.customer_profiles (id, email)
  VALUES (_uid, (SELECT email FROM auth.users WHERE id = _uid))
  ON CONFLICT (id) DO NOTHING;

  -- Dados do usuário logado
  SELECT lower(u.email),
         NULLIF(u.raw_user_meta_data->>'phone','')
    INTO _user_email, _user_phone_meta
    FROM auth.users u WHERE u.id = _uid;

  SELECT NULLIF(phone,'') INTO _profile_phone
    FROM public.customer_profiles WHERE id = _uid;

  _norm_user_phone := COALESCE(
    public.normalize_phone(_profile_phone),
    public.normalize_phone(_user_phone_meta)
  );

  -- Dados do registro
  IF _kind = 'reservation' THEN
    SELECT id, lower(email), phone, customer_id
      INTO _rec_id, _rec_email, _rec_phone, _rec_customer
      FROM public.partner_reservations
     WHERE public_token = _public_token;
  ELSE
    SELECT id, lower(email), phone, customer_id
      INTO _rec_id, _rec_email, _rec_phone, _rec_customer
      FROM public.partner_vip_list_entries
     WHERE public_token = _public_token;
  END IF;

  IF _rec_id IS NULL THEN
    RETURN jsonb_build_object('linked', false, 'kind', _kind, 'reason', 'not_found');
  END IF;

  -- Já vinculado?
  IF _rec_customer IS NOT NULL THEN
    IF _rec_customer = _uid THEN
      RETURN jsonb_build_object('linked', true, 'kind', _kind, 'reason', 'already_linked_to_you');
    ELSE
      RETURN jsonb_build_object('linked', false, 'kind', _kind, 'reason', 'already_linked');
    END IF;
  END IF;

  -- Checagem de contato
  _norm_rec_phone := public.normalize_phone(_rec_phone);
  _email_match := (_rec_email IS NOT NULL AND _user_email IS NOT NULL AND _rec_email = _user_email);
  _phone_match := (_norm_rec_phone IS NOT NULL
                   AND _norm_user_phone IS NOT NULL
                   AND length(_norm_rec_phone) >= 10
                   AND _norm_rec_phone = _norm_user_phone);

  IF NOT (_email_match OR _phone_match) THEN
    RETURN jsonb_build_object('linked', false, 'kind', _kind, 'reason', 'contact_mismatch');
  END IF;

  -- Vincula
  IF _kind = 'reservation' THEN
    UPDATE public.partner_reservations
       SET customer_id = _uid,
           customer_linked_at = now(),
           customer_linked_by = _uid,
           updated_at = now()
     WHERE id = _rec_id AND customer_id IS NULL;
  ELSE
    UPDATE public.partner_vip_list_entries
       SET customer_id = _uid,
           customer_linked_at = now(),
           customer_linked_by = _uid,
           updated_at = now()
     WHERE id = _rec_id AND customer_id IS NULL;
  END IF;

  RETURN jsonb_build_object('linked', true, 'kind', _kind, 'reason', 'linked');
END;
$$;

-- ───── R3: LGPD — exclusão de conta
CREATE OR REPLACE FUNCTION public.delete_my_customer_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE public.partner_reservations
     SET customer_id = NULL,
         customer_linked_at = NULL,
         customer_linked_by = NULL,
         updated_at = now()
   WHERE customer_id = _uid;

  UPDATE public.partner_vip_list_entries
     SET customer_id = NULL,
         customer_linked_at = NULL,
         customer_linked_by = NULL,
         updated_at = now()
   WHERE customer_id = _uid;

  DELETE FROM public.customer_profiles WHERE id = _uid;

  RETURN jsonb_build_object('deleted', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_record_to_customer(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_customer_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_phone(text) TO authenticated, anon;
