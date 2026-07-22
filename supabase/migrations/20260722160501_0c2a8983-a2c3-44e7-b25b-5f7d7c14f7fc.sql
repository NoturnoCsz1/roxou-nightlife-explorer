
-- =========================================================
-- D1: _upsert_partner_lead — helper interno, não deve ser
-- chamável diretamente por anon/authenticated.
-- Callers legítimos são SECURITY DEFINER (add_partner_vip_entry,
-- create_partner_reservation etc.), que executam como owner e
-- portanto não dependem do EXECUTE de anon/authenticated.
-- =========================================================
REVOKE ALL ON FUNCTION public._upsert_partner_lead(
  uuid, text, text, text, text, text, text, uuid, boolean, boolean, boolean
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public._upsert_partner_lead(
  uuid, text, text, text, text, text, text, uuid, boolean, boolean, boolean
) TO service_role;


-- =========================================================
-- D6: crm_upsert_customer_and_link — recriar com guarda
-- interna: apenas admin OU service_role podem invocar.
-- Único caller frontend: /admin (CrmSyncPage) via supabase.rpc.
-- =========================================================
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
AS $function$
DECLARE
  v_phone_norm text := public.normalize_phone_br(_phone);
  v_email      text := lower(trim(_email));
  v_customer_id uuid;
  v_is_admin   boolean := false;
  v_role       text := current_setting('role', true);
BEGIN
  -- Guarda: exige admin (via has_role) OU papel service_role no cluster.
  -- Usuários comuns/anônimos não podem manipular CRM.
  IF auth.uid() IS NOT NULL THEN
    v_is_admin := public.has_role(auth.uid(), 'admin');
  END IF;

  IF NOT v_is_admin
     AND coalesce(v_role, '') NOT IN ('service_role')
     AND coalesce(current_user, '') NOT IN ('service_role','postgres','supabase_admin') THEN
    RAISE EXCEPTION 'not_authorized: only admin or service_role can upsert CRM records'
      USING ERRCODE = '42501';
  END IF;

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
    UPDATE public.crm_customers SET
      full_name    = COALESCE(NULLIF(trim(full_name), ''), _full_name),
      email        = COALESCE(email, v_email),
      city         = COALESCE(city, _city),
      last_seen_at = now()
    WHERE id = v_customer_id;
  END IF;

  -- 3) Link idempotente
  IF _source_id IS NOT NULL AND _source_type IS NOT NULL THEN
    INSERT INTO public.crm_customer_links
      (customer_id, partner_id, event_id, source_type, source_id)
    VALUES (v_customer_id, _partner_id, _event_id, _source_type, _source_id)
    ON CONFLICT (source_type, source_id) DO NOTHING;
  END IF;

  -- 4) Consent transacional + marketing opcional
  INSERT INTO public.crm_consents (customer_id, channel, consent_type, granted_at, source)
  VALUES (v_customer_id, _consent_channel, 'transactional', now(), _source)
  ON CONFLICT DO NOTHING;

  IF _marketing_consent THEN
    INSERT INTO public.crm_consents (customer_id, channel, consent_type, granted_at, source)
    VALUES (v_customer_id, _consent_channel, 'marketing', now(), _source);
  END IF;

  RETURN v_customer_id;
END
$function$;

-- Manter grants existentes (admin autenticado precisa poder invocar; a guarda
-- dentro do corpo é quem realmente autoriza).
REVOKE ALL ON FUNCTION public.crm_upsert_customer_and_link(
  text, text, text, text, text, uuid, uuid, text, uuid, boolean, text
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.crm_upsert_customer_and_link(
  text, text, text, text, text, uuid, uuid, text, uuid, boolean, text
) TO authenticated, service_role;
