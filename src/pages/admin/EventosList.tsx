// Re-export temporário (Fase 6A). A página foi movida para
// `src/apps/admin/pages/EventosList.tsx`. Mantido aqui para preservar
// imports legados (inclusive o re-export de `getEventEditPath`).
export { default } from "@/apps/admin/pages/EventosList";
export { getEventEditPath } from "@/apps/admin/eventos/list/types";
