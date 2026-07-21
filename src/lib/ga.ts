// Google Analytics 4 helper — ID: G-0B5C1BNLPK
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export const GA_ID = "G-0B5C1BNLPK";

export function gaEvent(name: string, params: Record<string, any> = {}) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", name, params);
}

export function trackEventClick(eventId: string, title?: string) {
  gaEvent("event_click", {
    event_category: "engagement",
    event_label: title || eventId,
    item_id: eventId,
    send_to: GA_ID,
  });
  // Mark as conversion
  gaEvent("conversion", { event_label: "event_click", item_id: eventId });
}

export function trackPartnerClick(partnerId: string, name?: string) {
  gaEvent("partner_click", {
    event_category: "engagement",
    event_label: name || partnerId,
    item_id: partnerId,
    send_to: GA_ID,
  });
  gaEvent("conversion", { event_label: "partner_click", item_id: partnerId });
}

export function trackPageView(path: string) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("config", GA_ID, { page_path: path });
}
