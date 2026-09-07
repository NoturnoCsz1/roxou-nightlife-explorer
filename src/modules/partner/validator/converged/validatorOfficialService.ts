/**
 * Validador / check-in — camada CONVERTIDA (Fase 3).
 *
 * Escopo do role `validator`: SOMENTE validação/check-in. Nada de gestão,
 * nada de listagem ampla de PII. Toda a operação passa por RPC
 * SECURITY DEFINER que valida membership e o pertencimento do recurso à
 * organização/venue da sessão.
 */
import { officialClient } from "@modules/partner/converged/client";
import {
  requireOrganization,
  requireVenue,
  type PartnerScope,
} from "@modules/partner/converged/tenancy";

export type ValidationKind = "vip_entry" | "reservation";

export interface ValidationResult {
  ok: boolean;
  kind: ValidationKind | null;
  /** Nome do convidado — exibido apenas na portaria, sem telefone/e-mail. */
  display_name: string | null;
  people_count: number | null;
  status: string | null;
  checked_in_at: string | null;
  message: string;
}

function unwrap<T>(result: { data: unknown; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data as T;
}

/**
 * Resolve um token de QR (VIP ou reserva) dentro do escopo da sessão.
 * Não retorna PII além do nome de exibição.
 */
export async function resolveValidationToken(
  scope: PartnerScope,
  token: string,
): Promise<ValidationResult> {
  const organizationId = requireOrganization(scope);
  const venueId = requireVenue(scope);
  if (!token?.trim()) throw new Error("Token obrigatório.");

  return unwrap<ValidationResult>(
    await officialClient().rpc("partner_resolve_validation_token", {
      p_organization_id: organizationId,
      p_venue_id: venueId,
      p_token: token.trim(),
    }),
  );
}

/** Efetiva o check-in do token resolvido. Idempotente no backend. */
export async function validateCheckIn(
  scope: PartnerScope,
  token: string,
): Promise<ValidationResult> {
  const organizationId = requireOrganization(scope);
  const venueId = requireVenue(scope);
  if (!token?.trim()) throw new Error("Token obrigatório.");

  return unwrap<ValidationResult>(
    await officialClient().rpc("partner_validate_check_in", {
      p_organization_id: organizationId,
      p_venue_id: venueId,
      p_token: token.trim(),
    }),
  );
}

/** Desfaz um check-in feito por engano (mesma janela operacional). */
export async function undoCheckIn(
  scope: PartnerScope,
  kind: ValidationKind,
  recordId: string,
): Promise<ValidationResult> {
  requireOrganization(scope);
  return unwrap<ValidationResult>(
    await officialClient().rpc("partner_undo_check_in", {
      p_kind: kind,
      p_record_id: recordId,
    }),
  );
}
