/**
 * Partner maintenance helpers — FIX 10F
 *
 * Disparam as funções de fechamento automático no banco antes de
 * carregar páginas (Lista VIP, Reservas, Eventos). Falhas silenciosas:
 * não devem bloquear a UI caso o RPC esteja indisponível.
 */
import { supabase } from "@/integrations/supabase/client";

export async function closeDuePartnerVipLists(): Promise<void> {
  try {
    await supabase.rpc("close_due_partner_vip_lists");
  } catch (err) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[closeDuePartnerVipLists] falhou", err);
    }
  }
}

export async function closeDuePartnerReservations(): Promise<void> {
  try {
    await supabase.rpc("close_due_partner_reservations");
  } catch (err) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[closeDuePartnerReservations] falhou", err);
    }
  }
}

export async function expireDuePartnerReservations(): Promise<void> {
  try {
    await supabase.rpc("expire_due_partner_reservations");
  } catch (err) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[expireDuePartnerReservations] falhou", err);
    }
  }
}
