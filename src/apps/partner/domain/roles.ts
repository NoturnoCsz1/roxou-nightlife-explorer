/**
 * Roles oficiais do Partner Pro — Fase 2.
 *
 * Fonte de verdade: tabela `roles` do Supabase oficial da Roxou.
 * Este arquivo NÃO cria um sistema paralelo de roles: apenas espelha os
 * códigos oficiais e traduz os papéis legados durante a transição.
 *
 * Autorização real continua sendo do banco (RLS/RPC). Estas funções servem
 * apenas para habilitar/desabilitar UI.
 */

export const PARTNER_ROLE_CODES = [
  "owner",
  "manager",
  "staff",
  "promoter",
  "validator",
] as const;

export type PartnerRoleCode = (typeof PARTNER_ROLE_CODES)[number];

export function isPartnerRoleCode(value: unknown): value is PartnerRoleCode {
  return (
    typeof value === "string" &&
    (PARTNER_ROLE_CODES as readonly string[]).includes(value)
  );
}

/**
 * LEGACY COMPATIBILITY
 * Mapeamento temporário dos papéis de `partner_users` (legado) para os
 * códigos oficiais. Removido quando o legado sair do ar.
 */
export const LEGACY_ROLE_MAP: Record<string, PartnerRoleCode> = {
  owner: "owner",
  admin: "manager",
  editor: "manager",
  attendant: "staff",
};

/** LEGACY COMPATIBILITY — traduz papel legado para role oficial. */
export function mapLegacyRole(legacyRole: string | null | undefined): PartnerRoleCode | null {
  if (!legacyRole) return null;
  return LEGACY_ROLE_MAP[legacyRole] ?? null;
}

/** Gestores da organização (owner e manager). */
export function isOrgManagerOrOwner(role: PartnerRoleCode | null): boolean {
  return role === "owner" || role === "manager";
}

export function canEditOrganizationProfile(role: PartnerRoleCode | null): boolean {
  return isOrgManagerOrOwner(role);
}

export function canManageEvents(role: PartnerRoleCode | null): boolean {
  return isOrgManagerOrOwner(role);
}

export function canManageReservations(role: PartnerRoleCode | null): boolean {
  return isOrgManagerOrOwner(role) || role === "staff";
}

export function canValidateCheckIn(role: PartnerRoleCode | null): boolean {
  return isOrgManagerOrOwner(role) || role === "staff" || role === "validator";
}

export function canViewAnalytics(role: PartnerRoleCode | null): boolean {
  return isOrgManagerOrOwner(role);
}

export function canManageTeam(role: PartnerRoleCode | null): boolean {
  return isOrgManagerOrOwner(role);
}
