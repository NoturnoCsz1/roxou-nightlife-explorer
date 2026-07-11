/**
 * Barrel público — Discovery / Events.
 * Superfície oficial consumida pelas páginas públicas de eventos.
 */
export * from "./repositories/eventsRepository";
// Bridges aditivas herdadas da Onda 6 (sem consumidores atuais, mantidas
// para não quebrar contrato caso apareçam novos usos).
export * from "./services/eventService";
