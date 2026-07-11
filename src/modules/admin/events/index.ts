/**
 * Módulo Admin — Eventos (Onda 13).
 *
 * Vertical técnico do formulário administrativo de eventos.
 *
 * Propósito desta onda:
 *  - Quebrar o ciclo `eventoFormSubmit ↔ eventoFormActions` movendo o
 *    contrato compartilhado (`EventoFormActionDeps`) para cá.
 *  - Consolidar o acesso Supabase do formulário em um repository
 *    dedicado (`eventsAdminRepository`), sem alterar tabelas, payloads,
 *    filtros, RPCs ou tratamento de erro.
 *
 * Regras:
 *  - Nenhum arquivo aqui importa React, sonner, react-router ou páginas.
 *  - Nenhum efeito colateral: só tipos + I/O pura.
 *  - Consumidores externos devem importar de `@modules/admin/events`.
 */
export * from "./types/eventoFormDeps";
export * from "./repositories/eventsAdminRepository";
