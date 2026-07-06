/**
 * bulkPerformanceMetrics — Onda 6 (performance real do Eventos em Lote)
 *
 * Store em memória (session-only, sem PII, sem persistência) usado pelo painel
 * "DESEMPENHO DO LOTE". Onda 6 adiciona:
 *   - contadores separados por tipo de erro (extração / descrição);
 *   - médias por etapa do pipeline (compress/hash/upload/extract);
 *   - concorrência máxima observada em extração e geração de descrição;
 *   - contador global de chamadas de IA.
 *
 * Regras:
 * - Nunca guarda nomes de eventos, arquivos, pessoas, telefones, URLs ou tokens.
 * - Apenas contadores agregados e durações em ms.
 * - Zera automaticamente quando um novo lote é iniciado.
 * - NÃO altera pipeline, prompts, Edge Functions, RLS, banco ou concorrência.
 */

export type BulkStage =
  | "compress"
  | "hash"
  | "cache_read"
  | "upload"
  | "extraction_ai"
  | "extraction_apply";

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
  /** Médias por etapa: soma e contagem para calcular avg sem armazenar séries longas. */
  stageSum: Record<BulkStage, number>;
  stageCount: Record<BulkStage, number>;
  /** Concorrência máxima observada em cada pool. */
  concurrencyExtraction: number;
  concurrencyDescription: number;
  /** Chamadas totais para as Edge Functions de IA. */
  aiCallsExtraction: number;
  aiCallsDescription: number;
}

const emptyStage = (): Record<BulkStage, number> => ({
  compress: 0,
  hash: 0,
  cache_read: 0,
  upload: 0,
  extraction_ai: 0,
  extraction_apply: 0,
});

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
  stageSum: emptyStage(),
  stageCount: emptyStage(),
  concurrencyExtraction: 0,
  concurrencyDescription: 0,
  aiCallsExtraction: 0,
  aiCallsDescription: 0,
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

/** Registra duração de uma etapa do pipeline (média agregada). */
export function bulkPerfRecordStage(stage: BulkStage, durationMs: number) {
  const sum = { ...state.stageSum, [stage]: state.stageSum[stage] + durationMs };
  const cnt = { ...state.stageCount, [stage]: state.stageCount[stage] + 1 };
  state = { ...state, stageSum: sum, stageCount: cnt };
  emit();
}

/** Observa concorrência máxima em um pool. */
export function bulkPerfObserveConcurrency(
  pool: "extraction" | "description",
  active: number,
) {
  if (pool === "extraction") {
    if (active > state.concurrencyExtraction) {
      state = { ...state, concurrencyExtraction: active };
      emit();
    }
  } else if (active > state.concurrencyDescription) {
    state = { ...state, concurrencyDescription: active };
    emit();
  }
}

/** Conta uma chamada de IA (Edge Function). */
export function bulkPerfRecordAiCall(kind: "extraction" | "description") {
  if (kind === "extraction") {
    state = { ...state, aiCallsExtraction: state.aiCallsExtraction + 1 };
  } else {
    state = { ...state, aiCallsDescription: state.aiCallsDescription + 1 };
  }
  emit();
}

export function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

export function stageAvg(snap: BulkPerfSnapshot, stage: BulkStage): number | null {
  const c = snap.stageCount[stage];
  if (!c) return null;
  return Math.round(snap.stageSum[stage] / c);
}
