/**
 * bulkEventsIndexedDbCache — FASE 10G.1.1
 *
 * Cache persistente para extrações de flyers (OCR/IA) usando IndexedDB
 * com fallback automático para localStorage.
 *
 * Características:
 *   • TTL padrão: 7 dias
 *   • keyed por hash (ou name|size|lastModified) + versão do extractor
 *   • armazena APENAS resultado + metadados (nada de base64 da imagem)
 *   • API assíncrona para não travar a UI no mobile
 *   • limite defensivo: ~500 entradas (descarta as mais antigas)
 *
 * NÃO ALTERA: Lista VIP, Reservas, Mesas, Check-in, CRM, Analytics,
 * Roxou pública, RLS, Nginx, Google OAuth.
 */
import { BULK_EXTRACTOR_VERSION } from "./bulkEventsImage";

const DB_NAME = "roxou_bulk_events";
const STORE = "extractions";
const DB_VERSION = 1;
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias
const MAX_ENTRIES = 500;
const LS_PREFIX = "bulk_extract_idb_fallback:";

export interface BulkCacheEntry<T = unknown> {
  key: string;
  data: T;
  image_url?: string | null;
  image_hash?: string | null;
  extractorVersion: string;
  bytesBefore?: number;
  bytesAfter?: number;
  at: number;
}

function log(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log("[BULK_IDB]", ...args);
}

function hasIndexedDB(): boolean {
  return typeof indexedDB !== "undefined";
}

let _db: IDBDatabase | null = null;
let _dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (_db) return Promise.resolve(_db);
  if (_dbPromise) return _dbPromise;
  if (!hasIndexedDB()) return Promise.resolve(null);
  _dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "key" });
          store.createIndex("at", "at");
        }
      };
      req.onsuccess = () => {
        _db = req.result;
        resolve(_db);
      };
      req.onerror = () => {
        log("openDb error", req.error);
        resolve(null);
      };
    } catch (err) {
      log("openDb threw", err);
      resolve(null);
    }
  });
  return _dbPromise;
}

export function keyForFile(file: File, hash?: string | null): string {
  const base = hash && hash.length > 6
    ? hash
    : `${file.name}|${file.size}|${file.lastModified}`;
  return `${BULK_EXTRACTOR_VERSION}:${base}`;
}

/* ─────────────────────────── localStorage fallback ─────────────────────────── */

function lsGet<T>(key: string): BulkCacheEntry<T> | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as BulkCacheEntry<T>;
  } catch {
    return null;
  }
}

function lsSet<T>(entry: BulkCacheEntry<T>): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LS_PREFIX + entry.key, JSON.stringify(entry));
  } catch (err) {
    log("ls quota", err);
  }
}

function lsDelAll(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LS_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

/* ─────────────────────────── API pública ─────────────────────────── */

export async function readBulkCacheIdb<T = unknown>(
  key: string,
  ttlMs = DEFAULT_TTL_MS,
): Promise<BulkCacheEntry<T> | null> {
  const db = await openDb();
  const isFresh = (e: BulkCacheEntry<T>) =>
    Date.now() - (e.at ?? 0) < ttlMs && e.extractorVersion === BULK_EXTRACTOR_VERSION;
  if (!db) {
    const e = lsGet<T>(key);
    return e && isFresh(e) ? e : null;
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => {
        const e = req.result as BulkCacheEntry<T> | undefined;
        if (e && isFresh(e)) resolve(e);
        else resolve(null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function writeBulkCacheIdb<T = unknown>(
  entry: Omit<BulkCacheEntry<T>, "at" | "extractorVersion"> & {
    extractorVersion?: string;
  },
): Promise<void> {
  const full: BulkCacheEntry<T> = {
    ...entry,
    extractorVersion: entry.extractorVersion ?? BULK_EXTRACTOR_VERSION,
    at: Date.now(),
  };
  const db = await openDb();
  if (!db) {
    lsSet(full);
    return;
  }
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(full);
      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        lsSet(full);
        resolve();
      };
    } catch {
      lsSet(full);
      resolve();
    }
  });
  // Limpeza assíncrona — não bloqueia
  void enforceLimit();
}

async function enforceLimit() {
  const db = await openDb();
  if (!db) return;
  try {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const countReq = store.count();
    countReq.onsuccess = () => {
      const c = countReq.result;
      if (c <= MAX_ENTRIES) return;
      const overflow = c - MAX_ENTRIES;
      const idx = store.index("at");
      let removed = 0;
      idx.openCursor().onsuccess = (e) => {
        const cur = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (!cur || removed >= overflow) return;
        cur.delete();
        removed += 1;
        cur.continue();
      };
    };
  } catch {
    /* ignore */
  }
}

export async function clearBulkCacheIdb(): Promise<void> {
  lsDelAll();
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
  log("cleared");
}

export async function bulkCacheCountIdb(): Promise<number> {
  const db = await openDb();
  if (!db) return 0;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).count();
      req.onsuccess = () => resolve(req.result ?? 0);
      req.onerror = () => resolve(0);
    } catch {
      resolve(0);
    }
  });
}
