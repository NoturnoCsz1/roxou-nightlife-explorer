/**
 * partnerSignOut — encerramento único de sessão do Partner Pro.
 *
 * Garante que o logout use SEMPRE o client do Partner (dedicado quando
 * configurado) e limpe o estado local próprio do Partner, evitando
 * estados inconsistentes após sair.
 */
import { partnerSupabase } from "../backend/partnerSupabase";

const PARTNER_LOCAL_KEYS = [
  "roxou.partner.auth",
  "roxou.partner.selectedPartnerId",
  "roxou.partner.selectedOrganizationId",
  "roxou.partner.selectedVenueId",
  "roxou.partner.promoterMode",
];

export function clearPartnerLocalState() {
  if (typeof window === "undefined") return;
  try {
    for (const key of PARTNER_LOCAL_KEYS) {
      window.localStorage.removeItem(key);
    }
  } catch {
    /* noop */
  }
}

export async function partnerSignOut(): Promise<void> {
  try {
    await partnerSupabase.auth.signOut();
  } catch {
    /* segue para limpeza local mesmo se a rede falhar */
  }
  clearPartnerLocalState();
}
