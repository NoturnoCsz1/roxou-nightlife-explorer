/**
 * Types públicos do módulo Reservations (Partner Pro).
 *
 * Reexporta as interfaces já declaradas no service, oferecendo um
 * ponto de importação estável para consumidores externos que só
 * precisam dos tipos (sem carregar o supabase client).
 */
export type {
  PartnerReservationStatus,
  PartnerReservationTypeKind,
  PartnerReservationRow,
  PartnerReservationSettings,
  PartnerReservationPayload,
  PartnerReservationSettingsPayload,
  PartnerReservationType,
  DepositType,
} from "@modules/partner/reservations/services/reservationsService";
