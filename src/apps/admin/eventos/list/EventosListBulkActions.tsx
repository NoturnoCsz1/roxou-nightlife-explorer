// Barra sticky de ações em lote.
// Inclui aprovação, destaque, aura, arquivar, excluir (confirm),
// enviar para revisão, aplicar categoria/parceiro e gerar descrição IA
// (sempre com confirmação para gastos de IA).

import { useState } from "react";
import {
  AlertTriangle,
  Bot,
  Check,
  CheckSquare,
  Flame,
  Sparkles,
  Tag,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trackAdminEvent } from "@/lib/adminAnalytics";
import { CATEGORIES } from "./types";
import { getChecklist } from "./helpers";
import type { EventosListCtx } from "./useEventosList";

export function EventosListBulkActions({ ctx }: { ctx: EventosListCtx }) {
  const {
    events,
    selectedIds,
    selectedCount,
    selectedReadyToPublish,
    handleBulkApprove,
    publishing,
    handleBulkAura,
    handleBulkArchive,
    handleBulkDelete,
    handleBulkNeedsReview,
    handleBulkAssignCategory,
    handleBulkAssignPartner,
    handleBulkGenerateDescriptions,
    setSelectedIds,
    partnerOptions,
    bulkConfirm,
    setBulkConfirm,
  } = ctx;

  const [showCat, setShowCat] = useState(false);
  const [showPartner, setShowPartner] = useState(false);

  if (selectedCount === 0) return null;

  const idsArr = Array.from(selectedIds);
  const missingDescCount = events.filter(
    (e) => selectedIds.has(e.id) && !getChecklist(e).description
  ).length;

  function track(action: string, extra: Record<string, unknown> = {}) {
    trackAdminEvent("admin_events_bulk_action", { action, count: idsArr.length, ...extra });
  }

  return (
    <>
      <div className="sticky top-[140px] z-40 -mx-2 px-3 py-2 rounded-2xl border border-primary/40 bg-primary/10 backdrop-blur-xl flex items-center gap-2 flex-wrap shadow-[0_0_24px_hsl(var(--primary)/0.25)]">
        <span className="text-xs font-bold text-primary inline-flex items-center gap-1">
          <CheckSquare className="h-3.5 w-3.5" /> {selectedCount} selecionado(s)
        </span>
        <span className="text-[10px] text-muted-foreground">
          {selectedReadyToPublish} pronto(s) p/ publicar
        </span>
        <span className="w-px h-4 bg-border/40" />

        <button
          onClick={() => {
            track("approve");
            handleBulkApprove();
          }}
          disabled={selectedReadyToPublish === 0 || publishing}
          className="inline-flex items-center gap-1 rounded-lg border border-green-500/40 bg-green-500/15 px-2.5 py-1 text-[10px] font-bold uppercase text-green-400 hover:bg-green-500/25 disabled:opacity-40 transition"
        >
          <Check className="h-3 w-3" /> Aprovar
        </button>
        <button
          onClick={() => {
            track("approve_featured");
            handleBulkApprove({ featured: true });
          }}
          disabled={selectedReadyToPublish === 0}
          className="inline-flex items-center gap-1 rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-2.5 py-1 text-[10px] font-bold uppercase text-yellow-300 hover:bg-yellow-400/20 disabled:opacity-40 transition"
        >
          <Flame className="h-3 w-3" /> + Destaque
        </button>
        <button
          onClick={() => {
            track("approve_aura");
            handleBulkApprove({ auraPick: true });
          }}
          disabled={selectedReadyToPublish === 0}
          className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/15 px-2.5 py-1 text-[10px] font-bold uppercase text-primary hover:bg-primary/25 disabled:opacity-40 transition"
        >
          <Bot className="h-3 w-3" /> + Aura
        </button>
        <button
          onClick={() => {
            track("aura_pick");
            handleBulkAura(true);
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase text-primary hover:bg-primary/20 transition"
        >
          🤖 Aura Pick
        </button>
        <button
          onClick={() => {
            track("needs_review");
            setBulkConfirm({ kind: "needs-review", ids: idsArr });
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-2.5 py-1 text-[10px] font-bold uppercase text-yellow-300 hover:bg-yellow-400/20 transition"
        >
          <AlertTriangle className="h-3 w-3" /> Revisão
        </button>
        <button
          onClick={() => {
            track("archive");
            handleBulkArchive();
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-secondary/40 px-2.5 py-1 text-[10px] font-bold uppercase text-muted-foreground hover:bg-secondary/70 transition"
        >
          🗃 Arquivar
        </button>
        <button
          onClick={() => {
            track("delete_request");
            setBulkConfirm({ kind: "delete", ids: idsArr });
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-red-300 hover:bg-red-500/20 transition"
        >
          <Trash2 className="h-3 w-3" /> Excluir
        </button>

        {/* Aplicar categoria */}
        <div className="relative">
          <button
            onClick={() => {
              setShowCat((v) => !v);
              setShowPartner(false);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-secondary/40 px-2.5 py-1 text-[10px] font-bold uppercase text-foreground/80 hover:bg-secondary/70 transition"
          >
            <Tag className="h-3 w-3" /> Categoria
          </button>
          {showCat && (
            <div className="absolute top-full left-0 mt-1 z-50 rounded-lg border border-border/40 bg-card/95 backdrop-blur-xl p-1 shadow-xl min-w-[140px]">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    track("assign_category", { category: c });
                    handleBulkAssignCategory(c);
                    setShowCat(false);
                  }}
                  className="w-full text-left px-2.5 py-1 text-[11px] font-semibold capitalize rounded hover:bg-primary/10 hover:text-primary transition"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Aplicar parceiro */}
        <div className="relative">
          <button
            onClick={() => {
              setShowPartner((v) => !v);
              setShowCat(false);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-secondary/40 px-2.5 py-1 text-[10px] font-bold uppercase text-foreground/80 hover:bg-secondary/70 transition"
          >
            <Users className="h-3 w-3" /> Parceiro
          </button>
          {showPartner && (
            <div className="absolute top-full left-0 mt-1 z-50 rounded-lg border border-border/40 bg-card/95 backdrop-blur-xl p-1 shadow-xl min-w-[200px] max-h-64 overflow-y-auto">
              {partnerOptions.map(([id, name]) => (
                <button
                  key={id}
                  onClick={() => {
                    track("assign_partner", { partner_id: id });
                    handleBulkAssignPartner(id, name);
                    setShowPartner(false);
                  }}
                  className="w-full text-left px-2.5 py-1 text-[11px] font-medium rounded hover:bg-primary/10 hover:text-primary transition truncate"
                >
                  {name}
                </button>
              ))}
              {partnerOptions.length === 0 && (
                <p className="px-2 py-1 text-[10px] text-muted-foreground">
                  Nenhum parceiro disponível.
                </p>
              )}
            </div>
          )}
        </div>

        {/* IA: gerar descrição (apenas após confirmação) */}
        <button
          onClick={() => {
            track("ai_desc_request", { eligible: missingDescCount });
            setBulkConfirm({ kind: "ai-desc", ids: idsArr });
          }}
          disabled={missingDescCount === 0}
          className="inline-flex items-center gap-1 rounded-lg border border-violet-500/40 bg-violet-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-violet-300 hover:bg-violet-500/20 disabled:opacity-40 transition"
          title={
            missingDescCount > 0
              ? `${missingDescCount} sem descrição — IA será chamada após confirmação`
              : "Nenhum selecionado precisa de descrição"
          }
        >
          <Sparkles className="h-3 w-3" /> IA descrição ({missingDescCount})
        </button>

        <button
          onClick={() => setSelectedIds(new Set())}
          className="ml-auto inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
        >
          <X className="h-3 w-3" /> Limpar
        </button>
      </div>

      {/* Confirm: exclusão em massa */}
      <AlertDialog
        open={bulkConfirm?.kind === "delete"}
        onOpenChange={(open) => !open && setBulkConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {bulkConfirm?.ids.length} evento(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os eventos selecionados serão removidos
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (bulkConfirm?.kind === "delete") {
                  track("delete_confirmed");
                  handleBulkDelete(bulkConfirm.ids);
                }
                setBulkConfirm(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm: revisão em massa */}
      <AlertDialog
        open={bulkConfirm?.kind === "needs-review"}
        onOpenChange={(open) => !open && setBulkConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar para revisão</AlertDialogTitle>
            <AlertDialogDescription>
              {bulkConfirm?.ids.length} evento(s) serão marcados como{" "}
              <strong>precisam de revisão</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                track("needs_review_confirmed");
                handleBulkNeedsReview();
                setBulkConfirm(null);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm: IA descrição */}
      <AlertDialog
        open={bulkConfirm?.kind === "ai-desc"}
        onOpenChange={(open) => !open && setBulkConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gerar descrições com IA?</AlertDialogTitle>
            <AlertDialogDescription>
              {missingDescCount} evento(s) sem descrição serão processados pela IA. Isso pode
              consumir créditos de IA. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (bulkConfirm?.kind === "ai-desc") {
                  track("ai_desc_confirmed", { eligible: missingDescCount });
                  handleBulkGenerateDescriptions(bulkConfirm.ids);
                }
                setBulkConfirm(null);
              }}
              className="bg-violet-600 hover:bg-violet-700"
            >
              Sim, gerar com IA
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
