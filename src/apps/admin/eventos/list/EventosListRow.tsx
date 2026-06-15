// Renderização de uma linha da listagem de eventos (Fase 3B).
// JSX copiado literalmente da função renderEventRow original — qualquer
// alteração visual quebra a regra "não alterar UI" da fase.

import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Bot,
  Check,
  CheckSquare,
  Copy,
  ExternalLink,
  Flame,
  Link2,
  Loader2,
  MousePointerClick,
  Pencil,
  Sparkles,
  Square,
  Star,
  StarOff,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { getCategoryLabel } from "@/lib/categoryConfig";
import { isoToSpLocal } from "@/lib/dateUtils";
import { categoryBadge, getEventEditPath, type EventRow } from "./types";
import { getChecklist, needsReview } from "./helpers";
import type { EventosListCtx } from "./useEventosList";

export function ChecklistDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      title={`${label}: ${ok ? "OK" : "Faltando"}`}
      className={`inline-flex items-center justify-center h-4 w-4 rounded-full ${
        ok ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
      }`}
    >
      {ok ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
    </span>
  );
}

interface RowProps {
  e: EventRow;
  ctx: EventosListCtx;
}

export function EventosListRow({ e, ctx }: RowProps) {
  const {
    aiBusy,
    triageMode,
    focusedId,
    setFocusedId,
    selectedIds,
    toggleSelect,
    quickEdits,
    setQuickEdits,
    saveQuickEdit,
    clickCounts,
    handleQuickApprove,
    handleArchive,
    regenerateTitle,
    regenerateDescription,
    handleDuplicate,
    toggleAuraPick,
    toggleFeatured,
    copyEventLink,
    setDeleteTarget,
  } = ctx;

  const cl = getChecklist(e);
  const busy = aiBusy[e.id];
  const isDraft = e.status === "draft";

  const borderClass = e.aura_pick
    ? "border-primary/60 bg-primary/5 shadow-[0_0_18px_rgba(168,85,247,0.25)]"
    : e.featured
    ? "border-primary/40 bg-white/5 shadow-[0_0_10px_rgba(168,85,247,0.15)]"
    : isDraft && !cl.complete
    ? "border-destructive/40 bg-white/5"
    : "border-border/40 bg-white/5";
  const isFocused = triageMode && focusedId === e.id;
  const compactPad = triageMode ? "p-2" : "p-3";
  const focusRing = isFocused ? "ring-2 ring-primary/70 shadow-[0_0_22px_hsl(var(--primary)/0.5)]" : "";

  return (
    <div
      key={e.id}
      onClick={() => triageMode && setFocusedId(e.id)}
      className={`flex items-center gap-2 rounded-2xl border ${compactPad} backdrop-blur-xl transition-all hover:bg-white/[0.07] hover:-translate-y-0.5 ${borderClass} ${focusRing}`}
    >
      <button onClick={() => toggleSelect(e.id)} className="shrink-0" title="Selecionar">
        {selectedIds.has(e.id) ? (
          <CheckSquare className="h-4 w-4 text-primary" />
        ) : (
          <Square className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-1">
          <input
            value={quickEdits[e.id]?.title ?? e.title ?? ""}
            onChange={(ev) =>
              setQuickEdits((prev) => ({
                ...prev,
                [e.id]: {
                  title: ev.target.value,
                  date_time: prev[e.id]?.date_time ?? isoToSpLocal(e.date_time),
                  venue_name: prev[e.id]?.venue_name ?? (e.venue_name ?? ""),
                },
              }))
            }
            onBlur={() => saveQuickEdit(e)}
            placeholder="Título do evento"
            className="block w-full rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-sm lg:text-[13px] font-semibold text-foreground outline-none transition hover:border-border/40 hover:bg-secondary/30 focus:border-primary/40 focus:bg-secondary/40 truncate"
          />
          <Link
            to={getEventEditPath(e.id)}
            className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/15 px-2 py-1 text-[10px] font-bold uppercase text-primary hover:bg-primary/25 transition"
            title="Abrir edição completa do evento"
          >
            <Pencil className="h-3 w-3" />
            <span className="hidden sm:inline">Editar</span>
          </Link>
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span
            className={`${categoryBadge[e.category] || "bg-secondary"} rounded px-1.5 py-0.5 text-[9px] font-bold uppercase`}
          >
            {getCategoryLabel(e.category, e.sub_category)}
          </span>
          <input
            type="datetime-local"
            value={quickEdits[e.id]?.date_time ?? isoToSpLocal(e.date_time)}
            onChange={(ev) =>
              setQuickEdits((prev) => ({
                ...prev,
                [e.id]: {
                  title: prev[e.id]?.title ?? e.title,
                  date_time: ev.target.value,
                  venue_name: prev[e.id]?.venue_name ?? (e.venue_name ?? ""),
                },
              }))
            }
            onBlur={() => saveQuickEdit(e)}
            className="rounded border border-transparent bg-transparent px-1 py-0.5 text-[10px] text-muted-foreground outline-none transition hover:border-border/40 hover:bg-secondary/30 focus:border-primary/40 focus:text-foreground"
          />
          <input
            value={quickEdits[e.id]?.venue_name ?? (e.venue_name ?? "")}
            onChange={(ev) =>
              setQuickEdits((prev) => ({
                ...prev,
                [e.id]: {
                  title: prev[e.id]?.title ?? e.title,
                  date_time: prev[e.id]?.date_time ?? isoToSpLocal(e.date_time),
                  venue_name: ev.target.value,
                },
              }))
            }
            onBlur={() => saveQuickEdit(e)}
            placeholder="Local"
            className="rounded border border-transparent bg-transparent px-1 py-0.5 text-[10px] text-muted-foreground outline-none transition hover:border-border/40 hover:bg-secondary/30 focus:border-primary/40 focus:text-foreground min-w-[100px]"
          />
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
              e.status === "published"
                ? "text-green-400 bg-green-400/10"
                : e.status === "archived"
                ? "text-muted-foreground bg-muted/20"
                : "text-yellow-400 bg-yellow-400/10"
            }`}
          >
            {e.status === "published" ? "Publicado" : e.status === "archived" ? "🗃 Arquivado" : "Rascunho"}
          </span>
          {e.aura_badge === "em_alta" && (
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30 inline-flex items-center gap-0.5">
              🔥 Em alta
            </span>
          )}
          {e.aura_badge === "viralizando" && (
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30 inline-flex items-center gap-0.5">
              🚀 Viralizando
            </span>
          )}
          {e.aura_badge === "bombando" && (
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 inline-flex items-center gap-0.5">
              💥 Bombando
            </span>
          )}
          {e.aura_pick && (
            <span
              title="Aura recomenda este evento como destaque do dia"
              className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-primary/25 text-primary border border-primary/40 inline-flex items-center gap-0.5"
            >
              <Bot className="h-2.5 w-2.5" /> Escolha da Aura
            </span>
          )}
          {e.featured && !e.aura_pick && (
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-yellow-400/15 text-yellow-300 border border-yellow-400/30 inline-flex items-center gap-0.5">
              <Flame className="h-2.5 w-2.5" /> Destaque
            </span>
          )}
          {needsReview(e) && (
            <span
              className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-yellow-400/10 text-yellow-400 inline-flex items-center gap-0.5"
              title="Evento precisa revisão"
            >
              <AlertTriangle className="h-2.5 w-2.5" /> Revisar
            </span>
          )}
          {clickCounts[e.id] > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded text-primary bg-primary/10 flex items-center gap-0.5">
              <MousePointerClick className="h-2.5 w-2.5" />
              {clickCounts[e.id]}
            </span>
          )}
        </div>
        {/* Checklist row */}
        <div className="flex items-center gap-1.5 mt-1.5">
          <ChecklistDot ok={cl.title} label="Título mínimo e sem traços" />
          <ChecklistDot ok={cl.date} label="Data futura" />
          <ChecklistDot ok={cl.description} label="Descrição rica" />
          <ChecklistDot ok={cl.flyer} label="Flyer funcional" />
          {!cl.complete && isDraft && (
            <span className="text-[9px] font-bold uppercase text-red-400 ml-1 inline-flex items-center gap-1">
              <AlertTriangle className="h-2.5 w-2.5" /> Incompleto
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center shrink-0 ml-2 gap-0.5 flex-wrap justify-end">
        {isDraft && (
          <>
            {/* Aprovação rápida */}
            <button
              onClick={() => handleQuickApprove(e)}
              disabled={!cl.complete}
              className="inline-flex items-center gap-1 rounded-lg border border-green-500/40 bg-green-500/15 px-2 py-1.5 text-[10px] font-bold uppercase text-green-400 hover:bg-green-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title={cl.complete ? "Aprovar (publicar)" : "Faltam dados para aprovar"}
            >
              <Check className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Aprovar</span>
            </button>
            <button
              onClick={() => handleQuickApprove(e, { featured: true })}
              disabled={!cl.complete}
              className="inline-flex items-center gap-1 rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-2 py-1.5 text-[10px] font-bold uppercase text-yellow-300 hover:bg-yellow-400/20 disabled:opacity-40 transition"
              title="Aprovar e destacar"
            >
              <Flame className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleQuickApprove(e, { auraPick: true })}
              disabled={!cl.complete}
              className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/15 px-2 py-1.5 text-[10px] font-bold uppercase text-primary hover:bg-primary/25 disabled:opacity-40 transition"
              title="Aprovar e marcar como Aura Pick"
            >
              <Bot className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleArchive(e)}
              className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-secondary/40 px-2 py-1.5 text-[10px] font-bold uppercase text-muted-foreground hover:bg-secondary/70 transition"
              title="Arquivar"
            >
              🗃
            </button>
            <button
              onClick={() => regenerateTitle(e)}
              disabled={!!busy}
              className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-2 py-1.5 text-[10px] font-bold text-primary hover:bg-primary/20 transition disabled:opacity-50"
              title="Gerar título com IA"
            >
              {busy === "title" ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Sparkles className="h-4 w-4 text-primary" />
              )}
            </button>
            <button
              onClick={() => regenerateDescription(e)}
              disabled={!!busy}
              className="inline-flex items-center gap-1 rounded-xl bg-secondary/60 px-2 py-1.5 text-[10px] font-bold text-secondary-foreground hover:bg-secondary transition disabled:opacity-50"
              title="Gerar legenda rica"
            >
              {busy === "desc" ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Wand2 className="h-4 w-4 text-primary" />
              )}
            </button>
          </>
        )}
        <Link
          to={getEventEditPath(e.id)}
          className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2 py-1.5 text-[10px] font-bold uppercase text-primary hover:bg-primary/20 transition"
          title="Editar tudo (formulário completo)"
        >
          <Pencil className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Editar Tudo</span>
        </Link>
        <button
          onClick={() => handleDuplicate(e.id)}
          className="p-1.5 rounded-lg hover:bg-secondary/50 transition"
          title="Duplicar evento"
        >
          <Copy className="h-4 w-4 text-muted-foreground" />
        </button>
        <Link
          to={`/evento/${e.slug}`}
          target="_blank"
          className="p-1.5 rounded-lg hover:bg-primary/10 transition"
          title="Acesso rápido V3"
        >
          <ExternalLink className="h-4 w-4 text-primary" />
        </Link>
        <button
          onClick={() => toggleAuraPick(e.id, e.aura_pick)}
          className={`p-1.5 rounded-lg transition ${
            e.aura_pick ? "bg-primary/20 hover:bg-primary/30" : "hover:bg-primary/10"
          }`}
          title={e.aura_pick ? "Remover da Aura" : "Marcar como Escolha da Aura"}
        >
          <Bot className={`h-4 w-4 ${e.aura_pick ? "text-primary" : "text-muted-foreground"}`} />
        </button>
        <button
          onClick={() => toggleFeatured(e.id, e.featured)}
          className="p-1.5 rounded-lg hover:bg-secondary/50 transition"
          title={e.featured ? "Remover destaque" : "🎯 Destacar evento"}
        >
          {e.featured ? (
            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
          ) : (
            <StarOff className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        <button
          onClick={() => copyEventLink(e)}
          className="p-1.5 rounded-lg hover:bg-secondary/50 transition"
          title="🔗 Copiar link público"
        >
          <Link2 className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          onClick={() => setDeleteTarget(e)}
          className="p-1.5 rounded-lg hover:bg-red-500/10 transition"
          title="Excluir evento"
        >
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-400" />
        </button>
      </div>
    </div>
  );
}
