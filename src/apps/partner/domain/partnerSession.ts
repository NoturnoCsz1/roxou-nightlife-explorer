/**
 * PartnerSession — Fase 2 (Fundação da convergência).
 *
 * Identidade canônica FUTURA do Partner Pro:
 *
 *   users → organization_members → organizations → venues
 *
 * `partners.id` (legado) NÃO é mais o estabelecimento canônico. Ele só
 * aparece em `legacy` para permitir que os módulos ainda não convertidos
 * (Reservas, VIP, CRM, Promoters, Bio, Menu, Métricas) continuem lendo o
 * backend legado enquanto a migração acontece por fases.
 *
 * Este arquivo é puro: não importa Supabase, React ou DOM.
 */
import {
  isPartnerRoleCode,
  mapLegacyRole,
  type PartnerRoleCode,
} from "./roles";

export interface PartnerOrganization {
  id: string;
  name: string;
  slug: string | null;
}

export interface PartnerVenue {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  organizationId: string;
}

export type PartnerSessionStatus =
  /** Sem sessão autenticada. */
  | "signed_out"
  /** Autenticado, porém sem organization_members ativo. */
  | "not_enabled"
  /** Autenticado e habilitado. */
  | "active";

export interface PartnerMembership {
  organizationId: string;
  userId: string;
  /** Sempre derivado do servidor. Nunca aceito do cliente. */
  roleCode: PartnerRoleCode;
  roleId: string | null;
  status: string;
  organization: PartnerOrganization | null;
  venues: PartnerVenue[];
}

/**
 * LEGACY COMPATIBILITY
 * Vínculo legado (`partner_users` → `partners`). Presente apenas enquanto
 * houver módulo não convertido. Nenhum código NOVO deve depender disto.
 */
export interface LegacyPartnerBinding {
  partnerId: string;
  partnerName: string | null;
  legacyRole: string | null;
}

export interface PartnerSession {
  status: PartnerSessionStatus;
  userId: string | null;
  memberships: PartnerMembership[];
  organizationId: string | null;
  organization: PartnerOrganization | null;
  venueId: string | null;
  venue: PartnerVenue | null;
  roleCode: PartnerRoleCode | null;
  /** LEGACY COMPATIBILITY — ver `LegacyPartnerBinding`. */
  legacy: LegacyPartnerBinding | null;
}

export const EMPTY_PARTNER_SESSION: PartnerSession = {
  status: "signed_out",
  userId: null,
  memberships: [],
  organizationId: null,
  organization: null,
  venueId: null,
  venue: null,
  roleCode: null,
  legacy: null,
};

/** Linha crua vinda de `organization_members` + joins. */
export interface RawMembershipRow {
  organization_id: string;
  user_id: string;
  role_id?: string | null;
  role_code?: string | null;
  status?: string | null;
  organization?: PartnerOrganization | null;
  venues?: PartnerVenue[] | null;
}

const ACTIVE_STATUSES = new Set(["active", "enabled", "approved"]);

export function isActiveMembershipStatus(status: string | null | undefined): boolean {
  return ACTIVE_STATUSES.has((status ?? "").toLowerCase());
}

export function normalizeMembership(row: RawMembershipRow): PartnerMembership | null {
  if (!row?.organization_id || !row?.user_id) return null;
  if (!isActiveMembershipStatus(row.status)) return null;
  // role_code vem do servidor. Valor desconhecido não concede privilégio.
  if (!isPartnerRoleCode(row.role_code)) return null;

  return {
    organizationId: row.organization_id,
    userId: row.user_id,
    roleCode: row.role_code,
    roleId: row.role_id ?? null,
    status: (row.status ?? "active").toLowerCase(),
    organization: row.organization ?? null,
    venues: (row.venues ?? []).filter(
      (v) => v && v.organizationId === row.organization_id,
    ),
  };
}

export interface BuildPartnerSessionInput {
  userId: string | null;
  memberships: RawMembershipRow[];
  /** LEGACY COMPATIBILITY */
  legacy?: LegacyPartnerBinding | null;
  preferredOrganizationId?: string | null;
  preferredVenueId?: string | null;
}

/**
 * Monta a PartnerSession a partir de dados já obtidos do servidor.
 *
 * Regras invioláveis:
 * - Sem usuário → `signed_out`.
 * - Usuário sem membership ativo → `not_enabled` (NUNCA cria organization/venue).
 * - Role desconhecida não vira acesso.
 */
export function buildPartnerSession(input: BuildPartnerSessionInput): PartnerSession {
  const { userId } = input;
  if (!userId) return { ...EMPTY_PARTNER_SESSION };

  const memberships = (input.memberships ?? [])
    .map(normalizeMembership)
    .filter((m): m is PartnerMembership => m !== null)
    .filter((m) => m.userId === userId);

  const legacy = input.legacy ?? null;

  if (memberships.length === 0) {
    return {
      ...EMPTY_PARTNER_SESSION,
      status: "not_enabled",
      userId,
      legacy,
    };
  }

  const selected =
    memberships.find((m) => m.organizationId === input.preferredOrganizationId) ??
    memberships[0];

  const venue =
    selected.venues.find((v) => v.id === input.preferredVenueId) ??
    selected.venues[0] ??
    null;

  return {
    status: "active",
    userId,
    memberships,
    organizationId: selected.organizationId,
    organization: selected.organization,
    venueId: venue?.id ?? null,
    venue,
    roleCode: selected.roleCode,
    legacy,
  };
}

/** Garante que um recurso pertence à organização da sessão. */
export function assertSameOrganization(
  session: PartnerSession,
  organizationId: string | null | undefined,
): boolean {
  if (session.status !== "active" || !session.organizationId) return false;
  return session.organizationId === organizationId;
}

export function mapLegacyRoleToOfficial(legacyRole: string | null | undefined) {
  return mapLegacyRole(legacyRole);
}
