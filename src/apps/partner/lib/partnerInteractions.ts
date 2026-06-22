/**
 * Partner Pro — utilitários client-side de FASE 2.
 * Haptics, deep-link helpers e analytics leves (no-op em prod sem provider).
 * Nada toca em Supabase, RLS ou backend.
 */

// ---------- Haptics ----------

type Pattern = number | number[];

const SAFE = (fn: () => void) => {
  try {
    fn();
  } catch {
    /* noop */
  }
};

export const vibrate = (pattern: Pattern): void => {
  if (typeof navigator === "undefined") return;
  if (!("vibrate" in navigator)) return;
  SAFE(() => {
    (navigator as Navigator).vibrate?.(pattern);
  });
};

export const haptics = {
  tap: () => vibrate(8),
  newReservation: () => vibrate(20),
  confirm: () => vibrate(40),
  callNext: () => vibrate([30, 30, 30]),
  cancel: () => vibrate([60, 30, 60]),
};

// ---------- Analytics (client-side, sem backend) ----------

export type PartnerClientEvent =
  | "partner_home_summary_view"
  | "partner_settings_search"
  | "partner_deeplink_open"
  | "partner_waitlist_priority_click"
  | "partner_quick_action_vibrate"
  | "partner_skeleton_loaded";

export const trackPartnerClient = (
  event: PartnerClientEvent,
  payload?: Record<string, unknown>,
): void => {
  if (typeof window === "undefined") return;
  try {
    const dl = (window as unknown as { dataLayer?: unknown[] }).dataLayer;
    if (Array.isArray(dl)) {
      dl.push({ event, ...(payload ?? {}) });
    }
    if (import.meta.env.DEV) {
      console.debug("[partner-client]", event, payload ?? {});
    }
  } catch {
    /* noop */
  }
};
