/**
 * Admin Roxou — contrato público.
 *
 * O Admin é consumidor dos demais produtos e raramente exporta
 * contratos para fora. Este barrel existe para simetria e para
 * abrigar tipos institucionais (audit logs, role labels) que
 * outros módulos precisem exibir.
 */

export type AdminRole = "admin" | "city_editor" | "moderator";

export interface AdminAuditRef {
  actorId: string;
  role: AdminRole;
  atIso: string;
}
