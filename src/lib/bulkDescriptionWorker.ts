/**
 * FASE 10G.1.2 — Worker dedicado de geração de descrição.
 *
 * Roda `generate-description` como etapa assíncrona separada da extração
 * do flyer. Erro aqui NUNCA invalida o item — o flyer continua editável.
 *
 * Uso:
 *   const worker = getDescriptionWorker();
 *   worker.enqueue({ id, payload, onUpdate });
 *   // worker.requeue(id)       → reprocessa um item
 *   // worker.requeueErrors()   → reprocessa todos os com erro
 *
 * Concorrência padrão: 2 chamadas simultâneas.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  bulkPerfObserveConcurrency,
  bulkPerfRecordAiCall,
} from "./bulkPerformanceMetrics";

export type DescriptionStatus =
  | "idle"
  | "queued"
  | "running"
  | "done"
  | "error";

export interface DescriptionPayload {
  title: string;
  venue_name?: string | null;
  address?: string | null;
  date_time?: string | null;
  category?: string | null;
  sub_category?: string | null;
  partner_id?: string | null;
  instagram?: string | null;
  ticket_url?: string | null;
  time_is_unknown?: boolean;
  seed_index?: number;
  previous_descriptions?: string[];
}

export interface DescriptionResult {
  description_html?: string;
  short_summary?: string;
  meta_title?: string;
  meta_description?: string;
  instagram_caption?: string;
  ai_confidence_score?: number | null;
  ai_warnings?: string[];
  title?: string;
  raw: Record<string, unknown> | null;
}

export type DescriptionUpdate =
  | { status: "queued" }
  | { status: "running" }
  | { status: "done"; result: DescriptionResult; durationMs: number }
  | { status: "error"; message: string };

interface Job {
  id: string;
  payload: DescriptionPayload;
  onUpdate: (u: DescriptionUpdate) => void;
  attempts: number;
}

const log = (event: string, info: Record<string, unknown>) => {
  try {
    // eslint-disable-next-line no-console
    console.info(`[BULK_DESCRIPTION] ${event}`, info);
  } catch {
    /* ignore */
  }
};

class DescriptionWorker {
  private queue: Job[] = [];
  private active = 0;
  private readonly concurrency: number;
  /** Itens marcados como erro — usados por `requeueErrors`. */
  private errored = new Map<string, Job>();
  /** Itens atualmente na fila ou em execução — evita enfileiramento duplicado. */
  private pending = new Set<string>();

  constructor(concurrency = 2) {
    this.concurrency = concurrency;
  }

  /**
   * Enfileira um item. Retorna `false` se o mesmo `id` já está aguardando
   * ou em execução (evita chamada dupla de `generate-description` para o
   * mesmo evento).
   */
  enqueue(job: Omit<Job, "attempts">): boolean {
    if (this.pending.has(job.id)) {
      log("skip_duplicate", { id: job.id });
      return false;
    }
    this.errored.delete(job.id);
    const full: Job = { ...job, attempts: 0 };
    this.pending.add(job.id);
    this.queue.push(full);
    log("queued", { id: job.id });
    job.onUpdate({ status: "queued" });
    this.pump();
    return true;
  }

  /** Reprocessa um item específico (deve ter sido enfileirado antes). */
  requeue(id: string) {
    const prev = this.errored.get(id);
    if (!prev) return false;
    if (this.pending.has(id)) return false;
    this.errored.delete(id);
    prev.attempts = 0;
    this.pending.add(id);
    this.queue.push(prev);
    prev.onUpdate({ status: "queued" });
    this.pump();
    return true;
  }

  /** Reprocessa todos os itens em erro. Retorna a quantidade re-enfileirada. */
  requeueErrors(): number {
    let n = 0;
    for (const id of Array.from(this.errored.keys())) {
      if (this.requeue(id)) n++;
    }
    return n;
  }

  hasErrors(): boolean {
    return this.errored.size > 0;
  }

  errorCount(): number {
    return this.errored.size;
  }

  pendingCount(): number {
    return this.queue.length + this.active;
  }

  /** True se o item está aguardando na fila ou executando agora. */
  isPending(id: string): boolean {
    return this.pending.has(id);
  }

  private pump() {
    while (this.active < this.concurrency && this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) break;
      this.active++;
      void this.run(job).finally(() => {
        this.active--;
        this.pending.delete(job.id);
        this.pump();
      });
    }
  }


  private async run(job: Job) {
    const t0 = performance.now();
    job.onUpdate({ status: "running" });
    log("start", { id: job.id, attempt: job.attempts + 1 });
    bulkPerfObserveConcurrency("description", this.active);
    bulkPerfRecordAiCall("description");
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-description",
        { body: job.payload },
      );
      if (error) {
        const { classifyAiError } = await import("./aiGatewayError");
        const c = await classifyAiError(error, data);
        throw new Error(c.message);
      }
      const d = (data ?? {}) as Record<string, unknown>;
      const result: DescriptionResult = {
        description_html:
          (d.description_html as string) ||
          (d.descricao_rica as string) ||
          (d.description as string) ||
          "",
        short_summary: (d.short_summary as string) || "",
        meta_title: (d.meta_title as string) || "",
        meta_description: (d.meta_description as string) || "",
        instagram_caption: (d.instagram_caption as string) || "",
        ai_confidence_score:
          typeof d.ai_confidence_score === "number"
            ? (d.ai_confidence_score as number)
            : null,
        ai_warnings: Array.isArray(d.warnings)
          ? (d.warnings as string[])
          : [],
        title:
          (d.title as string) ||
          (d.chamada_site as string) ||
          undefined,
        raw: d,
      };
      const durationMs = Math.round(performance.now() - t0);
      log("done", { id: job.id, duration_ms: durationMs });
      job.onUpdate({ status: "done", result, durationMs });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao gerar descrição";
      log("error", { id: job.id, message });
      this.errored.set(job.id, job);
      job.onUpdate({ status: "error", message });
    }
  }
}

let _instance: DescriptionWorker | null = null;
export function getDescriptionWorker(): DescriptionWorker {
  // HOTFIX Eventos em Lote: concorrência 3 (antes 2) para reduzir tempo
  // de espera na fila de descrições sem estressar o gateway.
  if (!_instance) _instance = new DescriptionWorker(3);
  return _instance;
}

