/**
 * Analytics helpers para Excursões — Fase 7.4
 * Wrappers tipados em torno de trackEvent (lib/analytics.ts).
 */
import { trackEvent } from "@/lib/analytics";

export type ExcursionAnalyticsEvent =
  | "excursion_view"
  | "excursion_purchase"
  | "excursion_seat_select"
  | "excursion_boarding"
  | "excursion_gps_start"
  | "excursion_gps_share"
  | "excursion_complete";

export function trackExcursion(
  type: ExcursionAnalyticsEvent,
  metadata?: Record<string, unknown>,
): void {
  trackEvent({
    event_type: type,
    category: "excursoes",
    metadata,
  });
}
