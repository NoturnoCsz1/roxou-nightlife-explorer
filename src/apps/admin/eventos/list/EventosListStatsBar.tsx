// Barra de estatísticas rápidas — chips clicáveis que aplicam filtros.
// Mobile: scroll horizontal leve apenas nessa linha.

import { trackAdminEvent } from "@/lib/adminAnalytics";
import type { EventosListCtx } from "./useEventosList";

interface Chip {
  key: string;
  label: string;
  value: number;
  tone: "default" | "warn" | "danger" | "good" | "primary";
  onClick: () => void;
  active?: boolean;
}

const toneCls: Record<Chip["tone"], string> = {
  default: "border-border/40 bg-secondary/40 text-foreground/80 hover:bg-secondary/70",
  warn: "border-yellow-400/30 bg-yellow-400/10 text-yellow-300 hover:bg-yellow-400/15",
  danger: "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/15",
  good: "border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500/15",
  primary: "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20",
};

export function EventosListStatsBar({ ctx }: { ctx: EventosListCtx }) {
  const {
    statsBar,
    setActiveDateFilter,
    setExtraFilter,
    setActiveStatus,
    setActiveTab,
    activeDateFilter,
    extraFilter,
    activeStatus,
    activeTab,
  } = ctx;

  function go(name: string, fn: () => void) {
    trackAdminEvent("admin_events_filter_used", { source: "stats_bar", filter: name });
    fn();
  }

  const chips: Chip[] = [
    {
      key: "hoje",
      label: "Hoje",
      value: statsBar.hoje,
      tone: "primary",
      active: activeDateFilter === "hoje",
      onClick: () => go("hoje", () => setActiveDateFilter("hoje")),
    },
    {
      key: "semana",
      label: "Próx. 7d",
      value: statsBar.semana,
      tone: "default",
      active: activeDateFilter === "semana",
      onClick: () => go("semana", () => setActiveDateFilter("semana")),
    },
    {
      key: "sem-capa",
      label: "Sem capa",
      value: statsBar.semCapa,
      tone: "danger",
      active: extraFilter === "sem-imagem",
      onClick: () => go("sem-capa", () => setExtraFilter("sem-imagem")),
    },
    {
      key: "sem-desc",
      label: "Sem descrição",
      value: statsBar.semDescricao,
      tone: "danger",
      active: extraFilter === "sem-descricao",
      onClick: () => go("sem-descricao", () => setExtraFilter("sem-descricao")),
    },
    {
      key: "revisar",
      label: "Revisão",
      value: statsBar.precisamRevisao,
      tone: "warn",
      active: activeTab === "revisao",
      onClick: () =>
        go("revisao", () => {
          setActiveTab("revisao");
          trackAdminEvent("admin_events_review_opened", { count: statsBar.precisamRevisao });
        }),
    },
    {
      key: "publicados",
      label: "Publicados",
      value: statsBar.publicados,
      tone: "good",
      active: activeStatus === "published",
      onClick: () => go("published", () => setActiveStatus("published")),
    },
    {
      key: "total",
      label: "Total",
      value: statsBar.total,
      tone: "default",
      onClick: () =>
        go("limpar", () => {
          setActiveDateFilter("todos");
          setExtraFilter("todos");
          setActiveStatus(null);
          setActiveTab("todos");
        }),
    },
  ];

  return (
    <div className="-mx-3 sm:mx-0">
      <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto scrollbar-hide px-3 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={c.onClick}
            className={`flex-shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
              c.active
                ? "ring-1 ring-primary/40 border-primary/50 bg-primary/15 text-primary"
                : toneCls[c.tone]
            }`}
            title={`Filtrar por ${c.label}`}
          >
            <span>{c.label}</span>
            <span className="rounded-md bg-background/40 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
              {c.value}
            </span>
          </button>
        ))}
        <span aria-hidden className="flex-shrink-0 w-1" />
      </div>
    </div>
  );
}
