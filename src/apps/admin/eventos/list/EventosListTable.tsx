// Tabela / seções agrupadas de eventos (Aura, Destaques, Hoje, Próximos
// e Passados). JSX copiado literalmente da função renderSection.

import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EventosListRow } from "./EventosListRow";
import { EventosListPagination } from "./EventosListPagination";
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
  return (
    <div>
      <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
        {emoji} {title} ({items.length})
      </h2>
      <div className="space-y-2">
        {items.map((e) => (
          <EventosListRow key={e.id} e={e} ctx={ctx} />
        ))}
      </div>
    </div>
  );
}

export function EventosListTable({ ctx }: { ctx: EventosListCtx }) {
  const {
    loading,
    filtered,
    auraEvents,
    featuredTodayEvents,
    todayEvents,
    upcomingEvents,
    pastEvents,
    pastOpen,
    setPastOpen,
  } = ctx;

  if (loading) {
    return <p className="text-xs text-muted-foreground text-center py-8">Carregando...</p>;
  }
  if (filtered.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-8">Nenhum evento encontrado.</p>;
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
                <EventosListRow key={e.id} e={e} ctx={ctx} />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      <EventosListPagination ctx={ctx} />
    </div>
  );
}
