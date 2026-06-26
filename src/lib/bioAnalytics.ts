/**
 * Bio Analytics — tracker fire-and-forget.
 * Não salva PII. visitor_id anônimo em localStorage.
 */
import { supabase } from "@/integrations/supabase/client";

export type BioEventType =
  | "bio_view"
  | "link_click"
  | "whatsapp_click"
  | "menu_view"
  | "menu_item_click"
  | "reservation_click"
  | "vip_click"
  | "transport_click"
  | "map_click"
  | "social_click";

const VISITOR_KEY = "roxou_bio_vid";
const SESSION_KEY = "roxou_bio_sid";

function getVisitorId(): string {
  try {
    let v = localStorage.getItem(VISITOR_KEY);
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, v);
    }
    return v;
  } catch {
    return "anon";
  }
}

function getSessionId(): string {
  try {
    let s = sessionStorage.getItem(SESSION_KEY);
    if (!s) {
      s = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, s);
    }
    return s;
  } catch {
    return "anon";
  }
}

function getDevice(): string {
  try {
    const ua = navigator.userAgent;
    if (/tablet|ipad/i.test(ua)) return "tablet";
    if (/mobile|iphone|android/i.test(ua)) return "mobile";
    return "desktop";
  } catch {
    return "unknown";
  }
}

export function trackBioEvent(args: {
  bio_id: string;
  event_type: BioEventType;
  link_id?: string | null;
  source?: string;
  metadata?: Record<string, unknown>;
}) {
  void (async () => {
    try {
      await supabase.from("bio_analytics_events" as never).insert({
        bio_id: args.bio_id,
        link_id: args.link_id ?? null,
        event_type: args.event_type,
        visitor_id: getVisitorId(),
        session_id: getSessionId(),
        source: args.source ?? null,
        referrer: typeof document !== "undefined" ? document.referrer || null : null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        device: getDevice(),
        metadata: (args.metadata ?? {}) as never,
      } as never);
    } catch {
      /* silencioso */
    }
  })();
}
