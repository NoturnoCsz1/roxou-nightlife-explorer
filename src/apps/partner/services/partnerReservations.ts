/**
 * Shim de compatibilidade (Onda 4 — modularização Partner Pro).
 *
 * O código real vive em `@modules/partner/reservations/services/reservationsService`.
 * Este arquivo mantém as importações relativas legadas
 * (`../services/partnerReservations`) usadas por páginas e componentes em
 * `src/apps/partner/**` funcionando 1:1 durante a transição.
 *
 * Consumidores novos devem importar diretamente do módulo.
 */
export * from "@modules/partner/reservations/services/reservationsService";
