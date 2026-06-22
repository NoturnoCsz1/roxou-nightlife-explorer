// Linha compacta para a lista densa do admin (mobile-first).
// Mostra todas as infos críticas em até 3 linhas + botões Editar e ⋯.

import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Bot,
  CheckSquare,
  Copy,
  Copy as CopyIcon,
  ExternalLink,
  Flame,
  Instagram,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { categoryBadge, getEventEditPath, type EventRow } from "./types";
import { getMissingFields, getOrigin, needsReview, spDateStr } from "./helpers";
import type { EventosListCtx } from "./useEventosList";

const ORIGIN_TINT: Record<ReturnType<typeof getOrigin>, string> = {
  aura: "bg-primary/15 text-primary",
  instagram: "bg-pink-500/15 text-pink-300",
  eventou: "bg-cyan-500/15 text-cyan-300",
  ai: "bg-violet-500/15 text-violet-300",
  manual: "bg-secondary/60 text-muted-foreground",
};

const ORIGIN_ICON: Record<ReturnType<typeof getOrigin>, typeof Bot> = {
  aura: Bot,
  instagram: Instagram,
  eventou: Ticket,
  ai: Sparkles,
  manual: Pencil,
};

function fmt(iso: string | null) {
  if (!iso) return { d: "Sem data", t: "" };
  const dt = new Date(iso);
  const d = dt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  const wd = dt
    .toLocaleString("pt-BR", { weekday: "short", timeZone: "America/Sao_Paulo" })
    .replace(".", "");
  const t = dt.toLocaleString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
    hour12: false,
  });
  return { d: `${wd} ${d}`, t };
}

export function EventosListCompactRow({
  e,
  ctx,
  isDuplicate,
}: {
  e: EventRow;
  ctx: EventosListCtx;
  isDuplicate: boolean;
}) {
  const {
    selectedIds,
    toggleSelect,
    handleDuplicate,
    copyEventLink,
    toggleAuraPick,
    toggleFeatured,
    setDeleteTarget,
    regenerateTitle,
    regenerateDescription,
    aiBusy,
  } = ctx;

  const origin = getOrigin(e);
  const OriginIcon = ORIGIN_ICON[origin];
  const { d, t } = fmt(e.date_time);
  const missing = getMissingFields(e);
  const review = needsReview(e);
  const isDraft = e.status === "draft";
  const isToday = e.date_time ? spDateStr(new Date(e.date_time)) === spDateStr(new Date()) : false;
  const partnerLabel =
    e.venue_name?.trim() || (e.partner_id ? "Parceiro vinculado" : "Sem local");
  const busy = aiBusy[e.id];

  const statusDot =
    e.status === "published"
      ? "bg-green-400"
      : e.status === "archived"
      ? "bg-muted-foreground/40"
      : "bg-yellow-400";

  return (
    <div className="flex items-stretch gap-2 rounded-xl border border-border/40 bg-white/[0.03] px-2.5 py-2 transition hover:bg-white/[0.06]">
      <button
        onClick={() => toggleSelect(e.id)}
        className="shrink-0 flex items-center justify-center w-7"
        aria-label="Selecionar"
      >
        {selectedIds.has(e.id) ? (
          <CheckSquare className="h-4 w-4 text-primary" />
        ) : (
          <Square className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      <div className="min-w-0 flex-1 space-y-1">
        {/* Linha 1: status • título */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusDot}`} />
          <h3 className="text-[13px] font-semibold text-foreground truncate">
            {e.title || "(sem título)"}
          </h3>
        </div>

        {/* Linha 2: local • data hora • categoria */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground min-w-0">
          <span className="truncate max-w-[45%]">{partnerLabel}</span>
          <span className="opacity-50">·</span>
          <span className="font-medium text-foreground/85 whitespace-nowrap">
            {d}
            {t && ` ${t}`}
          </span>
          <span
            className={`${categoryBadge[e.category] || "bg-secondary"} ml-auto rounded px-1.5 py-0.5 text-[9px] font-bold uppercase shrink-0`}
          >
            {getCategoryLabel(e.category, e.sub_category)}
          </span>
        </div>

        {/* Linha 3: origem + sinais + faltas */}
        <div className="flex flex-wrap items-center gap-1">
          <span
            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${ORIGIN_TINT[origin]}`}
          >
            <OriginIcon className="h-2.5 w-2.5" />
            {origin}
          </span>
          {isToday && (
            <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase bg-orange-500/20 text-orange-300">
              Hoje
            </span>
          )}
          {e.aura_pick && (
            <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase bg-primary/20 text-primary">
              Aura
            </span>
          )}
          {e.featured && !e.aura_pick && (
            <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase bg-yellow-400/15 text-yellow-300 inline-flex items-center gap-0.5">
              <Flame className="h-2.5 w-2.5" />
              Dest
            </span>
          )}
          {review && (
            <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase bg-yellow-400/10 text-yellow-400 inline-flex items-center gap-0.5">
              <AlertTriangle className="h-2.5 w-2.5" /> Revisar
            </span>
          )}
          {isDuplicate && (
            <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase bg-fuchsia-500/15 text-fuchsia-300 inline-flex items-center gap-0.5">
              <CopyIcon className="h-2.5 w-2.5" /> Possível duplicado
            </span>
          )}
          {missing.slice(0, 3).map((m) => (
            <span
              key={m}
              className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase bg-red-500/10 text-red-300 inline-flex items-center gap-0.5"
            >
              Falta {m}
            </span>
          ))}
          {missing.length > 3 && (
            <span className="text-[9px] font-bold uppercase text-red-300/80">
              +{missing.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-1 shrink-0">
        <Link
          to={getEventEditPath(e.id)}
          className="inline-flex items-center justify-center rounded-lg border border-primary/40 bg-primary/15 h-10 min-w-10 px-2 text-[11px] font-bold uppercase text-primary hover:bg-primary/25 transition"
          title="Editar"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="inline-flex items-center justify-center rounded-lg border border-border/40 bg-secondary/40 h-10 w-10 text-muted-foreground hover:bg-secondary/70 transition"
              aria-label="Mais ações"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-card/95 backdrop-blur-xl">
            <DropdownMenuItem onClick={() => handleDuplicate(e.id)}>
              <Copy className="h-4 w-4 mr-2" /> Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to={`/evento/${e.slug}`} target="_blank">
                <ExternalLink className="h-4 w-4 mr-2" /> Abrir público
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => copyEventLink(e)}>
              <CopyIcon className="h-4 w-4 mr-2" /> Copiar link
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
                <DropdownMenuItem onClick={() => regenerateTitle(e)} disabled={!!busy}>
                  <Sparkles className="h-4 w-4 mr-2" /> Gerar título (IA)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => regenerateDescription(e)} disabled={!!busy}>
                  <Wand2 className="h-4 w-4 mr-2" /> Gerar descrição (IA)
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
  );
}
