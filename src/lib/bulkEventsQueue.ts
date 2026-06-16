/**
 * bulkEventsQueue — FASE 10G.2
 *
 * Fila de processamento de flyers com concorrência limitada.
 * O EventoBulkForm continua sendo a UI canônica; este módulo
 * concentra apenas a máquina de estados + pool de workers, para
 * que possamos reaproveitar em outros lugares (story-agenda,
 * importação em lote do Eventou etc).
 *
 * Estados:
 *   queued       → na fila, ainda não despachado
 *   uploading    → comprimindo + subindo
 *   extracting   → IA lendo o flyer
 *   ready        → pronto para revisão
 *   error        → falhou (pode retry)
 */
export type BulkQueueStatus =
  | "queued"
  | "uploading"
  | "extracting"
  | "ready"
  | "error";

export interface BulkQueueItem<T = unknown> {
  id: string;
  status: BulkQueueStatus;
  payload: T;
  startedAt?: number;
  finishedAt?: number;
  durationMs?: number;
  errorMessage?: string;
}

export interface BulkQueueOptions<T> {
  /** Máximo de itens processados simultaneamente. Default 3. */
  concurrency?: number;
  /** Handler real de cada item. */
  process: (
    item: BulkQueueItem<T>,
    setStatus: (s: BulkQueueStatus) => void,
  ) => Promise<void>;
  /** Notifica a UI sempre que um item mudar. */
  onChange?: (item: BulkQueueItem<T>) => void;
}

export interface BulkQueueMetrics {
  total: number;
  done: number;
  errors: number;
  inflight: number;
  averageMs: number;
}

/**
 * Cria uma fila com pool de workers. Devolve `enqueue`, `runAll`,
 * `metrics` e `retryFailed` para o consumidor.
 */
export function createBulkQueue<T>({
  concurrency = 3,
  process,
  onChange,
}: BulkQueueOptions<T>) {
  const items: BulkQueueItem<T>[] = [];

  function notify(item: BulkQueueItem<T>) {
    onChange?.({ ...item });
  }

  function enqueue(id: string, payload: T) {
    items.push({ id, status: "queued", payload });
  }

  function metrics(): BulkQueueMetrics {
    const done = items.filter((i) => i.status === "ready").length;
    const errors = items.filter((i) => i.status === "error").length;
    const inflight = items.filter(
      (i) => i.status === "uploading" || i.status === "extracting",
    ).length;
    const durations = items
      .map((i) => i.durationMs ?? 0)
      .filter((d) => d > 0);
    const averageMs = durations.length
      ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
      : 0;
    return { total: items.length, done, errors, inflight, averageMs };
  }

  async function runOne(item: BulkQueueItem<T>) {
    item.startedAt = performance.now();
    item.status = "uploading";
    notify(item);
    try {
      await process(item, (s) => {
        item.status = s;
        notify(item);
      });
      item.status = "ready";
    } catch (err) {
      item.status = "error";
      item.errorMessage = err instanceof Error ? err.message : String(err);
    } finally {
      item.finishedAt = performance.now();
      item.durationMs = Math.round(
        (item.finishedAt ?? 0) - (item.startedAt ?? 0),
      );
      notify(item);
    }
  }

  async function runAll(filter?: (i: BulkQueueItem<T>) => boolean) {
    const queue = items.filter(filter ?? ((i) => i.status === "queued"));
    let cursor = 0;
    const workers = Array.from(
      { length: Math.min(concurrency, queue.length) },
      async () => {
        while (true) {
          const idx = cursor++;
          if (idx >= queue.length) return;
          await runOne(queue[idx]);
        }
      },
    );
    await Promise.all(workers);
  }

  function retryFailed() {
    items
      .filter((i) => i.status === "error")
      .forEach((i) => {
        i.status = "queued";
        i.errorMessage = undefined;
        notify(i);
      });
    return runAll((i) => i.status === "queued");
  }

  return { enqueue, runAll, retryFailed, metrics, items };
}
