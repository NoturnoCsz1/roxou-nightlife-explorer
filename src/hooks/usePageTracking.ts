import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackPageView } from "@/lib/ga";

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|iphone|android/i.test(ua)) return "mobile";
  return "desktop";
}

function getSessionId(): string {
  let sid = sessionStorage.getItem("roxou_sid");
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem("roxou_sid", sid);
  }
  return sid;
}

export function usePageTracking(extra?: { event_id?: string; partner_id?: string }) {
  const location = useLocation();

  useEffect(() => {
    const sessionId = getSessionId();
    const deviceType = getDeviceType();

    // Insert page view
    supabase.from("page_views").insert({
      page_path: location.pathname,
      device_type: deviceType,
      session_id: sessionId,
      event_id: extra?.event_id || null,
      partner_id: extra?.partner_id || null,
    }).then(() => {});

    // Upsert visitor session
    supabase.from("visitor_sessions").upsert(
      {
        session_id: sessionId,
        last_seen_at: new Date().toISOString(),
        device_type: deviceType,
      },
      { onConflict: "session_id" }
    ).then(() => {});
  }, [location.pathname, extra?.event_id, extra?.partner_id]);
}
