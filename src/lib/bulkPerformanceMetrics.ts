/**
 * bulkPerformanceMetrics — HOTFIX Eventos em Lote (observabilidade)
 *
 * Store em memória (session-only, sem PII, sem persistência em banco) para
 * o painel "DESEMPENHO DO LOTE" dentro do EventoBulkForm.
 *
 * Regras:
 * - Nunca guarda nomes de eventos, arquivos, pessoas, telefones, URLs, tokens ou IDs.
 * - Apenas contadores agregados e durações em ms.
 * - Zera automaticamente quando um novo lote é iniciado.
 * - NÃO altera pipeline, prompts, Edge Functions, RLS, banco ou concorrência.
 */

export interface BulkPerfSnapshot {
  batchSize: number;
  batchStartedAt: number | null;
  firstReadyMs: number | null;
  totalBatchMs: number | null;
  extractDurations: number[];
  descriptionDurations: number[];
  cacheHits: number;
  cacheMisses: number;
  descriptionsGenerated: number;
  descriptionsErrored: number;
  duplicatesSkipped: number;
  extractionsErrored: number;
}

const empty = (): BulkPerfSnapshot => ({
  batchSize: 0,
  batchStartedAt: null,
  firstReadyMs: null,
  totalBatchMs: null,
  extractDurations: [],
  descriptionDurations: [],
  cacheHits: 0,
  cacheMisses: 0,
  descriptionsGenerated: 0,
  descriptionsErrored: 0,
  duplicatesSkipped: 0,
  extractionsErrored: 0,
});

let state = empty();
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}

export function subscribeBulkPerf(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function getBulkPerfSnapshot(): BulkPerfSnapshot {
  return state;
}

export function bulkPerfResetBatch(batchSize: number) {
  state = empty();
  state.batchSize = batchSize;
  state.batchStartedAt = performance.now();
  emit();
}

export function bulkPerfRecordCacheHit() {
  state = { ...state, cacheHits: state.cacheHits + 1 };
  emit();
}

export function bulkPerfRecordCacheMiss() {
  state = { ...state, cacheMisses: state.cacheMisses + 1 };
  emit();
}

export function bulkPerfRecordExtraction(durationMs: number, opts: { ok: boolean }) {
  if (opts.ok) {
    state = { ...state, extractDurations: [...state.extractDurations, durationMs] };
  } else {
    state = { ...state, extractionsErrored: state.extractionsErrored + 1 };
  }
  emit();
}

export function bulkPerfRecordFirstReady() {
  if (state.firstReadyMs !== null || state.batchStartedAt === null) return;
  state = { ...state, firstReadyMs: Math.round(performance.now() - state.batchStartedAt) };
  emit();
}

export function bulkPerfMarkBatchEnd() {
  if (state.batchStartedAt === null) return;
  state = { ...state, totalBatchMs: Math.round(performance.now() - state.batchStartedAt) };
  emit();
}

export function bulkPerfRecordDescription(
  durationMs: number,
  opts: { ok: boolean; skipped?: boolean },
) {
  if (opts.skipped) {
    state = { ...state, duplicatesSkipped: state.duplicatesSkipped + 1 };
  } else if (opts.ok) {
    state = {
      ...state,
      descriptionDurations: [...state.descriptionDurations, durationMs],
      descriptionsGenerated: state.descriptionsGenerated + 1,
    };
  } else {
    state = { ...state, descriptionsErrored: state.descriptionsErrored + 1 };
  }
  emit();
}

export function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}
