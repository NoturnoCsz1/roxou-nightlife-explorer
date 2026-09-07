-- =====================================================================
-- Partner Pro — Fase 3 — VIP (Supabase OFICIAL foteitrhbfwbzzeanxve)
-- NÃO APLICAR NO LEGADO. Não executado automaticamente.
-- Requer 0001 (helpers venue_belongs_to_organization / triggers).
-- =====================================================================

CREATE TYPE public.vip_list_status AS ENUM ('draft', 'open', 'closed', 'archived');
CREATE TYPE public.vip_entry_status AS ENUM (
  'pending', 'approved', 'checked_in', 'cancelled', 'no_show'
);

-- ----------------------------------------------------------------- vip_lists
CREATE TABLE public.vip_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  max_entries integer,
  status public.vip_list_status NOT NULL DEFAULT 'draft',
  public_slug text NOT NULL DEFAULT encode(gen_random_bytes(9), 'hex'),
  public_enabled boolean NOT NULL DEFAULT false,
  public_title text,
  public_description text,
  -- Storage oficial ainda não definido: guarda apenas a URL final resolvida.
  public_cover_url text,
  rules text,
  max_entries_per_person integer NOT NULL DEFAULT 1 CHECK (max_entries_per_person > 0),
  requires_approval boolean NOT NULL DEFAULT false,
  allow_multiple_people_per_entry boolean NOT NULL DEFAULT false,
  closes_at timestamptz,
  auto_close_enabled boolean NOT NULL DEFAULT true,
  close_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vip_lists_public_slug_unique UNIQUE (public_slug)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vip_lists TO authenticated;
GRANT ALL ON public.vip_lists TO service_role;
-- anon: sem grant. Página pública lê via RPC public_get_vip_list_by_slug.
ALTER TABLE public.vip_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vip_lists_read_org_member" ON public.vip_lists
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id) OR public.is_staff_or_admin());
CREATE POLICY "vip_lists_write_managers" ON public.vip_lists
  FOR ALL TO authenticated
  USING (public.is_org_manager_or_owner(organization_id) OR public.is_admin_or_superadmin())
  WITH CHECK (public.is_org_manager_or_owner(organization_id));

CREATE INDEX vip_lists_org_venue_idx ON public.vip_lists (organization_id, venue_id, status);
CREATE TRIGGER vip_lists_org_venue BEFORE INSERT OR UPDATE
  ON public.vip_lists FOR EACH ROW
  EXECUTE FUNCTION public.enforce_org_venue_consistency();
CREATE TRIGGER vip_lists_touch BEFORE UPDATE
  ON public.vip_lists FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------------------------------------------------------- vip_list_entries
CREATE TABLE public.vip_list_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vip_list_id uuid NOT NULL REFERENCES public.vip_lists(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  promoter_profile_id uuid,
  promoter_name_snapshot text,
  name text NOT NULL,
  phone text,
  normalized_phone text,
  email text,
  people_count integer NOT NULL DEFAULT 1 CHECK (people_count > 0),
  status public.vip_entry_status NOT NULL DEFAULT 'pending',
  checked_in_at timestamptz,
  checked_in_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  public_token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  qr_code_payload text,
  source text NOT NULL DEFAULT 'manual',
  public_submitted_at timestamptz,
  marketing_consent boolean NOT NULL DEFAULT false,
  whatsapp_consent boolean NOT NULL DEFAULT false,
  email_consent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vip_list_entries_public_token_unique UNIQUE (public_token)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vip_list_entries TO authenticated;
GRANT ALL ON public.vip_list_entries TO service_role;
-- anon: sem grant. Inscrição pública apenas via RPC public_submit_vip_entry.
ALTER TABLE public.vip_list_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vip_entries_read_org_member" ON public.vip_list_entries
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id) OR public.is_staff_or_admin());
CREATE POLICY "vip_entries_read_own" ON public.vip_list_entries
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "vip_entries_write_managers" ON public.vip_list_entries
  FOR ALL TO authenticated
  USING (public.is_org_manager_or_owner(organization_id) OR public.is_admin_or_superadmin())
  WITH CHECK (public.is_org_manager_or_owner(organization_id));

CREATE INDEX vip_list_entries_list_idx ON public.vip_list_entries (vip_list_id, status);
CREATE INDEX vip_list_entries_org_idx ON public.vip_list_entries (organization_id, venue_id);
CREATE INDEX vip_list_entries_promoter_idx ON public.vip_list_entries (promoter_profile_id);
CREATE TRIGGER vip_list_entries_org_venue BEFORE INSERT OR UPDATE
  ON public.vip_list_entries FOR EACH ROW
  EXECUTE FUNCTION public.enforce_org_venue_consistency();
CREATE TRIGGER vip_list_entries_touch BEFORE UPDATE
  ON public.vip_list_entries FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
