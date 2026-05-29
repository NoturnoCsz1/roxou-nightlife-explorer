/**
 * Tracking leve para a página /jogos.
 * Insere em sports_match_events sem bloquear UI. Anônimo permitido (RLS público).
 */
import { supabase } from "@/integrations/supabase/client";

export type MatchAction =
  | "open"
  | "venue_click"
  | "stream_click"
  | "save"
  | "share"
  | "chat_open";

let cachedSession: string | null = null;
function getSessionId(): string {
  if (cachedSession) return cachedSession;
  try {
    const k = "roxou_session_id";
    let v = localStorage.getItem(k);
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem(k, v);
    }
    cachedSession = v;
    return v;
  } catch {
    cachedSession = crypto.randomUUID();
    return cachedSession;
  }
}

export async function trackMatchEvent(params: {
  matchExternalId: string;
  matchSlug?: string;
  action: MatchAction;
  partnerId?: string | null;
}) {
  try {
    await supabase.from("sports_match_events").insert({
      match_external_id: params.matchExternalId,
      match_slug: params.matchSlug ?? null,
      action: params.action,
      partner_id: params.partnerId ?? null,
      session_id: getSessionId(),
    });
  } catch {
    // tracking nunca quebra UI
  }
}

export async function incrementMatchView(slug: string) {
  try {
    await supabase.rpc("increment_match_view", { _slug: slug });
  } catch {
    /* noop */
  }
}
