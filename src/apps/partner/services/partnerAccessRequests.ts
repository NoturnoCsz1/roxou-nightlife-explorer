/**
 * Partner Access Requests service — Convergência Onda 1.
 *
 * Fluxo oficial (Supabase oficial do Partner Pro):
 *   public.venues                        → estabelecimentos canônicos
 *   public.organization_access_requests  → solicitações de acesso
 *
 * Sem dependência do Supabase legado (partners / partner_access_requests /
 * partner_users / partner_beta_access). Nunca cria organization, membership
 * ou venue: aprovação é responsabilidade do Admin Roxou.
 */
import {
  partnerBackendQuery,
  partnerSupabase,
} from "../backend/partnerSupabase";

export type PartnerAccessRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export interface OrganizationAccessRequest {
  id: string;
  user_id: string;
  venue_id: string | null;
  organization_id: string | null;
  requested_role: string | null;
  message: string | null;
  status: PartnerAccessRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string | null;
}

/** Alias de compatibilidade de tipo para as telas já existentes. */
export type PartnerAccessRequest = OrganizationAccessRequest;

export interface VenueSearchResult {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  category: string | null;
  instagram: string | null;
  logo_url: string | null;
  address: string | null;
}

/** Compat: nome antigo usado pelas telas. */
export type PartnerSearchResult = VenueSearchResult;

function toVenue(row: Record<string, unknown>): VenueSearchResult {
  const str = (k: string): string | null => {
    const v = row[k];
    return typeof v === "string" && v.length > 0 ? v : null;
  };
  return {
    id: String(row.id ?? ""),
    name: str("name") ?? "Sem nome",
    slug: str("slug"),
    city: str("city"),
    category: str("category"),
    instagram: str("instagram"),
    logo_url: str("logo_url") ?? str("cover_url") ?? str("image_url"),
    address: str("address"),
  };
}

/** Busca estabelecimentos oficiais ativos (somente leitura). */
export async function searchVenuesForOnboarding(
  query: string,
  limit = 20,
): Promise<VenueSearchResult[]> {
  const db = partnerBackendQuery();
  const q = query.trim();

  let req = db
    .from("venues")
    .select("*")
    .eq("status", "active")
    .order("name", { ascending: true })
    .limit(limit);

  if (q.length > 0) {
    const like = `%${q}%`;
    req = req.or(
      [
        `name.ilike.${like}`,
        `slug.ilike.${like}`,
        `city.ilike.${like}`,
        `category.ilike.${like}`,
        `instagram.ilike.${like}`,
      ].join(","),
    );
  }

  const { data, error } = await req;
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(toVenue);
}

/** Compat: nome antigo mantido para não ampliar o escopo das telas. */
export const searchPartnersForOnboarding = searchVenuesForOnboarding;

export async function listMyAccessRequests(): Promise<OrganizationAccessRequest[]> {
  const { data: userData } = await partnerSupabase.auth.getUser();
  const user = userData?.user;
  if (!user) return [];

  const { data, error } = await partnerBackendQuery()
    .from("organization_access_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as OrganizationAccessRequest[];
}

export async function createAccessRequest(
  venueId: string,
  payload: { message?: string; requested_role?: string } = {},
): Promise<OrganizationAccessRequest | null> {
  const { data: userData } = await partnerSupabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error("Faça login para solicitar acesso.");

  const { data, error } = await partnerBackendQuery()
    .from("organization_access_requests")
    .insert({
      venue_id: venueId,
      user_id: user.id,
      status: "pending",
      requested_role: payload.requested_role ?? "owner",
      message: payload.message?.trim() || null,
    })
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return (data as unknown as OrganizationAccessRequest) ?? null;
}

export async function cancelMyAccessRequest(id: string): Promise<void> {
  const { error } = await partnerBackendQuery()
    .from("organization_access_requests")
    .update({ status: "cancelled" })
    .eq("id", id);
  if (error) throw error;
}

/** Lê os venues referenciados por um conjunto de solicitações. */
export async function fetchVenuesByIds(
  ids: string[],
): Promise<Record<string, VenueSearchResult>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return {};
  const { data, error } = await partnerBackendQuery()
    .from("venues")
    .select("*")
    .in("id", unique);
  if (error) return {};
  const map: Record<string, VenueSearchResult> = {};
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const v = toVenue(row);
    map[v.id] = v;
  }
  return map;
}
