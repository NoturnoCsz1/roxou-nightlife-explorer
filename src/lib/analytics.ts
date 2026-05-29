/**
 * Roxou Analytics — helper central de tracking.
 *
 * IMPORTANTE:
 * - Fire-and-forget: nunca lança erro, nunca bloqueia render.
 * - Suporta usuários anônimos e autenticados.
 * - Faz debounce de views repetidas por sessão (5 min).
 * - Espelha eventos no GA4 de forma segura.
 *
 * Este módulo é isolado: nenhum caller é adicionado neste PR.
 */

import { supabase } from "@/integrations/supabase/client";
import { gaEvent } from "@/lib/ga";

// ============================================================
// Tipos
// ============================================================

export type AnalyticsEventType =
  | "event_view"
  | "venue_view"
  | "event_click"
  | "venue_click"
  | "como_vou_click"
  | "save_event"
  | "unsave_event"
  | "ticket_click"
  | "aura_open"
  | "aura_ask"
  | "whatsapp_click"
  | "instagram_click"
  | "share_click"
  | "calendar_click"
  | "maps_click";

export interface TrackEventArgs {
  event_type: AnalyticsEventType;
  event_id?: string | null;
  venue_id?: string | null;
  source_page?: string;
  metadata?: Record<string, unknown>;
  city?: string | null;
  category?: string | null;
}

// ============================================================
// Helpers internos
// ============================================================

const SESSION_KEY = "roxou_sid";
const DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutos
const DEBOUNCEABLE: AnalyticsEventType[] = ["event_view", "venue_view"];

function getSessionId(): string | null {
  try {
    if (typeof window === "undefined") return null;
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return null;
  }
}

function getDeviceType(): string | null {
  try {
    if (typeof navigator === "undefined") return null;
    const ua = navigator.userAgent;
    if (/tablet|ipad/i.test(ua)) return "tablet";
    if (/mobile|iphone|android/i.test(ua)) return "mobile";
    return "desktop";
  } catch {
    return null;
  }
}

function getSourcePage(): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.location.pathname;
  } catch {
    return null;
  }
}

function getReferrer(): string | null {
  try {
    if (typeof document === "undefined") return null;
    return document.referrer || null;
  } catch {
    return null;
  }
}

/** Retorna o user_id atual (se logado) sem bloquear o fluxo. */
async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Verifica se o evento já foi disparado nesta sessão dentro da janela
 * de debounce. Aplica-se apenas a `event_view` e `venue_view`.
 * Retorna `true` se devemos pular (já disparado recentemente).
 */
function shouldDebounce(args: TrackEventArgs): boolean {
  if (!DEBOUNCEABLE.includes(args.event_type)) return false;
  try {
    if (typeof sessionStorage === "undefined") return false;
    const targetId = args.event_id || args.venue_id;
    if (!targetId) return false;
    const key = `roxou_analytics_${args.event_type}_${targetId}`;
    const last = sessionStorage.getItem(key);
    const now = Date.now();
    if (last) {
      const lastMs = Number(last);
      if (Number.isFinite(lastMs) && now - lastMs < DEBOUNCE_MS) {
        return true;
      }
    }
    sessionStorage.setItem(key, String(now));
    return false;
  } catch {
    return false;
  }
}

/** Espelha o evento no GA4 sem quebrar se gtag não estiver presente. */
function mirrorToGa(args: TrackEventArgs): void {
  try {
    gaEvent(args.event_type, {
      event_category: "roxou",
      item_id: args.event_id || args.venue_id || undefined,
      source_page: args.source_page,
      ...(args.metadata ?? {}),
    });
  } catch {
    // silencioso
  }
}

// ============================================================
// API pública
// ============================================================

/**
 * Registra um evento de analytics no Supabase + GA4.
 * Fire-and-forget: nunca lança, nunca bloqueia.
 */
export function trackEvent(args: TrackEventArgs): void {
  // Executa de forma totalmente assíncrona; chamadas nunca aguardam.
  void (async () => {
    try {
      if (!args || !args.event_type) return;

      if (shouldDebounce(args)) {
        return;
      }

      const session_id = getSessionId();
      const device_type = getDeviceType();
      const source_page = args.source_page ?? getSourcePage();
      const referrer = getReferrer();
      const user_id = await getCurrentUserId();

      // Espelha em GA4 (síncrono e seguro)
      mirrorToGa({ ...args, source_page: source_page ?? undefined });

      // Insere em analytics_events (RLS: anon+authenticated INSERT)
      await supabase.from("analytics_events").insert({
        event_type: args.event_type,
        event_id: args.event_id ?? null,
        venue_id: args.venue_id ?? null,
        user_id,
        session_id,
        source_page,
        referrer,
        device_type,
        city: args.city ?? null,
        category: args.category ?? null,
        metadata: (args.metadata ?? {}) as never,
      });
    } catch {
      // Engole qualquer erro: analytics nunca pode quebrar a UI.
    }
  })();
}
