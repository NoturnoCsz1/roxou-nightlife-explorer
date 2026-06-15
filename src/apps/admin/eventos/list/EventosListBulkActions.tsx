// Barra sticky de ações em lote (Fase 3B). JSX copiado literalmente.

import { Bot, Check, CheckSquare, Flame, X } from "lucide-react";
import type { EventosListCtx } from "./useEventosList";

export function EventosListBulkActions({ ctx }: { ctx: EventosListCtx }) {
  const {
    selectedCount,
    selectedReadyToPublish,
    handleBulkApprove,
    publishing,
    handleBulkAura,
    handleBulkArchive,
    setSelectedIds,
  } = ctx;

  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-[140px] z-40 -mx-2 px-3 py-2 rounded-2xl border border-primary/40 bg-primary/10 backdrop-blur-xl flex items-center gap-2 flex-wrap shadow-[0_0_24px_hsl(var(--primary)/0.25)]">
      <span className="text-xs font-bold text-primary inline-flex items-center gap-1">
        <CheckSquare className="h-3.5 w-3.5" /> {selectedCount} selecionado(s)
      </span>
      <span className="text-[10px] text-muted-foreground">
        {selectedReadyToPublish} pronto(s) p/ publicar
      </span>
      <span className="w-px h-4 bg-border/40" />
      <button
        onClick={() => handleBulkApprove()}
        disabled={selectedReadyToPublish === 0 || publishing}
        className="inline-flex items-center gap-1 rounded-lg border border-green-500/40 bg-green-500/15 px-2.5 py-1 text-[10px] font-bold uppercase text-green-400 hover:bg-green-500/25 disabled:opacity-40 transition"
      >
        <Check className="h-3 w-3" /> Aprovar
      </button>
      <button
        onClick={() => handleBulkApprove({ featured: true })}
        disabled={selectedReadyToPublish === 0}
        className="inline-flex items-center gap-1 rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-2.5 py-1 text-[10px] font-bold uppercase text-yellow-300 hover:bg-yellow-400/20 disabled:opacity-40 transition"
      >
        <Flame className="h-3 w-3" /> + Destaque
      </button>
      <button
        onClick={() => handleBulkApprove({ auraPick: true })}
        disabled={selectedReadyToPublish === 0}
        className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/15 px-2.5 py-1 text-[10px] font-bold uppercase text-primary hover:bg-primary/25 disabled:opacity-40 transition"
      >
        <Bot className="h-3 w-3" /> + Aura
      </button>
      <button
        onClick={() => handleBulkAura(true)}
        className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase text-primary hover:bg-primary/20 transition"
      >
        🤖 Aura Pick
      </button>
      <button
        onClick={() => handleBulkArchive()}
        className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-secondary/40 px-2.5 py-1 text-[10px] font-bold uppercase text-muted-foreground hover:bg-secondary/70 transition"
      >
        🗃 Arquivar
      </button>
      <button
        onClick={() => setSelectedIds(new Set())}
        className="ml-auto inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
      >
        <X className="h-3 w-3" /> Limpar seleção
      </button>
    </div>
  );
}
