import { supabase } from "@/integrations/supabase/client";

/**
 * Telemetria da página /expo2026 (Expo Prudente 2026).
 * Tabela: public.expo2026_analytics (inserts liberados para anon).
 */

export type ExpoEventName =
  | "expo_view"
  | "expo_map_open"
  | "expo_map_zoom"
  | "expo_map_reset"
  | "expo_sector_click"
  | "expo_programacao_view"
  | "expo_show_card_click"
  | "expo_eventou_click"
  | "expo_scroll_50"
  | "expo_scroll_90";

const SESSION_KEY = "expo2026:sid";

function getSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid =
        (crypto as any)?.randomUUID?.() ??
        `sid_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return `sid_${Date.now()}`;
  }
}

export function detectSource(): string {
  try {
    const ref = document.referrer || "";
    const ua = navigator.userAgent || "";
    const params = new URLSearchParams(window.location.search);
    const utm = params.get("utm_source")?.toLowerCase();
    if (utm) {
      if (utm.includes("insta") || utm.includes("ig")) return "Instagram";
      if (utm.includes("face") || utm.includes("fb")) return "Facebook";
      if (utm.includes("whats") || utm.includes("wa")) return "WhatsApp";
      if (utm.includes("google")) return "Google";
      return utm;
    }
    if (/Instagram/i.test(ua)) return "Instagram";
    if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "Facebook";
    if (/WhatsApp/i.test(ua)) return "WhatsApp";
    if (!ref) return "Direct";
    const host = new URL(ref).hostname.toLowerCase();
    if (host.includes("instagram")) return "Instagram";
    if (host.includes("facebook") || host.includes("fb.")) return "Facebook";
    if (host.includes("whatsapp") || host.includes("wa.me")) return "WhatsApp";
    if (host.includes("google")) return "Google";
    return host || "Direct";
  } catch {
    return "Direct";
  }
}

function baseMetadata() {
  if (typeof window === "undefined") return {};
  return {
    source: detectSource(),
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    userAgent: navigator.userAgent,
    referrer: document.referrer || null,
    path: window.location.pathname + window.location.search,
  };
}

const sent = new Set<string>();

/** Dispara um evento de telemetria. `once` evita reenvio na sessão. */
export function trackExpoEvent(
  event: ExpoEventName,
  metadata: Record<string, unknown> = {},
  options: { once?: boolean } = {},
) {
  if (typeof window === "undefined") return;
  const dedupeKey = options.once ? event : `${event}:${Date.now()}`;
  if (options.once) {
    if (sent.has(event)) return;
    sent.add(event);
  }
  void (async () => {
    try {
      await supabase.from("expo2026_analytics" as any).insert({
        event,
        session_id: getSessionId(),
        metadata: { ...baseMetadata(), ...metadata },
      });
    } catch {
      /* silencioso — analytics não pode quebrar a UI */
    }
  })();
  return dedupeKey;
}
