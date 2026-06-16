/**
 * bulkRuntimeStats — FASE 10G.1.3
 *
 * Mini barramento global para o AdminSystem observar, em tempo real,
 * a fila de flyers e o worker de descrição sem precisar tocar nos
 * componentes que já estão renderizando o EventoBulkForm.
 *
 * NÃO altera RLS, nem regras de negócio. Tudo é client-side, in-memory.
 */

export interface BulkRuntimeSnapshot {
  /** Itens na fila de flyers (queued/uploading/extracting). */
  queueSize: number;
  /** Itens prontos. */
  readyCount: number;
  /** Itens com erro. */
  errorCount: number;
  /** Itens cancelados. */
  cancelledCount: number;
  /** Itens na fila do worker de descrição (queued + running). */
  descriptionQueueSize: number;
  /** Workers ativos (extração + descrição). */
  activeWorkers: number;
  /** Cancelamento atualmente solicitado. */
  cancelRequested: boolean;
  /** Heap usado (bytes) — quando o navegador expõe performance.memory. */
  heapUsed: number | null;
  /** Heap total (bytes). */
  heapTotal: number | null;
  /** Última atualização. */
  ts: number;
}

let _snapshot: BulkRuntimeSnapshot = {
  queueSize: 0,
  readyCount: 0,
  errorCount: 0,
  cancelledCount: 0,
  descriptionQueueSize: 0,
  activeWorkers: 0,
  cancelRequested: false,
  heapUsed: null,
  heapTotal: null,
  ts: Date.now(),
};

function readHeap(): { used: number | null; total: number | null } {
  try {
    // @ts-expect-error performance.memory só existe em Chromium
    const m = typeof performance !== "undefined" ? performance.memory : null;
    if (!m) return { used: null, total: null };
    return {
      used: typeof m.usedJSHeapSize === "number" ? m.usedJSHeapSize : null,
      total: typeof m.totalJSHeapSize === "number" ? m.totalJSHeapSize : null,
    };
  } catch {
    return { used: null, total: null };
  }
}

export function updateBulkRuntimeStats(patch: Partial<BulkRuntimeSnapshot>) {
  const heap = readHeap();
  _snapshot = {
    ..._snapshot,
    ...patch,
    heapUsed: heap.used,
    heapTotal: heap.total,
    ts: Date.now(),
  };
}

export function getBulkRuntimeStats(): BulkRuntimeSnapshot {
  // sempre refresca heap on read (barato)
  const heap = readHeap();
  return { ..._snapshot, heapUsed: heap.used, heapTotal: heap.total, ts: Date.now() };
}

export function resetBulkRuntimeStats() {
  _snapshot = {
    queueSize: 0,
    readyCount: 0,
    errorCount: 0,
    cancelledCount: 0,
    descriptionQueueSize: 0,
    activeWorkers: 0,
    cancelRequested: false,
    heapUsed: null,
    heapTotal: null,
    ts: Date.now(),
  };
}
