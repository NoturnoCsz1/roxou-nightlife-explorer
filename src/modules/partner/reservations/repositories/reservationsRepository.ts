/**
 * Repository de Reservas (Partner Pro) — Onda 4.
 *
 * Ponto de entrada estável para a camada de acesso a dados de reservas.
 * A separação física entre "queries puras" e "orquestração" ainda vive
 * dentro do service (`reservationsService.ts`) — o split mecânico é uma
 * dívida técnica registrada em `docs/plano-modularizacao-roxou.md` e
 * será feito em onda futura sem alterar contrato.
 *
 * Consumidores devem preferir importar deste arquivo quando precisarem
 * de operações de banco (list/get/insert/update/rpc); imports de tipos
 * devem vir de `@modules/partner/reservations/types`.
 */
export {
  // Settings
  getReservationSettings,
  updateReservationSettings,
  // Reservation types
  listReservationTypes,
  createReservationType,
  updateReservationType,
  deleteReservationType,
  // Reservations
  listReservations,
  getReservation,
  createReservation,
  updateReservation,
  updateReservationStatus,
  cancelReservation,
  confirmReservation,
} from "@modules/partner/reservations/services/reservationsService";
