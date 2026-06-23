
-- ============================================================
-- FASE CRM 1 — Núcleo Seguro do CRM Roxou
-- Tabelas: crm_customers, crm_customer_links, crm_consents, crm_customer_audit_logs
-- ============================================================

-- ----------------- Helper: normalizar telefone BR ------------
CREATE OR REPLACE FUNCTION public.normalize_phone_br(_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  digits text;
BEGIN
  IF _phone IS NULL THEN RETURN NULL; END IF;
  digits := regexp_replace(_phone, '\D', '', 'g');
  IF length(digits) = 0 THEN RETURN NULL; END IF;
  -- remove zeros à esquerda
  digits := regexp_replace(digits, '^0+', '');
  -- adiciona DDI 55 se vier só com DDD+numero (10 ou 11 dígitos)
  IF length(digits) IN (10, 11) THEN
    digits := '55' || digits;
  END IF;
  RETURN digits;
END;
$$;

-- ============== TABELA: crm_customers ========================
CREATE TABLE public.crm_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text,
  phone text,
  phone_normalized text,
  email text,
  cpf_hash text,
  city text,
  birth_date date,
  source text,
  last_seen_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX crm_customers_phone_norm_uniq
  ON public.crm_customers (phone_normalized)
  WHERE phone_normalized IS NOT NULL;

CREATE INDEX crm_customers_email_idx
  ON public.crm_customers (lower(email))
  WHERE email IS NOT NULL;

CREATE INDEX crm_customers_cpf_hash_idx
  ON public.crm_customers (cpf_hash)
  WHERE cpf_hash IS NOT NULL;

-- trigger updated_at + auto-normalize
CREATE OR REPLACE FUNCTION public.crm_customers_before_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.phone IS NOT NULL THEN
    NEW.phone_normalized := public.normalize_phone_br(NEW.phone);
  END IF;
  IF NEW.email IS NOT NULL THEN
    NEW.email := lower(trim(NEW.email));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER crm_customers_before_write
  BEFORE INSERT OR UPDATE ON public.crm_customers
  FOR EACH ROW EXECUTE FUNCTION public.crm_customers_before_write();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_customers TO authenticated;
GRANT ALL ON public.crm_customers TO service_role;

ALTER TABLE public.crm_customers ENABLE ROW LEVEL SECURITY;

-- ============== TABELA: crm_customer_links ===================
CREATE TABLE public.crm_customer_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  partner_id uuid,
  event_id uuid,
  source_type text NOT NULL, -- reservation | vip_list | excursion | ride | checkin
  source_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX crm_links_customer_idx ON public.crm_customer_links (customer_id);
CREATE INDEX crm_links_partner_idx  ON public.crm_customer_links (partner_id) WHERE partner_id IS NOT NULL;
CREATE INDEX crm_links_event_idx    ON public.crm_customer_links (event_id)   WHERE event_id IS NOT NULL;
CREATE UNIQUE INDEX crm_links_source_uniq
  ON public.crm_customer_links (source_type, source_id)
  WHERE source_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_customer_links TO authenticated;
GRANT ALL ON public.crm_customer_links TO service_role;

ALTER TABLE public.crm_customer_links ENABLE ROW LEVEL SECURITY;

-- ============== TABELA: crm_consents =========================
CREATE TABLE public.crm_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
  channel text NOT NULL,          -- whatsapp | email | sms | push
  consent_type text NOT NULL,     -- transactional | marketing | analytics
  granted_at timestamptz,
  revoked_at timestamptz,
  source text,
  opt_out_token text UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX crm_consents_customer_idx ON public.crm_consents (customer_id);
CREATE INDEX crm_consents_token_idx ON public.crm_consents (opt_out_token);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_consents TO authenticated;
GRANT ALL ON public.crm_consents TO service_role;
-- token público é resolvido via RPC SECURITY DEFINER, sem necessidade de GRANT a anon

ALTER TABLE public.crm_consents ENABLE ROW LEVEL SECURITY;

-- ============== TABELA: crm_customer_audit_logs ==============
CREATE TABLE public.crm_customer_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.crm_customers(id) ON DELETE SET NULL,
  actor_user_id uuid,
  actor_partner_id uuid,
  action text NOT NULL,           -- view_full_phone | view_full_cpf | view_full_email | sync | export ...
  field text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX crm_audit_customer_idx ON public.crm_customer_audit_logs (customer_id);
CREATE INDEX crm_audit_actor_idx ON public.crm_customer_audit_logs (actor_user_id);
CREATE INDEX crm_audit_created_idx ON public.crm_customer_audit_logs (created_at DESC);

GRANT SELECT, INSERT ON public.crm_customer_audit_logs TO authenticated;
GRANT ALL ON public.crm_customer_audit_logs TO service_role;

ALTER TABLE public.crm_customer_audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER: parceiros visíveis ao usuário via links
-- ============================================================
CREATE OR REPLACE FUNCTION public.crm_customer_visible_to_user(_customer_id uuid, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.crm_customer_links l
    JOIN public.partner_users pu
      ON pu.partner_id = l.partner_id
     AND pu.user_id = _user
    WHERE l.customer_id = _customer_id
  );
$$;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- crm_customers
CREATE POLICY "crm_customers_admin_all"
  ON public.crm_customers FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "crm_customers_partner_select"
  ON public.crm_customers FOR SELECT
  TO authenticated
  USING (public.crm_customer_visible_to_user(id, auth.uid()));

-- crm_customer_links
CREATE POLICY "crm_links_admin_all"
  ON public.crm_customer_links FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "crm_links_partner_select"
  ON public.crm_customer_links FOR SELECT
  TO authenticated
  USING (
    partner_id IS NOT NULL
    AND public.is_partner_member(auth.uid(), partner_id)
  );

CREATE POLICY "crm_links_partner_insert"
  ON public.crm_customer_links FOR INSERT
  TO authenticated
  WITH CHECK (
    partner_id IS NOT NULL
    AND public.is_partner_member(auth.uid(), partner_id)
  );

-- crm_consents
CREATE POLICY "crm_consents_admin_all"
  ON public.crm_consents FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "crm_consents_partner_select"
  ON public.crm_consents FOR SELECT
  TO authenticated
  USING (public.crm_customer_visible_to_user(customer_id, auth.uid()));

-- crm_customer_audit_logs
CREATE POLICY "crm_audit_admin_select"
  ON public.crm_customer_audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "crm_audit_self_insert"
  ON public.crm_customer_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (actor_user_id = auth.uid());

CREATE POLICY "crm_audit_partner_select"
  ON public.crm_customer_audit_logs FOR SELECT
  TO authenticated
  USING (
    actor_partner_id IS NOT NULL
    AND public.is_partner_member(auth.uid(), actor_partner_id)
  );

-- ============================================================
-- RPC: find_or_create_crm_customer
--   Cria ou atualiza customer + cria link + opcional consent
-- ============================================================
CREATE OR REPLACE FUNCTION public.crm_upsert_customer_and_link(
  _full_name text,
  _phone text,
  _email text,
  _city text,
  _source text,
  _partner_id uuid,
  _event_id uuid,
  _source_type text,
  _source_id uuid,
  _marketing_consent boolean DEFAULT false,
  _consent_channel text DEFAULT 'whatsapp'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone_norm text := public.normalize_phone_br(_phone);
  v_email      text := lower(trim(_email));
  v_customer_id uuid;
BEGIN
  -- 1) Buscar existente
  IF v_phone_norm IS NOT NULL THEN
    SELECT id INTO v_customer_id
      FROM public.crm_customers
     WHERE phone_normalized = v_phone_norm
     LIMIT 1;
  END IF;

  IF v_customer_id IS NULL AND v_email IS NOT NULL AND length(v_email) > 0 THEN
    SELECT id INTO v_customer_id
      FROM public.crm_customers
     WHERE lower(email) = v_email
     LIMIT 1;
  END IF;

  -- 2) Criar se não existe
  IF v_customer_id IS NULL THEN
    INSERT INTO public.crm_customers (full_name, phone, email, city, source, last_seen_at)
    VALUES (_full_name, _phone, v_email, _city, _source, now())
    RETURNING id INTO v_customer_id;
  ELSE
    -- enriquecer sem sobrescrever dados existentes
    UPDATE public.crm_customers SET
      full_name  = COALESCE(NULLIF(trim(full_name), ''), _full_name),
      email      = COALESCE(email, v_email),
      city       = COALESCE(city, _city),
      last_seen_at = now()
    WHERE id = v_customer_id;
  END IF;

  -- 3) Criar link (idempotente)
  IF _source_id IS NOT NULL AND _source_type IS NOT NULL THEN
    INSERT INTO public.crm_customer_links
      (customer_id, partner_id, event_id, source_type, source_id)
    VALUES (v_customer_id, _partner_id, _event_id, _source_type, _source_id)
    ON CONFLICT (source_type, source_id) DO NOTHING;
  END IF;

  -- 4) Consent (transactional implícito; marketing só com flag)
  INSERT INTO public.crm_consents (customer_id, channel, consent_type, granted_at, source)
  VALUES (v_customer_id, _consent_channel, 'transactional', now(), _source)
  ON CONFLICT DO NOTHING;

  IF _marketing_consent THEN
    INSERT INTO public.crm_consents (customer_id, channel, consent_type, granted_at, source)
    VALUES (v_customer_id, _consent_channel, 'marketing', now(), _source);
  END IF;

  RETURN v_customer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.crm_upsert_customer_and_link(
  text, text, text, text, text, uuid, uuid, text, uuid, boolean, text
) TO authenticated, service_role;

-- ============================================================
-- RPC: revogar consentimento via opt-out token (público)
-- ============================================================
CREATE OR REPLACE FUNCTION public.crm_revoke_consent_by_token(_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF _token IS NULL OR length(_token) < 16 THEN RETURN false; END IF;
  UPDATE public.crm_consents
     SET revoked_at = now()
   WHERE opt_out_token = _token
     AND revoked_at IS NULL
   RETURNING id INTO v_id;
  RETURN v_id IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.crm_revoke_consent_by_token(text) TO anon, authenticated;

-- ============================================================
-- RPC: revelar telefone/cpf/email completos com audit
-- ============================================================
CREATE OR REPLACE FUNCTION public.crm_reveal_customer_field(
  _customer_id uuid,
  _field text,
  _partner_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean := public.is_admin();
  v_allowed boolean := false;
  v_value text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  IF v_is_admin THEN
    v_allowed := true;
  ELSIF _partner_id IS NOT NULL
    AND public.is_partner_owner_or_admin(v_uid, _partner_id)
    AND public.crm_customer_visible_to_user(_customer_id, v_uid)
  THEN
    v_allowed := true;
  END IF;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT CASE _field
    WHEN 'phone' THEN phone
    WHEN 'email' THEN email
    WHEN 'cpf_hash' THEN cpf_hash
    ELSE NULL
  END
  INTO v_value
  FROM public.crm_customers WHERE id = _customer_id;

  INSERT INTO public.crm_customer_audit_logs
    (customer_id, actor_user_id, actor_partner_id, action, field)
  VALUES
    (_customer_id, v_uid, _partner_id, 'reveal_' || _field, _field);

  RETURN v_value;
END;
$$;

GRANT EXECUTE ON FUNCTION public.crm_reveal_customer_field(uuid, text, uuid) TO authenticated;
