/**
 * BulkPerformancePanel — HOTFIX Eventos em Lote
 *
 * Painel recolhível "DESEMPENHO DO LOTE" com métricas técnicas agregadas,
 * sem PII, mantidas apenas em memória. Também expõe botão "Copiar relatório".
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { ChevronDown, ChevronUp, Copy } from "lucide-react";
import {
  avg,
  getBulkPerfSnapshot,
  stageAvg,
  subscribeBulkPerf,
} from "@/lib/bulkPerformanceMetrics";
import { toast } from "sonner";

interface Props {
  /** Total no lote atual (fonte de verdade = items.length). */
  batchSize: number;
  processingCount: number;
  readyCount: number;
  errorCount: number;
  archivedCount: number;
  reviewCount: number;
}

function fmtMs(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1).replace(".", ",")}s`;
}

export default function BulkPerformancePanel({
  batchSize,
  processingCount,
  readyCount,
  errorCount,
  archivedCount,
  reviewCount,
}: Props) {
  const snap = useSyncExternalStore(subscribeBulkPerf, getBulkPerfSnapshot, getBulkPerfSnapshot);
  const [open, setOpen] = useState(false);

  // Fecha e ignora quando não há lote ativo.
  useEffect(() => {
    if (batchSize === 0) setOpen(false);
  }, [batchSize]);

  if (batchSize === 0) return null;

  const processed = readyCount + errorCount + archivedCount;
  const avgExtract = avg(snap.extractDurations);
  const avgDesc = avg(snap.descriptionDurations);

  const totalCacheLookups = snap.cacheHits + snap.cacheMisses;
  const cacheHitsLabel = totalCacheLookups > 0 ? String(snap.cacheHits) : "—";
  const cacheMissesLabel = totalCacheLookups > 0 ? String(snap.cacheMisses) : "—";

  // Onda 6 — Erros de extração vêm SÓ do status dos itens (fonte de verdade).
  // Antes somávamos errorCount + extractionsErrored, o que duplicava cada
  // falha de extract-flyer-metadata (registrada duas vezes: no bulkPerf e no
  // status do item).
  const extractionErrorsLabel = String(errorCount);
  const contentErrorsLabel = String(snap.descriptionsErrored);

  const rows: Array<[string, string]> = [
    ["Flyers no lote", String(batchSize)],
    ["Processados", String(processed)],
    ["Em processamento", String(processingCount)],
    ["Prontos", String(readyCount)],
    ["Revisão", String(reviewCount)],
    ["Arquivados", String(archivedCount)],
    ["Erros de extração", extractionErrorsLabel],
    ["Erros de conteúdo (IA)", contentErrorsLabel],
    ["Cache hits", cacheHitsLabel],
    ["Cache misses", cacheMissesLabel],
    ["Descrições geradas", String(snap.descriptionsGenerated)],
    ["Duplicidades evitadas", String(snap.duplicatesSkipped)],
    ["Primeiro pronto", fmtMs(snap.firstReadyMs)],
    ["Tempo total do lote", fmtMs(snap.totalBatchMs)],
    ["Média extração IA", avgExtract == null ? "—" : fmtMs(avgExtract)],
    ["Média descrição IA", avgDesc == null ? "—" : fmtMs(avgDesc)],
    ["Média compressão", fmtMs(stageAvg(snap, "compress"))],
    ["Média hash", fmtMs(stageAvg(snap, "hash"))],
    ["Média upload", fmtMs(stageAvg(snap, "upload"))],
    ["Concorrência extração (máx)", String(snap.concurrencyExtraction || "—")],
    ["Concorrência descrição (máx)", String(snap.concurrencyDescription || "—")],
    ["Chamadas IA extração", String(snap.aiCallsExtraction)],
    ["Chamadas IA descrição", String(snap.aiCallsDescription)],
  ];

  const handleCopy = async () => {
    const lines = [
      "EVENTOS EM LOTE — RELATÓRIO",
      "",
      ...rows.map(([k, v]) => `${k}: ${v}`),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(lines);
      toast.success("Relatório copiado.");
    } catch {
      toast.error("Não foi possível copiar. Selecione manualmente.");
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-border/40 bg-card/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
        aria-expanded={open}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Desempenho do lote
        </span>
        <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {processed}/{batchSize} · {fmtMs(snap.totalBatchMs ?? (snap.batchStartedAt ? Math.round(performance.now() - snap.batchStartedAt) : null))}
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>
      {open && (
        <div className="border-t border-border/40 px-3 py-2">
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] sm:grid-cols-3">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-2 border-b border-border/20 py-0.5">
                <dt className="text-muted-foreground truncate">{label}</dt>
                <dd className="font-mono text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-lg border border-border/50 bg-secondary/40 px-2 py-1 text-[10px] font-semibold text-foreground hover:bg-secondary/60"
            >
              <Copy className="h-3 w-3" /> Copiar relatório do lote
            </button>
          </div>
          <p className="mt-1 text-[9px] text-muted-foreground/70">
            Métricas em memória (sessão atual). Sem PII, sem persistência.
          </p>
        </div>
      )}
    </div>
  );
}
