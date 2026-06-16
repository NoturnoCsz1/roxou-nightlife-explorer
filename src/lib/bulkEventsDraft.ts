/**
 * bulkEventsDraft — FASE 10G.1.3
 *
 * Auto-save em IndexedDB do rascunho de processamento em lote.
 * Persiste metadados leves (form + status) — NUNCA File ou base64
 * de imagem. TTL 24h. Fallback para localStorage.
 *
 * Não substitui o cache de extração; serve apenas para recuperar
 * sessão se o admin atualizar a página no meio do trabalho.
 */

const DB_NAME = "roxou_bulk_draft";
const STORE = "drafts";
const DB_VERSION = 1;
const KEY = "current";
const TTL_MS = 24 * 60 * 60 * 1000;
const LS_KEY = "roxou_bulk_draft_v1";

export interface BulkDraftPayload<T = unknown> {
  ts: number;
  items: T[];
}

let _db: IDBDatabase | null = null;
let _dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (_db) return Promise.resolve(_db);
  if (_dbPromise) return _dbPromise;
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  _dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "key" });
        }
      };
      req.onsuccess = () => {
        _db = req.result;
        resolve(_db);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return _dbPromise;
}

export async function saveBulkDraft<T>(items: T[]): Promise<void> {
  const payload: BulkDraftPayload<T> & { key: string } = {
    key: KEY,
    ts: Date.now(),
    items,
  };
  const db = await openDb();
  if (!db) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(payload));
    } catch { /* quota */ }
    return;
  }
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(payload);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch { resolve(); }
  });
}

export async function loadBulkDraft<T>(): Promise<BulkDraftPayload<T> | null> {
  const db = await openDb();
  const isFresh = (p: BulkDraftPayload<T>) => Date.now() - p.ts < TTL_MS && Array.isArray(p.items) && p.items.length > 0;
  if (!db) {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw) as BulkDraftPayload<T>;
      return isFresh(p) ? p : null;
    } catch { return null; }
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => {
        const p = req.result as (BulkDraftPayload<T> & { key: string }) | undefined;
        if (p && isFresh(p)) resolve({ ts: p.ts, items: p.items });
        else resolve(null);
      };
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

export async function clearBulkDraft(): Promise<void> {
  try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch { resolve(); }
  });
}
