// Renderização de uma linha da listagem de eventos.
// Mobile-first: layout empilhado com info essencial visível sem abrir o card.
// Ações secundárias agrupadas em menu "⋯" no mobile, expostas no desktop.

import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Bot,
  Check,
  CheckSquare,
  Copy,
  ExternalLink,
  Flame,
  Instagram,
  Link2,
  Loader2,
  MapPin,
  MousePointerClick,
  MoreHorizontal,
  Pencil,
  Sparkles,
  Square,
  Star,
  StarOff,
  Ticket,
  Trash2,
  Wand2,
} from "lucide-react";
import { getCategoryLabel } from "@/lib/categoryConfig";
import { isoToSpLocal } from "@/lib/dateUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { categoryBadge, getEventEditPath, type EventRow } from "./types";
import {
  getChecklist,
  getMissingFields,
  getOrigin,
  needsReview,
  spDateStr,
} from "./helpers";
import type { EventosListCtx } from "./useEventosList";

interface RowProps {
  e: EventRow;
  ctx: EventosListCtx;
  isDuplicate?: boolean;
}

const ORIGIN_META: Record<
  ReturnType<typeof getOrigin>,
  { label: string; cls: string; Icon: typeof Bot }
> = {
  aura: {
    label: "Aura",
    cls: "bg-primary/20 text-primary border-primary/40",
    Icon: Bot,
  },
  instagram: {
    label: "Instagram",
    cls: "bg-pink-500/15 text-pink-300 border-pink-500/30",
    Icon: Instagram,
  },
  eventou: {
    label: "Eventou",
    cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    Icon: Ticket,
  },
  ai: {
    label: "IA",
    cls: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    Icon: Sparkles,
  },
  manual: {
    label: "Manual",
    cls: "bg-secondary/60 text-muted-foreground border-border/40",
    Icon: Pencil,
  },
};

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "published"
      ? "text-green-400 bg-green-400/10 border-green-400/30"
      : status === "archived"
      ? "text-muted-foreground bg-muted/20 border-border/40"
      : "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
  const label =
    status === "published" ? "Publicado" : status === "archived" ? "Arquivado" : "Rascunho";
  return (
    <span
      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${cls}`}
    >
      {label}
    </span>
  );
}

function formatDateTime(iso: string | null) {
  if (!iso) return { day: "—", time: "" };
  const d = new Date(iso);
  const day = d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  const weekday = d.toLocaleString("pt-BR", {
    weekday: "short",
    timeZone: "America/Sao_Paulo",
  });
  const time = d.toLocaleString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
    hour12: false,
  });
  return { day: `${weekday.replace(".", "")} ${day}`, time };
}

export function EventosListRow({ e, ctx }: RowProps) {
  const {
    aiBusy,
    triageMode,
    focusedId,
    setFocusedId,
    selectedIds,
    toggleSelect,
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
  const origin = getOrigin(e);
  const OriginIcon = ORIGIN_META[origin].Icon;
  const missing = getMissingFields(e);
  const review = needsReview(e);
  const isToday = e.date_time ? spDateStr(new Date(e.date_time)) === spDateStr(new Date()) : false;
  const { day, time } = formatDateTime(e.date_time);

  const borderClass = e.aura_pick
    ? "border-primary/60 bg-primary/5 shadow-[0_0_18px_rgba(168,85,247,0.25)]"
    : e.featured
    ? "border-primary/40 bg-white/5 shadow-[0_0_10px_rgba(168,85,247,0.15)]"
    : isDraft && !cl.complete
    ? "border-destructive/40 bg-white/5"
    : "border-border/40 bg-white/5";
  const isFocused = triageMode && focusedId === e.id;
  const focusRing = isFocused
    ? "ring-2 ring-primary/70 shadow-[0_0_22px_hsl(var(--primary)/0.5)]"
    : "";

  const partnerLabel = e.venue_name?.trim() || (e.partner_id ? "Parceiro vinculado" : "Sem parceiro/local");

  return (
    <div
      key={e.id}
      onClick={() => triageMode && setFocusedId(e.id)}
      className={`rounded-2xl border p-3 backdrop-blur-xl transition-all hover:bg-white/[0.07] ${borderClass} ${focusRing}`}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={() => toggleSelect(e.id)}
          className="shrink-0 mt-0.5 h-10 w-6 flex items-center justify-start"
          title="Selecionar"
          aria-label="Selecionar evento"
        >
          {selectedIds.has(e.id) ? (
            <CheckSquare className="h-4 w-4 text-primary" />
          ) : (
            <Square className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        <div className="min-w-0 flex-1 space-y-1.5">
          {/* Linha 1 — Título */}
          <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 break-words">
            {e.title || "(sem título)"}
          </h3>

          {/* Linha 2 — Empresa / local */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
            <MapPin className="h-3 w-3 shrink-0 text-primary/70" />
            <span className="truncate">{partnerLabel}</span>
          </div>

          {/* Linha 3 — Data, horário, categoria */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="font-semibold text-foreground/90">{day}</span>
            {time && <span className="text-muted-foreground">{time}</span>}
            <span
              className={`${categoryBadge[e.category] || "bg-secondary"} rounded px-1.5 py-0.5 text-[9px] font-bold uppercase`}
            >
              {getCategoryLabel(e.category, e.sub_category)}
            </span>
            {isToday && (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                Hoje
              </span>
            )}
          </div>

          {/* Linha 4 — Status + origem + sinais */}
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={e.status} />
            <span
              className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${ORIGIN_META[origin].cls}`}
              title={`Origem: ${ORIGIN_META[origin].label}`}
            >
              <OriginIcon className="h-2.5 w-2.5" />
              {ORIGIN_META[origin].label}
            </span>
            {e.aura_badge === "em_alta" && (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                🔥 Em alta
              </span>
            )}
            {e.aura_badge === "viralizando" && (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">
                🚀 Viralizando
              </span>
            )}
            {e.aura_badge === "bombando" && (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                💥 Bombando
              </span>
            )}
            {e.featured && !e.aura_pick && (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-yellow-400/15 text-yellow-300 border border-yellow-400/30 inline-flex items-center gap-0.5">
                <Flame className="h-2.5 w-2.5" /> Destaque
              </span>
            )}
            {review && (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 inline-flex items-center gap-0.5">
                <AlertTriangle className="h-2.5 w-2.5" /> Revisar
              </span>
            )}
            {clickCounts[e.id] > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded text-primary bg-primary/10 inline-flex items-center gap-0.5">
                <MousePointerClick className="h-2.5 w-2.5" />
                {clickCounts[e.id]}
              </span>
            )}
          </div>

          {/* Problemas explícitos */}
          {missing.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              {missing.map((m) => (
                <span
                  key={m}
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-500/10 text-red-300 border border-red-500/30 inline-flex items-center gap-1"
                >
                  <AlertTriangle className="h-2.5 w-2.5" />
                  Falta {m}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Linha 5 — Ações */}
      <div className="mt-2.5 flex items-center gap-1.5 pt-2 border-t border-border/30">
        <Link
          to={getEventEditPath(e.id)}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/40 bg-primary/15 px-3 min-h-[40px] text-xs font-bold uppercase text-primary hover:bg-primary/25 transition flex-1 sm:flex-none"
          title="Editar evento"
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </Link>

        {isDraft && (
          <button
            onClick={() => handleQuickApprove(e)}
            disabled={!cl.complete}
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-green-500/40 bg-green-500/15 px-3 min-h-[40px] text-xs font-bold uppercase text-green-400 hover:bg-green-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition"
            title={cl.complete ? "Aprovar (publicar)" : "Faltam dados para aprovar"}
          >
            <Check className="h-3.5 w-3.5" />
            <span className="hidden xs:inline sm:inline">Publicar</span>
          </button>
        )}

        {/* Ações secundárias visíveis no desktop */}
        <div className="hidden md:flex items-center gap-0.5 ml-1">
          <button
            onClick={() => handleDuplicate(e.id)}
            className="p-2 rounded-lg hover:bg-secondary/50 transition"
            title="Duplicar"
          >
            <Copy className="h-4 w-4 text-muted-foreground" />
          </button>
          <Link
            to={`/evento/${e.slug}`}
            target="_blank"
            className="p-2 rounded-lg hover:bg-primary/10 transition"
            title="Abrir público"
          >
            <ExternalLink className="h-4 w-4 text-primary" />
          </Link>
          <button
            onClick={() => copyEventLink(e)}
            className="p-2 rounded-lg hover:bg-secondary/50 transition"
            title="Copiar link"
          >
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => toggleAuraPick(e.id, e.aura_pick)}
            className={`p-2 rounded-lg transition ${
              e.aura_pick ? "bg-primary/20 hover:bg-primary/30" : "hover:bg-primary/10"
            }`}
            title={e.aura_pick ? "Remover da Aura" : "Marcar como Aura"}
          >
            <Bot className={`h-4 w-4 ${e.aura_pick ? "text-primary" : "text-muted-foreground"}`} />
          </button>
          <button
            onClick={() => toggleFeatured(e.id, e.featured)}
            className="p-2 rounded-lg hover:bg-secondary/50 transition"
            title={e.featured ? "Remover destaque" : "Destacar"}
          >
            {e.featured ? (
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
            ) : (
              <StarOff className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {isDraft && (
            <>
              <button
                onClick={() => regenerateTitle(e)}
                disabled={!!busy}
                className="p-2 rounded-lg hover:bg-primary/10 transition disabled:opacity-50"
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
                className="p-2 rounded-lg hover:bg-secondary/50 transition disabled:opacity-50"
                title="Gerar descrição com IA"
              >
                {busy === "desc" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <Wand2 className="h-4 w-4 text-primary" />
                )}
              </button>
            </>
          )}
          <button
            onClick={() => setDeleteTarget(e)}
            className="p-2 rounded-lg hover:bg-red-500/10 transition"
            title="Excluir"
          >
            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-400" />
          </button>
        </div>

        {/* Menu compacto no mobile */}
        <div className="md:hidden ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="inline-flex items-center justify-center rounded-lg border border-border/40 bg-secondary/40 h-10 w-10 text-muted-foreground hover:bg-secondary/70 transition"
                title="Mais ações"
                aria-label="Mais ações"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-card/95 backdrop-blur-xl border-border/40"
            >
              <DropdownMenuItem onClick={() => handleDuplicate(e.id)}>
                <Copy className="h-4 w-4 mr-2" /> Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={`/evento/${e.slug}`} target="_blank">
                  <ExternalLink className="h-4 w-4 mr-2" /> Abrir público
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => copyEventLink(e)}>
                <Link2 className="h-4 w-4 mr-2" /> Copiar link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toggleAuraPick(e.id, e.aura_pick)}>
                <Bot className="h-4 w-4 mr-2" />
                {e.aura_pick ? "Remover da Aura" : "Marcar Aura"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleFeatured(e.id, e.featured)}>
                {e.featured ? (
                  <StarOff className="h-4 w-4 mr-2" />
                ) : (
                  <Star className="h-4 w-4 mr-2" />
                )}
                {e.featured ? "Remover destaque" : "Destacar"}
              </DropdownMenuItem>
              {isDraft && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => regenerateTitle(e)}
                    disabled={!!busy}
                  >
                    <Sparkles className="h-4 w-4 mr-2" /> Gerar título (IA)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => regenerateDescription(e)}
                    disabled={!!busy}
                  >
                    <Wand2 className="h-4 w-4 mr-2" /> Gerar descrição (IA)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleArchive(e)}>
                    🗃 Arquivar
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteTarget(e)}
                className="text-red-400 focus:text-red-400"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
