// Tabela / seções agrupadas de eventos (Aura, Destaques, Hoje, Próximos
// e Passados). Suporta visualização em Cards (agrupado) ou Lista compacta.

import { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EventosListRow } from "./EventosListRow";
import { EventosListCompactRow } from "./EventosListCompactRow";
import { EventosListPagination } from "./EventosListPagination";
import { trackAdminEvent } from "@/lib/adminAnalytics";
import type { EventRow } from "./types";
import type { EventosListCtx } from "./useEventosList";

function Section({
  title,
  items,
  emoji,
  ctx,
}: {
  title: string;
  items: EventRow[];
  emoji: string;
  ctx: EventosListCtx;
}) {
  if (items.length === 0) return null;
  const dups = ctx.duplicateIds;
  return (
    <div>
      <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
        {emoji} {title} ({items.length})
      </h2>
      <div className="space-y-2">
        {items.map((e) => (
          <EventosListRow key={e.id} e={e} ctx={ctx} isDuplicate={dups.has(e.id)} />
        ))}
      </div>
    </div>
  );
}

export function EventosListTable({ ctx }: { ctx: EventosListCtx }) {
  const {
    loading,
    filtered,
    visibleFiltered,
    auraEvents,
    featuredTodayEvents,
    todayEvents,
    upcomingEvents,
    pastEvents,
    pastOpen,
    setPastOpen,
    viewMode,
    duplicateIds,
  } = ctx;

  // Sinaliza ao analytics que duplicados foram exibidos (debounced via memo)
  useMemo(() => {
    if (duplicateIds.size > 0) {
      trackAdminEvent("admin_events_duplicate_flag_seen", { count: duplicateIds.size });
    }
    return null;
  }, [duplicateIds]);

  if (loading) {
    return <p className="text-xs text-muted-foreground text-center py-8">Carregando...</p>;
  }
  if (filtered.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-8">Nenhum evento encontrado.</p>;
  }

  if (viewMode === "compact") {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground/80 tabular-nums">{filtered.length}</span>{" "}
            eventos • Lista compacta
          </p>
          <details className="relative">
            <summary className="list-none cursor-pointer inline-flex items-center justify-center h-6 w-6 rounded-full border border-border/40 bg-secondary/40 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition select-none">
              ?
            </summary>
            <div className="absolute right-0 top-full mt-1 z-30 w-48 rounded-lg border border-border/40 bg-card/95 backdrop-blur-xl p-2.5 shadow-xl text-[11px] space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Status</p>
              <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-green-400" /> Publicado</div>
              <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-orange-400" /> Hoje / atenção</div>
              <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-yellow-400" /> Rascunho / revisão</div>
              <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> Arquivado</div>
            </div>
          </details>
        </div>
        {visibleFiltered.map((e) => (
          <EventosListCompactRow
            key={e.id}
            e={e}
            ctx={ctx}
            isDuplicate={duplicateIds.has(e.id)}
          />
        ))}
        <EventosListPagination ctx={ctx} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Section title="Escolha da Aura" items={auraEvents} emoji="🤖" ctx={ctx} />
      <Section title="Destaques do dia" items={featuredTodayEvents} emoji="🔥" ctx={ctx} />
      <Section title="Hoje" items={todayEvents} emoji="📌" ctx={ctx} />
      <Section title="Próximos" items={upcomingEvents} emoji="🔜" ctx={ctx} />

      {pastEvents.length > 0 && (
        <Collapsible open={pastOpen} onOpenChange={setPastOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full group">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              📂 Eventos Passados ({pastEvents.length})
            </h2>
            <ChevronDown
              className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
                pastOpen ? "rotate-180" : ""
              }`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="space-y-2">
              {pastEvents.map((e) => (
                <EventosListRow
                  key={e.id}
                  e={e}
                  ctx={ctx}
                  isDuplicate={duplicateIds.has(e.id)}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      <EventosListPagination ctx={ctx} />
    </div>
  );
}
