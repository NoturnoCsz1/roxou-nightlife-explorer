/**
 * Tenancy oficial dos módulos convertidos — Fase 3.
 *
 * Identidade canônica:
 *   users → organization_members → organizations → venues
 *
 * `partners.id` (legado) NÃO é mais tenancy. Toda entidade operacional
 * privada carrega `organization_id`; operações ligadas a um estabelecimento
 * físico carregam também `venue_id`.
 *
 * IMPORTANTE: as validações deste arquivo são apenas guarda-corpos de UI.
 * A autorização real é do banco (RLS + RPC SECURITY DEFINER). O frontend
 * nunca é fonte de verdade para organization_id/venue_id/role.
 */
import type { PartnerRoleCode } from "@/apps/partner/domain/roles";

export interface PartnerScope {
  organizationId: string;
  /** Obrigatório em operações de estabelecimento físico. */
  venueId: string | null;
  roleCode: PartnerRoleCode | null;
}

export class PartnerScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PartnerScopeError";
  }
}

export function isValidScope(scope: PartnerScope | null | undefined): boolean {
  return Boolean(scope?.organizationId);
}

/** Garante uma organização resolvida pela sessão (nunca vinda de input). */
export function requireOrganization(scope: PartnerScope | null | undefined): string {
  if (!scope?.organizationId) {
    throw new PartnerScopeError("Organização não resolvida na sessão do Partner Pro.");
  }
  return scope.organizationId;
}

/** Garante um estabelecimento (venue) resolvido pela sessão. */
export function requireVenue(scope: PartnerScope | null | undefined): string {
  requireOrganization(scope);
  if (!scope?.venueId) {
    throw new PartnerScopeError("Estabelecimento não resolvido na sessão do Partner Pro.");
  }
  return scope.venueId;
}

/**
 * Bloqueia escalada horizontal entre organizations no cliente.
 * (Segunda barreira; a primeira e definitiva é a RLS.)
 */
export function assertSameOrganizationScope(
  scope: PartnerScope,
  resourceOrganizationId: string | null | undefined,
): void {
  if (!resourceOrganizationId || resourceOrganizationId !== scope.organizationId) {
    throw new PartnerScopeError("Recurso pertence a outra organização.");
  }
}

/** Venue precisa pertencer à organization da sessão. */
export function assertVenueBelongsToOrganization(
  scope: PartnerScope,
  venue: { id: string; organizationId: string } | null | undefined,
): void {
  requireOrganization(scope);
  if (!venue || venue.organizationId !== scope.organizationId) {
    throw new PartnerScopeError("Estabelecimento não pertence à organização.");
  }
}

/** Filtro padrão aplicado em toda leitura direta de tabela convertida. */
export function scopeFilter(scope: PartnerScope): Record<string, string> {
  const filter: Record<string, string> = {
    organization_id: requireOrganization(scope),
  };
  if (scope.venueId) filter.venue_id = scope.venueId;
  return filter;
}
