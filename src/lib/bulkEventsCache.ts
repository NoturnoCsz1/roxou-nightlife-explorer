/**
 * bulkEventsCache — FASE 10G.2
 *
 * Wrapper canônico do cache de extração de flyers. Mantemos os
 * helpers originais em `bulkEventsImage.ts` (compressImage + cache)
 * para evitar quebra; este módulo apenas re-exporta e expõe métricas
 * (hits/misses/writes) consumidas por `/admin/system` e pelo painel
 * de progresso do EventoBulkForm.
 *
 * NÃO altera Lista VIP, Reservas, Mesas, Check-in, CRM ou Analytics.
 */
import {
  cacheKeyForFile,
  clearExtractionCacheFor,
  readExtractionCache as _read,
  writeExtractionCache as _write,
  BULK_EXTRACTOR_VERSION,
  type CachedExtraction,
} from "./bulkEventsImage";

const stats = {
  hits: 0,
  misses: 0,
  writes: 0,
};

export function getBulkCacheStats() {
  return { ...stats };
}

export function resetBulkCacheStats() {
  stats.hits = 0;
  stats.misses = 0;
  stats.writes = 0;
}

export function readBulkCache<T = unknown>(
  file: File,
): CachedExtraction<T> | null {
  const entry = _read<T>(file);
  if (entry) stats.hits += 1;
  else stats.misses += 1;
  return entry;
}

export function writeBulkCache<T = unknown>(
  file: File,
  entry: Omit<CachedExtraction<T>, "at">,
): void {
  _write<T>(file, entry);
  stats.writes += 1;
}

export {
  cacheKeyForFile,
  clearExtractionCacheFor,
  BULK_EXTRACTOR_VERSION,
};
export type { CachedExtraction };
