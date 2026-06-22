// Shell que orquestra a página de listagem de eventos do admin.

import { useEventosList } from "./useEventosList";
import { EventosListFilters } from "./EventosListFilters";
import { EventosListStatsBar } from "./EventosListStatsBar";
import { EventosListBulkActions } from "./EventosListBulkActions";
import { EventosListTable } from "./EventosListTable";
import { EventosListDialogs } from "./EventosListDialogs";

export function EventosListShell() {
  const ctx = useEventosList();
  const hasSelection = ctx.selectedCount > 0;
  return (
    <div
      className="space-y-3 md:ml-44 overflow-x-hidden"
      style={{
        paddingBottom: hasSelection
          ? "calc(10rem + env(safe-area-inset-bottom, 0px))"
          : "calc(6rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <EventosListFilters ctx={ctx} />
      <EventosListStatsBar ctx={ctx} />
      <EventosListBulkActions ctx={ctx} />
      <EventosListTable ctx={ctx} />
      <EventosListDialogs ctx={ctx} />
    </div>
  );
}
