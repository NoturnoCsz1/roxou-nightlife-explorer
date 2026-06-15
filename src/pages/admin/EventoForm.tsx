import EventoFormShell from "@/apps/admin/eventos/form/EventoFormShell";

/**
 * Shell page — Fase 3C1.
 * Toda a lógica e composição visual vivem em `src/apps/admin/eventos/form/`.
 * Comportamento, queries Supabase, chamadas a Edge Functions, payloads e
 * ordem de execução foram preservados literalmente (ver useEventoForm.ts).
 */
const EventoForm = () => <EventoFormShell />;

export default EventoForm;
