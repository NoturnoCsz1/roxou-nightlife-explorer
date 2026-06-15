/**
 * Tipos compartilhados do Partner Pro (Fase 9A — placeholder).
 * As tabelas reais serão criadas na Fase 9B.
 */

export type PartnerRole = "owner" | "admin" | "editor" | "attendant";

export type PartnerSubscriptionPlan = "free" | "pro" | "premium" | "enterprise";

export type PartnerSubscriptionStatus =
  | "active"
  | "trial"
  | "past_due"
  | "canceled"
  | "expired";

export interface PartnerUserLink {
  id: string;
  user_id: string;
  partner_id: string;
  role: PartnerRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
