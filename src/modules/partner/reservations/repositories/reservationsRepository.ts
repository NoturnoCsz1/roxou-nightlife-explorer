/**
 * Repository de Reservas (Partner Pro) — Onda 4.
 *
 * Ponto de entrada estável para a camada de acesso a dados de reservas.
 * A separação física entre "queries puras" e "orquestração" ainda vive
 * dentro do service (`reservationsService.ts`) — o split mecânico é uma
 * dívida técnica registrada em `docs/plano-modularizacao-roxou.md` e
 * será feito em onda futura sem alterar contrato.
 */
export {
  // Settings
  getReservationSettings,
  updateReservationSettings,
  // Reservation types
  listReservationTypes,
  upsertReservationType,
  deleteReservationType,
  updateReservationTypeDuration,
  getReservationTypesAvailability,
  // Reservations
  listReservations,
  getReservation,
  createReservation,
  updateReservation,
  cancelReservation,
  confirmReservation,
  completeReservation,
  noShowReservation,
  confirmReservationPayment,
  waivePartnerReservationDeposit,
  releasePartnerReservationTable,
  // Waitlist
  listReservationWaitlist,
  notifyWaitlistEntry,
  cancelWaitlistEntry,
  // Insights
  getReservationSlotAvailability,
  getReservationOccupancyInsights,
} from "@modules/partner/reservations/services/reservationsService";
