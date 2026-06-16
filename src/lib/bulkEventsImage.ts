/**
 * bulkEventsImage — FIX bulk_events_performance
 *
 * Helpers de performance para o EventoBulkForm:
 *   • compressImage  → resize (maxDim 1600) + re-encode JPEG q=0.8
 *   • cacheKeyForFile / readExtractionCache / writeExtractionCache
 *
 * Cache fica em sessionStorage e é keyed por
 * `<extractorVersion>:<name>|<size>|<lastModified>` (rápido, sem hash).
 * Hashes reais (sha256) continuam sendo gerados em paralelo para
 * detecção de duplicidade na base.
 */
const LOG = (...args: unknown[]) => {
  if (typeof console !== "undefined") {
    // eslint-disable-next-line no-console
    console.log("[BULK_EVENTS]", ...args);
  }
};

export const BULK_EXTRACTOR_VERSION = "v1-2026-06-16";

const MIN_COMPRESS_BYTES = 500 * 1024; // < 500KB → mantém original
const DEFAULT_MAX_DIM = 1600;
const DEFAULT_QUALITY = 0.8;

export interface CompressResult {
  file: File;
  bytesBefore: number;
  bytesAfter: number;
  compressed: boolean;
}

/**
 * Reduz a imagem para `maxDim` no maior lado e re-codifica como JPEG.
 * Retorna o arquivo original se já estiver pequeno ou se a compressão
 * não trouxer ganho.
 */
export async function compressImage(
  file: File,
  maxDim = DEFAULT_MAX_DIM,
  quality = DEFAULT_QUALITY,
): Promise<CompressResult> {
  const bytesBefore = file.size;
  if (!file.type.startsWith("image/") || bytesBefore < MIN_COMPRESS_BYTES) {
    return { file, bytesBefore, bytesAfter: bytesBefore, compressed: false };
  }
  try {
    const bitmap = await createImageBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, maxDim / longest);
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return { file, bytesBefore, bytesAfter: bytesBefore, compressed: false };
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality),
    );
    if (!blob || blob.size >= bytesBefore) {
      return { file, bytesBefore, bytesAfter: bytesBefore, compressed: false };
    }
    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    const compressed = new File([blob], newName, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
    LOG("resized", {
      file: file.name,
      size_before: bytesBefore,
      size_after: compressed.size,
      dim: `${w}x${h}`,
    });
    return {
      file: compressed,
      bytesBefore,
      bytesAfter: compressed.size,
      compressed: true,
    };
  } catch (err) {
    LOG("compress fallback", file.name, err);
    return { file, bytesBefore, bytesAfter: bytesBefore, compressed: false };
  }
}

/* ─────────────────────────────────────────
   Cache de extração (sessionStorage)
   ───────────────────────────────────────── */

export interface CachedExtraction<T = unknown> {
  at: number;
  data: T;
  image_url?: string | null;
  image_hash?: string | null;
}

export function cacheKeyForFile(file: File): string {
  return `bulk_extract:${BULK_EXTRACTOR_VERSION}:${file.name}|${file.size}|${file.lastModified}`;
}

export function readExtractionCache<T = unknown>(
  file: File,
): CachedExtraction<T> | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(cacheKeyForFile(file));
    if (!raw) return null;
    return JSON.parse(raw) as CachedExtraction<T>;
  } catch {
    return null;
  }
}

export function writeExtractionCache<T = unknown>(
  file: File,
  entry: Omit<CachedExtraction<T>, "at">,
): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(
      cacheKeyForFile(file),
      JSON.stringify({ at: Date.now(), ...entry }),
    );
  } catch (err) {
    LOG("cache write failed (quota?)", err);
  }
}

export function clearExtractionCacheFor(file: File): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(cacheKeyForFile(file));
  } catch {
    /* ignore */
  }
}

export const bulkLog = LOG;
