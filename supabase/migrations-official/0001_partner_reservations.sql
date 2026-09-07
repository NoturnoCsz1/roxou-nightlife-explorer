-- =====================================================================
-- Partner Pro — Fase 3 — RESERVAS (Supabase OFICIAL foteitrhbfwbzzeanxve)
-- NÃO APLICAR NO LEGADO. Não executado automaticamente.
-- Tenancy: organizations → venues. `partners.id` não é tenancy.
-- =====================================================================

CREATE TYPE public.reservation_status AS ENUM (
  'pending', 'pending_payment', 'confirmed', 'cancelled',
  'completed', 'expired', 'no_show'
);
CREATE TYPE public.reservation_type_kind AS ENUM ('table', 'bistro', 'box');
CREATE TYPE public.reservation_deposit_type AS ENUM ('fixed', 'percent', 'full');
CREATE TYPE public.reservation_payment_status AS ENUM ('pending', 'paid', 'waived', 'refunded');
CREATE TYPE public.reservation_waitlist_status AS ENUM (
  'waiting', 'notified', 'accepted', 'expired', 'cancelled'
);

-- Guarda-corpo compartilhado: venue precisa pertencer à organization.
CREATE OR REPLACE FUNCTION public.venue_belongs_to_organization(
  _venue_id uuid, _organization_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.venues v
    WHERE v.id = _venue_id AND v.organization_id = _organization_id
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_org_venue_consistency()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.venue_id IS NOT NULL
     AND NOT public.venue_belongs_to_organization(NEW.venue_id, NEW.organization_id) THEN
    RAISE EXCEPTION 'venue % não pertence à organization %', NEW.venue_id, NEW.organization_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ------------------------------------------------------ reservation_settings
CREATE TABLE public.reservation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  reservations_enabled boolean NOT NULL DEFAULT false,
  max_people_per_reservation integer NOT NULL DEFAULT 10,
  max_reservations_per_day integer NOT NULL DEFAULT 50,
  advance_booking_hours integer NOT NULL DEFAULT 2,
  auto_confirm boolean NOT NULL DEFAULT false,
  confirmation_timeout_minutes integer NOT NULL DEFAULT 30,
  deposit_enabled boolean NOT NULL DEFAULT false,
  deposit_type public.reservation_deposit_type NOT NULL DEFAULT 'fixed',
  deposit_value numeric(10,2) NOT NULL DEFAULT 0,
  pix_key text,
  pix_receiver_name text,
  payment_instructions text,
  slot_interval_minutes integer NOT NULL DEFAULT 30,
  default_reservation_duration_minutes integer NOT NULL DEFAULT 120,
  daily_open_time time NOT NULL DEFAULT '18:00',
  daily_close_time time NOT NULL DEFAULT '04:00',
  reservations_start_at timestamptz,
  reservations_end_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reservation_settings_unique_venue UNIQUE (organization_id, venue_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservation_settings TO authenticated;
GRANT ALL ON public.reservation_settings TO service_role;
ALTER TABLE public.reservation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_read_org_member" ON public.reservation_settings
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id) OR public.is_staff_or_admin());
CREATE POLICY "settings_write_managers" ON public.reservation_settings
  FOR ALL TO authenticated
  USING (public.is_org_manager_or_owner(organization_id) OR public.is_admin_or_superadmin())
  WITH CHECK (public.is_org_manager_or_owner(organization_id));

CREATE TRIGGER reservation_settings_org_venue BEFORE INSERT OR UPDATE
  ON public.reservation_settings FOR EACH ROW
  EXECUTE FUNCTION public.enforce_org_venue_consistency();
CREATE TRIGGER reservation_settings_touch BEFORE UPDATE
  ON public.reservation_settings FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- --------------------------------------------------------- reservation_types
CREATE TABLE public.reservation_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  kind public.reservation_type_kind NOT NULL DEFAULT 'table',
  name text NOT NULL,
  description text,
  seats integer NOT NULL DEFAULT 1 CHECK (seats > 0),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price numeric(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  minimum_consumption numeric(10,2),
  extra_people_limit integer DEFAULT 0,
  extra_people_price numeric(10,2),
  duration_minutes integer,
  requires_guest_count boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservation_types TO authenticated;
GRANT ALL ON public.reservation_types TO service_role;
ALTER TABLE public.reservation_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "types_read_org_member" ON public.reservation_types
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id) OR public.is_staff_or_admin());
CREATE POLICY "types_write_managers" ON public.reservation_types
  FOR ALL TO authenticated
  USING (public.is_org_manager_or_owner(organization_id) OR public.is_admin_or_superadmin())
  WITH CHECK (public.is_org_manager_or_owner(organization_id));

CREATE INDEX reservation_types_org_venue_idx
  ON public.reservation_types (organization_id, venue_id, active);
CREATE TRIGGER reservation_types_org_venue BEFORE INSERT OR UPDATE
  ON public.reservation_types FOR EACH ROW
  EXECUTE FUNCTION public.enforce_org_venue_consistency();
CREATE TRIGGER reservation_types_touch BEFORE UPDATE
  ON public.reservation_types FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- -------------------------------------------------------------- reservations
CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reservation_type_id uuid REFERENCES public.reservation_types(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text,
  email text,
  people_count integer NOT NULL DEFAULT 1 CHECK (people_count > 0),
  reservation_date timestamptz NOT NULL,
  notes text,
  status public.reservation_status NOT NULL DEFAULT 'pending',
  total_price numeric(10,2),
  deposit_amount numeric(10,2),
  remaining_amount numeric(10,2),
  payment_method text,
  payment_status public.reservation_payment_status NOT NULL DEFAULT 'pending',
  payment_confirmed_at timestamptz,
  expires_at timestamptz,
  closes_at timestamptz,
  auto_close_enabled boolean NOT NULL DEFAULT true,
  close_reason text,
  checked_in_at timestamptz,
  checked_in_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  released_at timestamptz,
  duration_minutes integer,
  public_token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reservations_public_token_unique UNIQUE (public_token)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO authenticated;
GRANT ALL ON public.reservations TO service_role;
-- anon NÃO recebe grant: superfície pública é apenas via RPC por token.
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reservations_read_org_member" ON public.reservations
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id) OR public.is_staff_or_admin());
CREATE POLICY "reservations_read_own" ON public.reservations
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "reservations_write_managers" ON public.reservations
  FOR ALL TO authenticated
  USING (public.is_org_manager_or_owner(organization_id) OR public.is_admin_or_superadmin())
  WITH CHECK (public.is_org_manager_or_owner(organization_id));

CREATE INDEX reservations_org_venue_date_idx
  ON public.reservations (organization_id, venue_id, reservation_date DESC);
CREATE INDEX reservations_status_idx ON public.reservations (organization_id, status);
CREATE TRIGGER reservations_org_venue BEFORE INSERT OR UPDATE
  ON public.reservations FOR EACH ROW
  EXECUTE FUNCTION public.enforce_org_venue_consistency();
CREATE TRIGGER reservations_touch BEFORE UPDATE
  ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- --------------------------------------------------------- reservation_waitlist
CREATE TABLE public.reservation_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  reservation_type_id uuid REFERENCES public.reservation_types(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text NOT NULL,
  guests_count integer NOT NULL DEFAULT 1 CHECK (guests_count > 0),
  notes text,
  status public.reservation_waitlist_status NOT NULL DEFAULT 'waiting',
  notified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservation_waitlist TO authenticated;
GRANT ALL ON public.reservation_waitlist TO service_role;
ALTER TABLE public.reservation_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waitlist_read_org_member" ON public.reservation_waitlist
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id) OR public.is_staff_or_admin());
CREATE POLICY "waitlist_write_managers" ON public.reservation_waitlist
  FOR ALL TO authenticated
  USING (public.is_org_manager_or_owner(organization_id) OR public.is_admin_or_superadmin())
  WITH CHECK (public.is_org_manager_or_owner(organization_id));

CREATE TRIGGER reservation_waitlist_org_venue BEFORE INSERT OR UPDATE
  ON public.reservation_waitlist FOR EACH ROW
  EXECUTE FUNCTION public.enforce_org_venue_consistency();
CREATE TRIGGER reservation_waitlist_touch BEFORE UPDATE
  ON public.reservation_waitlist FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();
