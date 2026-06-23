/**
 * FASE 5 — Sessões operacionais diárias por parceiro.
 *
 * Camada local (localStorage) para abrir/encerrar a operação de cada dia.
 * Não altera Supabase nem RLS. Permite migrar para tabela futuramente,
 * mas hoje basta para reset visual de notificações e separação por dia.
 *
 * Dia operacional usa timezone SP. Eventos/reservas até 05:00 ainda
 * pertencem à sessão da noite anterior.
 */
import { getDateKeySP } from "@/lib/dateUtils";
import { clearResolved, clearAllNotifState } from "./partnerNotificationDismissal";

export type SessionStatus = "open" | "closed" | "archived";

export interface PartnerSession {
  id: string;
  partnerId: string;
  dayKey: string; // YYYY-MM-DD (operational day in SP)
  openedAt: string;
  closedAt: string | null;
  status: SessionStatus;
}

const KEY_PREFIX = "partner.session.v1."; // partner.session.v1.<partnerId>
const HISTORY_PREFIX = "partner.session.history.v1."; // history per partner

const safeRead = <T,>(k: string, fallback: T): T => {
  try {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(k);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const safeWrite = (k: string, v: unknown): void => {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(k, JSON.stringify(v));
    }
  } catch {
    /* noop */
  }
};

/** Retorna o "dia operacional" SP considerando corte às 05:00. */
export function getOperationalDayKey(date: Date = new Date()): string {
  // Calcula hora SP e se for < 05:00 considera o dia anterior.
  const spParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    hour12: false,
  }).format(date);
  const hour = Number.parseInt(spParts, 10);
  let anchor = date;
  if (!Number.isNaN(hour) && hour < 5) {
    anchor = new Date(date.getTime() - 6 * 60 * 60 * 1000);
  }
  return getDateKeySP(anchor);
}

export function getCurrentSession(partnerId: string): PartnerSession | null {
  if (!partnerId) return null;
  return safeRead<PartnerSession | null>(KEY_PREFIX + partnerId, null);
}

export function getSessionHistory(partnerId: string): PartnerSession[] {
  if (!partnerId) return [];
  return safeRead<PartnerSession[]>(HISTORY_PREFIX + partnerId, []);
}

export function openSession(partnerId: string): PartnerSession {
  const dayKey = getOperationalDayKey();
  const now = new Date().toISOString();
  const existing = getCurrentSession(partnerId);
  // Se já há sessão aberta no mesmo dia, retorna ela.
  if (existing && existing.status === "open" && existing.dayKey === dayKey) {
    return existing;
  }
  // Se há outra sessão aberta de dia diferente, encerra automaticamente.
  if (existing && existing.status === "open") {
    closeSession(partnerId);
  }
  const session: PartnerSession = {
    id: `${partnerId}-${dayKey}-${Date.now()}`,
    partnerId,
    dayKey,
    openedAt: now,
    closedAt: null,
    status: "open",
  };
  safeWrite(KEY_PREFIX + partnerId, session);
  // Limpa notificações resolvidas antigas ao abrir nova sessão.
  clearResolved();
  return session;
}

export function closeSession(partnerId: string): PartnerSession | null {
  const cur = getCurrentSession(partnerId);
  if (!cur || cur.status !== "open") return null;
  const closed: PartnerSession = {
    ...cur,
    closedAt: new Date().toISOString(),
    status: "closed",
  };
  // Move para histórico
  const hist = getSessionHistory(partnerId);
  hist.unshift(closed);
  safeWrite(HISTORY_PREFIX + partnerId, hist.slice(0, 90)); // mantém últimos 90
  safeWrite(KEY_PREFIX + partnerId, null);
  // Encerrar operação resolve todas as notificações pendentes.
  clearAllNotifState();
  return closed;
}

export function reopenSession(partnerId: string, sessionId: string): PartnerSession | null {
  const hist = getSessionHistory(partnerId);
  const idx = hist.findIndex((s) => s.id === sessionId);
  if (idx === -1) return null;
  const s = hist[idx];
  const todayKey = getOperationalDayKey();
  // Só permite reabrir sessão de hoje ou ontem.
  if (s.dayKey !== todayKey) {
    const yesterday = getOperationalDayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
    if (s.dayKey !== yesterday) return null;
  }
  const reopened: PartnerSession = { ...s, closedAt: null, status: "open" };
  hist.splice(idx, 1);
  safeWrite(HISTORY_PREFIX + partnerId, hist);
  safeWrite(KEY_PREFIX + partnerId, reopened);
  return reopened;
}

export function isSessionOpen(partnerId: string): boolean {
  const cur = getCurrentSession(partnerId);
  if (!cur) return false;
  if (cur.status !== "open") return false;
  return cur.dayKey === getOperationalDayKey();
}

/* Helpers de status de reserva: para distinguir ativas x encerradas. */
export const RESERVATION_ACTIVE_STATUSES = new Set([
  "pending",
  "pending_payment",
  "confirmed",
  "waiting",
  "notified",
  "accepted",
  "checked_in",
  "active",
]);

export const RESERVATION_CLOSED_STATUSES = new Set([
  "cancelled",
  "expired",
  "completed",
  "no_show",
  "closed",
]);

export function isReservationActive(status: string | null | undefined): boolean {
  if (!status) return false;
  return RESERVATION_ACTIVE_STATUSES.has(status);
}

export function isReservationClosed(status: string | null | undefined): boolean {
  if (!status) return false;
  return RESERVATION_CLOSED_STATUSES.has(status);
}
