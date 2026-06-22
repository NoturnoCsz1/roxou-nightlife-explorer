// Shell que orquestra a página de listagem de eventos do admin (Fase 3B).
// Substituiu o componente original sem alterar comportamento.

import { useEventosList } from "./useEventosList";
import { EventosListFilters } from "./EventosListFilters";
import { EventosListBulkActions } from "./EventosListBulkActions";
import { EventosListTable } from "./EventosListTable";
import { EventosListDialogs } from "./EventosListDialogs";

export function EventosListShell() {
  const ctx = useEventosList();
  return (
    <div
      className="space-y-4 md:ml-44 overflow-x-hidden"
      style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <EventosListFilters ctx={ctx} />
      <EventosListBulkActions ctx={ctx} />
      <EventosListTable ctx={ctx} />
      <EventosListDialogs ctx={ctx} />
    </div>
  );
}
