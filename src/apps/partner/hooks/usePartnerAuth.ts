/**
 * usePartnerAuth — Fase 9C
 *
 * Hook central de acesso do Partner Pro. Usa o PartnerContext quando disponível
 * (recomendado, dentro de <PartnerProvider/>) e, como fallback, busca os dados
 * diretamente para uso isolado.
 *
 * Persistência da seleção: localStorage `roxou.partner.selectedPartnerId`.
 */

import { useContext } from "react";
import { PartnerContext } from "../contexts/partnerContextValue";
import type { PartnerRole } from "../types";

export const SELECTED_PARTNER_STORAGE_KEY = "roxou.partner.selectedPartnerId";

export function canEditProfile(role: PartnerRole | null): boolean {
  return role === "owner" || role === "admin";
}

export function canManageEvents(role: PartnerRole | null): boolean {
  return role === "owner" || role === "admin" || role === "editor";
}

export function canManageReservations(role: PartnerRole | null): boolean {
  return role === "owner" || role === "admin" || role === "attendant";
}

export function canViewAnalytics(role: PartnerRole | null): boolean {
  return role === "owner" || role === "admin";
}

export function usePartnerAuth() {
  const ctx = useContext(PartnerContext);
  if (!ctx) {
    throw new Error(
      "usePartnerAuth deve ser usado dentro de <PartnerProvider/>.",
    );
  }
  return ctx;
}
