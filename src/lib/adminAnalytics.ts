// Lightweight admin analytics tracker (sem IA, sem dependências externas).
// Loga no console e expõe via window.dataLayer caso exista (GTM/etc).
// Usado pelo painel admin para medir uso de filtros, bulk actions e modos.

export type AdminEventName =
  | "admin_events_filter_used"
  | "admin_events_bulk_action"
  | "admin_events_view_mode_changed"
  | "admin_events_review_opened"
  | "admin_events_duplicate_flag_seen";

export function trackAdminEvent(
  name: AdminEventName,
  payload: Record<string, unknown> = {}
) {
  try {
    const enriched = { event: name, ts: Date.now(), ...payload };
    if (typeof window !== "undefined") {
      const w = window as unknown as { dataLayer?: unknown[] };
      if (Array.isArray(w.dataLayer)) w.dataLayer.push(enriched);
    }
    if (import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.debug("[admin-analytics]", name, payload);
    }
  } catch {
    /* noop — analytics never breaks UX */
  }
}
