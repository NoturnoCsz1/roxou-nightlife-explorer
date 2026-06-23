/**
 * FASE 5 — Persistência de dispensa/resolução de notificações operacionais.
 *
 * Camada local (localStorage) — não altera Supabase nem RLS.
 * Estados:
 *  - dismissed  → usuário clicou no X. Não volta após reload.
 *  - resolved   → ação foi concluída (ex: mesa liberada).
 *  - read       → usuário abriu/visualizou (não oculta, só marca).
 *
 * Cada notificação tem um `id` estável (ex: `release-<uuid>`), o que permite
 * persistir o estado mesmo entre recargas.
 */

const KEY_DISMISSED = "partner.notif.dismissed.v1";
const KEY_RESOLVED = "partner.notif.resolved.v1";
const KEY_READ = "partner.notif.read.v1";

type State = "dismissed" | "resolved" | "read";

const KEY: Record<State, string> = {
  dismissed: KEY_DISMISSED,
  resolved: KEY_RESOLVED,
  read: KEY_READ,
};

const safeRead = (k: string): Record<string, string> => {
  try {
    if (typeof window === "undefined") return {};
    const raw = window.localStorage.getItem(k);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
};

const safeWrite = (k: string, v: Record<string, string>): void => {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(k, JSON.stringify(v));
    }
  } catch {
    /* noop */
  }
};

export function getNotifState(state: State): Record<string, string> {
  return safeRead(KEY[state]);
}

export function getDismissedIds(): Set<string> {
  return new Set(Object.keys(safeRead(KEY_DISMISSED)));
}

export function getResolvedIds(): Set<string> {
  return new Set(Object.keys(safeRead(KEY_RESOLVED)));
}

export function getReadIds(): Set<string> {
  return new Set(Object.keys(safeRead(KEY_READ)));
}

export function markNotif(id: string, state: State): void {
  const cur = safeRead(KEY[state]);
  cur[id] = new Date().toISOString();
  safeWrite(KEY[state], cur);
}

export function unmarkNotif(id: string, state: State): void {
  const cur = safeRead(KEY[state]);
  if (id in cur) {
    delete cur[id];
    safeWrite(KEY[state], cur);
  }
}

export function clearResolved(): number {
  const count = Object.keys(safeRead(KEY_RESOLVED)).length;
  safeWrite(KEY_RESOLVED, {});
  return count;
}

export function clearAllNotifState(): void {
  safeWrite(KEY_DISMISSED, {});
  safeWrite(KEY_RESOLVED, {});
  safeWrite(KEY_READ, {});
}

/** Filtra notificações ocultando dismissed e resolved. */
export function filterVisibleNotifs<T extends { id: string }>(items: T[]): T[] {
  const dismissed = getDismissedIds();
  const resolved = getResolvedIds();
  return items.filter((it) => !dismissed.has(it.id) && !resolved.has(it.id));
}
