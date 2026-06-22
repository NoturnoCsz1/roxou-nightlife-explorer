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
      <div
        className="fixed left-0 right-0 z-40 border-t border-primary/40 bg-background/95 backdrop-blur-xl shadow-[0_-8px_24px_rgba(0,0,0,0.4)]"
        style={{
          bottom: "calc(4rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="md:ml-44 px-3 py-2 flex items-center gap-2">
          <div className="flex items-center gap-1.5 min-w-0 shrink-0">
            <CheckSquare className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs font-bold text-primary whitespace-nowrap">
              {selectedCount} selecionado(s)
            </span>
          </div>

          <div className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-hide [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => {
                track("ai_desc_request", { eligible: missingDescCount });
                setBulkConfirm({ kind: "ai-desc", ids: idsArr });
              }}
              disabled={missingDescCount === 0}
              className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-violet-500/40 bg-violet-500/10 px-2.5 py-1.5 text-[10px] font-bold uppercase text-violet-300 hover:bg-violet-500/20 disabled:opacity-40 transition whitespace-nowrap"
              title={
                missingDescCount > 0
                  ? `${missingDescCount} sem descrição — IA após confirmação`
                  : "Nenhum selecionado precisa de descrição"
              }
            >
              <Sparkles className="h-3 w-3" /> IA {missingDescCount > 0 ? `(${missingDescCount})` : ""}
            </button>

            <div className="relative shrink-0">
              <button
                onClick={() => {
                  setShowCat((v) => !v);
                  setShowPartner(false);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-secondary/40 px-2.5 py-1.5 text-[10px] font-bold uppercase text-foreground/80 hover:bg-secondary/70 transition whitespace-nowrap"
              >
                <Tag className="h-3 w-3" /> Categoria
              </button>
              {showCat && (
                <div className="absolute bottom-full left-0 mb-1 z-50 rounded-lg border border-border/40 bg-card/95 backdrop-blur-xl p-1 shadow-xl min-w-[140px]">
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

            <div className="relative shrink-0">
              <button
                onClick={() => {
                  setShowPartner((v) => !v);
                  setShowCat(false);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-secondary/40 px-2.5 py-1.5 text-[10px] font-bold uppercase text-foreground/80 hover:bg-secondary/70 transition whitespace-nowrap"
              >
                <Users className="h-3 w-3" /> Parceiro
              </button>
              {showPartner && (
                <div className="absolute bottom-full left-0 mb-1 z-50 rounded-lg border border-border/40 bg-card/95 backdrop-blur-xl p-1 shadow-xl min-w-[200px] max-h-64 overflow-y-auto">
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

            <button
              onClick={() => {
                track("needs_review");
                setBulkConfirm({ kind: "needs-review", ids: idsArr });
              }}
              className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-2.5 py-1.5 text-[10px] font-bold uppercase text-yellow-300 hover:bg-yellow-400/20 transition whitespace-nowrap"
            >
              <AlertTriangle className="h-3 w-3" /> Revisão
            </button>

            <button
              onClick={() => {
                track("approve");
                handleBulkApprove();
              }}
              disabled={selectedReadyToPublish === 0 || publishing}
              className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-green-500/40 bg-green-500/15 px-2.5 py-1.5 text-[10px] font-bold uppercase text-green-400 hover:bg-green-500/25 disabled:opacity-40 transition whitespace-nowrap"
              title={`${selectedReadyToPublish} pronto(s) p/ publicar`}
            >
              <Check className="h-3 w-3" /> Aprovar {selectedReadyToPublish > 0 ? `(${selectedReadyToPublish})` : ""}
            </button>

            <button
              onClick={() => {
                track("aura_pick");
                handleBulkAura(true);
              }}
              className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-[10px] font-bold uppercase text-primary hover:bg-primary/20 transition whitespace-nowrap"
            >
              <Bot className="h-3 w-3" /> Aura
            </button>

            <button
              onClick={() => {
                track("archive");
                handleBulkArchive();
              }}
              className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-border/40 bg-secondary/40 px-2.5 py-1.5 text-[10px] font-bold uppercase text-muted-foreground hover:bg-secondary/70 transition whitespace-nowrap"
            >
              Arquivar
            </button>

            <button
              onClick={() => {
                track("delete_request");
                setBulkConfirm({ kind: "delete", ids: idsArr });
              }}
              className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-[10px] font-bold uppercase text-red-300 hover:bg-red-500/20 transition whitespace-nowrap"
            >
              <Trash2 className="h-3 w-3" /> Excluir
            </button>
          </div>

          <button
            onClick={() => setSelectedIds(new Set())}
            className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
            aria-label="Limpar seleção"
            title="Limpar seleção"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
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
