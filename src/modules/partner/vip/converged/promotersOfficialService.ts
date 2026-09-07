/**
 * Promotores — camada CONVERTIDA (Fase 3).
 *
 * Identidade oficial: `promoter_profiles` (organization_id).
 * `partner_promoters` (legado) NÃO é mais identidade principal.
 *
 * Regras:
 * - Promoter COM conta Roxou: organization_members.role_code = 'promoter'
 *   + promoter_profile relacionado (user_id / organization_member_id).
 * - Promoter SEM conta: promoter_profile pode existir sem user_id.
 * - Slug único dentro da organização.
 * - Sem sistema de comissão nesta fase (o legado não persiste comissão).
 */
import { officialClient } from "@modules/partner/converged/client";
import {
  requireOrganization,
  type PartnerScope,
} from "@modules/partner/converged/tenancy";

export const PROMOTER_PROFILES_TABLE = "promoter_profiles" as const;

export interface OfficialPromoterProfile {
  id: string;
  organization_id: string;
  user_id: string | null;
  organization_member_id: string | null;
  name: string;
  phone: string | null;
  instagram: string | null;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromoterProfilePayload {
  name?: string;
  phone?: string | null;
  instagram?: string | null;
  slug?: string | null;
  is_active?: boolean;
  /** Opcional: vincula a um membro existente da organização. */
  organization_member_id?: string | null;
}

function unwrap<T>(result: { data: unknown; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data as T;
}

/** Normaliza slug de promoter (único por organização). */
export function normalizePromoterSlug(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function listPromoterProfiles(
  scope: PartnerScope,
  opts: { includeInactive?: boolean } = {},
): Promise<OfficialPromoterProfile[]> {
  const organizationId = requireOrganization(scope);
  let q = officialClient()
    .from(PROMOTER_PROFILES_TABLE)
    .select("*")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });
  if (!opts.includeInactive) q = q.eq("is_active", true);
  return unwrap<OfficialPromoterProfile[]>(await q) ?? [];
}

export async function upsertPromoterProfile(
  scope: PartnerScope,
  payload: PromoterProfilePayload & { id?: string },
): Promise<OfficialPromoterProfile> {
  const organizationId = requireOrganization(scope);
  if (!payload.id && !payload.name?.trim()) {
    throw new Error("Nome do promoter é obrigatório.");
  }
  const slug = payload.slug?.trim()
    ? normalizePromoterSlug(payload.slug)
    : payload.name
      ? normalizePromoterSlug(payload.name)
      : null;

  return unwrap<OfficialPromoterProfile>(
    await officialClient().rpc("partner_upsert_promoter_profile", {
      p_organization_id: organizationId,
      p_promoter_id: payload.id ?? null,
      p_payload: { ...payload, slug },
    }),
  );
}

export async function setPromoterActive(
  scope: PartnerScope,
  promoterId: string,
  isActive: boolean,
): Promise<OfficialPromoterProfile> {
  return upsertPromoterProfile(scope, { id: promoterId, is_active: isActive });
}

/** Métricas do promoter dentro do próprio escopo (sem PII de convidados). */
export interface PromoterScopedMetrics {
  promoter_profile_id: string;
  entries_total: number;
  entries_checked_in: number;
  people_total: number;
}

export async function getPromoterMetrics(
  scope: PartnerScope,
  opts: { promoterProfileId?: string | null; vipListId?: string | null } = {},
): Promise<PromoterScopedMetrics[]> {
  const organizationId = requireOrganization(scope);
  return (
    unwrap<PromoterScopedMetrics[]>(
      await officialClient().rpc("partner_promoter_metrics", {
        p_organization_id: organizationId,
        p_promoter_profile_id: opts.promoterProfileId ?? null,
        p_vip_list_id: opts.vipListId ?? null,
      }),
    ) ?? []
  );
}
