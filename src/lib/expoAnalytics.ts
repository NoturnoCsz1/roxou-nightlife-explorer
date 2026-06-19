import { supabase } from "@/integrations/supabase/client";

/**
 * Telemetria da página /expo2026 (Expo Prudente 2026).
 * Tabela: public.expo2026_analytics (inserts liberados para anon).
 */

export type ExpoEventName =
  | "expo_view"
  | "expo_map_open"
  | "expo_map_zoom"
  | "expo_map_pan"
  | "expo_map_reset"
  | "expo_sector_click"
  | "expo_programacao_view"
  | "expo_show_card_click"
  | "expo_eventou_click"
  | "expo_scroll_25"
  | "expo_scroll_50"
  | "expo_scroll_75"
  | "expo_scroll_90"
  | "expo_scroll_100"
  | "expo_engagement_30s"
  | "expo_engagement_60s"
  | "expo_engagement_120s"
  | "expo_faq_open"
  | "expo_google_organic"
  | "expo_google_discover"
  | "expo_google_images"
  | "expo_copy_link"
  | "expo_share_native"
  | "expo_performance"
  | "expo_camarotes_view"
  | "expo_camarotes_map_open"
  | "expo_camarotes_whatsapp_click"
  | "expo_camarote_click"
  | "expo_camarote_status_change"
  | "expo_camarote_sold_view"
  | "expo_camarote_reserved_view"
  | "expo_grade_oficial_view"
  | "expo_grade_oficial_open"
  | "expo_grade_oficial_zoom"
  | "expo_grade_oficial_share"
  | "expo_grade_oficial_buy_click";

const SESSION_KEY = "expo2026:sid";
const ONCE_PREFIX = "expo2026:once:";

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
    const utmMedium = params.get("utm_medium")?.toLowerCase() || "";

    if (utm) {
      if (utm.includes("insta") || utm.includes("ig")) {
        if (utmMedium.includes("story") || utmMedium.includes("stories")) return "Instagram Stories";
        if (utmMedium.includes("feed") || utmMedium.includes("post")) return "Instagram Feed";
        return "Instagram";
      }
      if (utm.includes("face") || utm.includes("fb")) return "Facebook";
      if (utm.includes("whats") || utm.includes("wa")) return "WhatsApp";
      if (utm.includes("google")) {
        if (utmMedium.includes("discover")) return "Google Discover";
        if (utmMedium.includes("image")) return "Google Images";
        return "Google Search";
      }
      return utm;
    }

    if (/Instagram/i.test(ua)) return "Instagram";
    if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "Facebook";
    if (/WhatsApp/i.test(ua)) return "WhatsApp";
    if (!ref) return "Direct";

    const refUrl = (() => {
      try {
        return new URL(ref);
      } catch {
        return null;
      }
    })();
    const host = refUrl?.hostname.toLowerCase() ?? "";
    const path = refUrl?.pathname.toLowerCase() ?? "";

    if (host.includes("instagram")) return "Instagram";
    if (host.includes("facebook") || host.includes("fb.")) return "Facebook";
    if (host.includes("whatsapp") || host.includes("wa.me")) return "WhatsApp";
    if (host.includes("google")) {
      if (path.includes("/imgres") || path.includes("/images")) return "Google Images";
      // Google Discover usa googleapp:// ou parâmetros específicos
      if (/googleapp|GSA/i.test(ua) || path.includes("/url")) {
        // Heurística: tráfego do app do Google sem termo de busca → provável Discover
        const hasQ = refUrl?.searchParams.has("q");
        return hasQ ? "Google Search" : "Google Discover";
      }
      return "Google Search";
    }
    return host || "Other";
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

function alreadySent(key: string): boolean {
  try {
    if (sessionStorage.getItem(ONCE_PREFIX + key)) return true;
    sessionStorage.setItem(ONCE_PREFIX + key, "1");
    return false;
  } catch {
    return false;
  }
}

/** Dispara um evento de telemetria. `once` deduplica via sessionStorage (sobrevive a re-renders). */
export function trackExpoEvent(
  event: ExpoEventName,
  metadata: Record<string, unknown> = {},
  options: { once?: boolean; onceKey?: string } = {},
) {
  if (typeof window === "undefined") return;
  if (options.once) {
    const key = options.onceKey ?? event;
    if (alreadySent(key)) return;
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
}

/** Cria uma versão debounced de trackExpoEvent (para zoom/pan/pinch). */
export function createDebouncedTracker(delay = 500) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<typeof trackExpoEvent> | null = null;
  return (...args: Parameters<typeof trackExpoEvent>) => {
    lastArgs = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      if (lastArgs) trackExpoEvent(...lastArgs);
      timer = null;
      lastArgs = null;
    }, delay);
  };
}
