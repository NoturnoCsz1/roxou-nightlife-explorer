
-- 1) customer_profiles
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  email text,
  avatar_url text,
  marketing_consent boolean NOT NULL DEFAULT false,
  whatsapp_consent boolean NOT NULL DEFAULT false,
  email_consent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.customer_profiles TO authenticated;
GRANT ALL ON public.customer_profiles TO service_role;

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_can_read_own_profile" ON public.customer_profiles;
CREATE POLICY "customer_can_read_own_profile"
  ON public.customer_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "customer_can_update_own_profile" ON public.customer_profiles;
CREATE POLICY "customer_can_update_own_profile"
  ON public.customer_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_customer_profiles_updated_at ON public.customer_profiles;
CREATE TRIGGER trg_customer_profiles_updated_at
BEFORE UPDATE ON public.customer_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup (kept separate from existing handle_new_user)
CREATE OR REPLACE FUNCTION public.handle_new_customer_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.customer_profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data ->> 'phone', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_customer_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_customer_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_customer_profile();

-- 2) Vínculos opcionais
ALTER TABLE public.partner_reservations
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customer_profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_partner_reservations_customer_id
  ON public.partner_reservations(customer_id);

ALTER TABLE public.partner_vip_list_entries
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customer_profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_partner_vip_list_entries_customer_id
  ON public.partner_vip_list_entries(customer_id);

-- 3) Policies: cliente vê o que vinculou
DROP POLICY IF EXISTS "customer_can_read_own_reservations" ON public.partner_reservations;
CREATE POLICY "customer_can_read_own_reservations"
  ON public.partner_reservations FOR SELECT
  TO authenticated
  USING (customer_id IS NOT NULL AND customer_id = auth.uid());

DROP POLICY IF EXISTS "customer_can_read_own_vip_entries" ON public.partner_vip_list_entries;
CREATE POLICY "customer_can_read_own_vip_entries"
  ON public.partner_vip_list_entries FOR SELECT
  TO authenticated
  USING (customer_id IS NOT NULL AND customer_id = auth.uid());

-- 4) RPC: claim único via public_token
CREATE OR REPLACE FUNCTION public.link_record_to_customer(
  _kind text,
  _public_token uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _affected int := 0;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF _public_token IS NULL THEN
    RAISE EXCEPTION 'public_token required';
  END IF;

  -- Garante que o customer_profile existe (caso o trigger não tenha rodado)
  INSERT INTO public.customer_profiles (id, email)
  VALUES (_uid, (SELECT email FROM auth.users WHERE id = _uid))
  ON CONFLICT (id) DO NOTHING;

  IF _kind = 'reservation' THEN
    UPDATE public.partner_reservations
       SET customer_id = _uid, updated_at = now()
     WHERE public_token = _public_token
       AND customer_id IS NULL;
    GET DIAGNOSTICS _affected = ROW_COUNT;
  ELSIF _kind = 'vip_entry' THEN
    UPDATE public.partner_vip_list_entries
       SET customer_id = _uid, updated_at = now()
     WHERE public_token = _public_token
       AND customer_id IS NULL;
    GET DIAGNOSTICS _affected = ROW_COUNT;
  ELSE
    RAISE EXCEPTION 'invalid kind: %', _kind;
  END IF;

  RETURN jsonb_build_object(
    'linked', _affected > 0,
    'kind', _kind
  );
END;
$$;

REVOKE ALL ON FUNCTION public.link_record_to_customer(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_record_to_customer(text, uuid) TO authenticated;
