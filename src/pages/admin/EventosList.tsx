// Página de listagem de eventos do admin.
// Refatorada na Fase 3B: a lógica vive em src/apps/admin/eventos/list/.
// Este arquivo permanece como entry-point para manter as rotas existentes
// (lazy-import em App.tsx) e o re-export público de getEventEditPath.

import { EventosListShell } from "@/apps/admin/eventos/list/EventosListShell";

// Re-export para compatibilidade com qualquer import existente.
export { getEventEditPath } from "@/apps/admin/eventos/list/types";

const EventosList = () => <EventosListShell />;

export default EventosList;
