-- =====================================================================
-- Partner Pro — Fase 3 — PROMOTORES (Supabase OFICIAL foteitrhbfwbzzeanxve)
-- NÃO APLICAR NO LEGADO. Não executado automaticamente.
-- `partner_promoters` (legado) não é identidade principal e não é migrado.
-- Sem sistema de comissão nesta fase.
-- =====================================================================

CREATE TABLE public.promoter_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Promoter COM conta Roxou: user_id + organization_member (role_code = 'promoter').
  -- Promoter SEM conta: ambos nulos.
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  organization_member_id uuid REFERENCES public.organization_members(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text,
  instagram text,
  slug text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT promoter_profiles_slug_unique_per_org UNIQUE (organization_id, slug),
  CONSTRAINT promoter_profiles_user_unique_per_org UNIQUE (organization_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promoter_profiles TO authenticated;
GRANT ALL ON public.promoter_profiles TO service_role;
ALTER TABLE public.promoter_profiles ENABLE ROW LEVEL SECURITY;

-- Membros da organização enxergam os promoters da própria organização.
CREATE POLICY "promoters_read_org_member" ON public.promoter_profiles
  FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id) OR public.is_staff_or_admin());

-- Gestão apenas por owner/manager (ou admin interno Roxou).
CREATE POLICY "promoters_write_managers" ON public.promoter_profiles
  FOR ALL TO authenticated
  USING (public.is_org_manager_or_owner(organization_id) OR public.is_admin_or_superadmin())
  WITH CHECK (public.is_org_manager_or_owner(organization_id));

CREATE INDEX promoter_profiles_org_idx ON public.promoter_profiles (organization_id, is_active);

CREATE TRIGGER promoter_profiles_touch BEFORE UPDATE
  ON public.promoter_profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- FK tardia: vip_list_entries.promoter_profile_id (definida em 0002).
ALTER TABLE public.vip_list_entries
  ADD CONSTRAINT vip_list_entries_promoter_fk
  FOREIGN KEY (promoter_profile_id)
  REFERENCES public.promoter_profiles(id) ON DELETE SET NULL;

-- Promoter só enxerga as PRÓPRIAS entradas VIP (escopo restrito, sem PII alheia).
CREATE POLICY "vip_entries_read_own_promoter" ON public.vip_list_entries
  FOR SELECT TO authenticated
  USING (
    promoter_profile_id IN (
      SELECT p.id FROM public.promoter_profiles p
      WHERE p.user_id = auth.uid() AND p.is_active
    )
  );
