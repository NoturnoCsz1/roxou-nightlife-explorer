/**
 * PartnerSessionGateway — Fase 2 (Fundação da convergência).
 *
 * Único ponto que busca a identidade do Partner Pro no backend.
 *
 * Caminho oficial (futuro): organization_members → organizations → venues.
 * Caminho legado (temporário): partner_users → partners, somente LEITURA e
 * somente para manter módulos ainda não convertidos funcionando.
 *
 * Nunca escreve. Nunca cria organization/venue. Sem dual-write.
 */
import {
  partnerBackendQuery,
  partnerSupabase,
} from "../backend/partnerSupabase";
import {
  buildPartnerSession,
  type LegacyPartnerBinding,
  type PartnerSession,
  type RawMembershipRow,
} from "./partnerSession";

interface OrganizationMemberRow {
  organization_id: string;
  user_id: string;
  role_id: string | null;
  role_code: string | null;
  status: string | null;
  organizations?: { id: string; name: string; slug: string | null } | null;
}

interface VenueRow {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  organization_id: string;
}

/** Lê memberships oficiais. Retorna [] se o schema oficial ainda não existir. */
export async function fetchOfficialMemberships(
  userId: string,
): Promise<RawMembershipRow[]> {
  const db = partnerBackendQuery();

  const { data, error } = await db
    .from("organization_members")
    .select(
      "organization_id, user_id, role_id, role_code, status, organizations:organization_id ( id, name, slug )",
    )
    .eq("user_id", userId);

  // Schema oficial ainda indisponível neste backend → sem membership.
  if (error) return [];

  const rows = (data ?? []) as unknown as OrganizationMemberRow[];
  if (rows.length === 0) return [];

  const orgIds = Array.from(new Set(rows.map((r) => r.organization_id)));
  let venues: VenueRow[] = [];
  const venueRes = await db
    .from("venues")
    .select("id, name, slug, city, organization_id")
    .in("organization_id", orgIds);
  if (!venueRes.error) {
    venues = (venueRes.data ?? []) as unknown as VenueRow[];
  }

  return rows.map((r) => ({
    organization_id: r.organization_id,
    user_id: r.user_id,
    role_id: r.role_id,
    role_code: r.role_code,
    status: r.status,
    organization: r.organizations
      ? {
          id: r.organizations.id,
          name: r.organizations.name,
          slug: r.organizations.slug ?? null,
        }
      : null,
    venues: venues
      .filter((v) => v.organization_id === r.organization_id)
      .map((v) => ({
        id: v.id,
        name: v.name,
        slug: v.slug ?? null,
        city: v.city ?? null,
        organizationId: v.organization_id,
      })),
  }));
}

/**
 * LEGACY COMPATIBILITY
 * Leitura do vínculo legado (`partner_users` → `partners`). Existe apenas
 * para os módulos ainda não convertidos. Não concede role oficial.
 */
export async function fetchLegacyBinding(
  userId: string,
): Promise<LegacyPartnerBinding | null> {
  const { data, error } = await partnerSupabase
    .from("partner_users")
    .select("partner_id, role, partners:partner_id ( name )")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as {
    partner_id: string;
    role: string | null;
    partners: { name: string } | null;
  };

  return {
    partnerId: row.partner_id,
    partnerName: row.partners?.name ?? null,
    legacyRole: row.role ?? null,
  };
}

export interface ResolvePartnerSessionOptions {
  preferredOrganizationId?: string | null;
  preferredVenueId?: string | null;
  /** LEGACY COMPATIBILITY — desligar quando o legado sair do ar. */
  includeLegacyBinding?: boolean;
}

export async function resolvePartnerSession(
  options: ResolvePartnerSessionOptions = {},
): Promise<PartnerSession> {
  const { data } = await partnerSupabase.auth.getUser();
  const userId = data?.user?.id ?? null;

  if (!userId) {
    return buildPartnerSession({ userId: null, memberships: [] });
  }

  const memberships = await fetchOfficialMemberships(userId);
  const legacy =
    options.includeLegacyBinding === false
      ? null
      : await fetchLegacyBinding(userId);

  return buildPartnerSession({
    userId,
    memberships,
    legacy,
    preferredOrganizationId: options.preferredOrganizationId ?? null,
    preferredVenueId: options.preferredVenueId ?? null,
  });
}
