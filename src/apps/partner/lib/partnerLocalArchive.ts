/**
 * FASE 4 — Arquivamento visual local-only.
 *
 * Mantém no localStorage o conjunto de IDs marcados como "arquivados" pelo
 * parceiro a partir da Central de Limpeza. Não altera Supabase nem RLS.
 * Use apenas como camada visual de ocultação.
 */

export type ArchiveScope = "reservations" | "waitlist" | "events" | "notifications";

const KEY_PREFIX = "partner.localArchive.v1.";
const LAST_RUN_KEY = "partner.localArchive.lastRun.v1";

const safeRead = (k: string): string | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(k);
  } catch {
    return null;
  }
};
const safeWrite = (k: string, v: string): void => {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(k, v);
  } catch {
    /* noop */
  }
};

export function getArchivedIds(scope: ArchiveScope): Set<string> {
  const raw = safeRead(KEY_PREFIX + scope);
  if (!raw) return new Set();
  try {
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

export function archiveIds(scope: ArchiveScope, ids: string[]): number {
  if (!ids.length) return 0;
  const cur = getArchivedIds(scope);
  let added = 0;
  for (const id of ids) {
    if (!cur.has(id)) {
      cur.add(id);
      added += 1;
    }
  }
  safeWrite(KEY_PREFIX + scope, JSON.stringify(Array.from(cur)));
  markRun(scope);
  return added;
}

export function unarchiveId(scope: ArchiveScope, id: string): void {
  const cur = getArchivedIds(scope);
  if (cur.delete(id)) {
    safeWrite(KEY_PREFIX + scope, JSON.stringify(Array.from(cur)));
  }
}

export function clearScope(scope: ArchiveScope): void {
  safeWrite(KEY_PREFIX + scope, "[]");
  markRun(scope);
}

type RunMap = Partial<Record<ArchiveScope | "cache", string>>;

function readRuns(): RunMap {
  const raw = safeRead(LAST_RUN_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as RunMap;
  } catch {
    return {};
  }
}

export function markRun(scope: ArchiveScope | "cache"): void {
  const cur = readRuns();
  cur[scope] = new Date().toISOString();
  safeWrite(LAST_RUN_KEY, JSON.stringify(cur));
}

export function getLastRun(scope: ArchiveScope | "cache"): string | null {
  return readRuns()[scope] ?? null;
}

/** Limpa caches locais não-sensíveis (mantém auth e config principal). */
export function clearLocalCaches(): number {
  if (typeof window === "undefined") return 0;
  const ls = window.localStorage;
  let cleared = 0;
  const safePrefixes = [
    "partner.cache.",
    "partner.draft.",
    "roxou.cache.",
    "react-query-cache",
  ];
  const keys: string[] = [];
  for (let i = 0; i < ls.length; i += 1) {
    const k = ls.key(i);
    if (!k) continue;
    if (safePrefixes.some((p) => k.startsWith(p))) keys.push(k);
  }
  for (const k of keys) {
    try {
      ls.removeItem(k);
      cleared += 1;
    } catch {
      /* noop */
    }
  }
  markRun("cache");
  return cleared;
}
