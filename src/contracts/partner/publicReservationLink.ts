/**
 * Partner Pro — contrato público de link de reserva.
 *
 * Projeção mínima consumida pela Roxou Descobertas para renderizar
 * o CTA "Reservar" a partir de um local ou evento.
 */

export type PublicReservationLinkStatus = "open" | "closed" | "paused";

export interface PublicReservationLink {
  /** Identificador estável do link público. */
  publicToken: string;
  /** Parceiro proprietário. */
  partnerId: string;
  partnerSlug: string;
  /** Título exibido publicamente. */
  title?: string | null;
  /** URL canônica: `/reserva/:publicToken` ou variação por slug. */
  url: `/reserva/${string}`;
  status: PublicReservationLinkStatus;
  /** ISO8601. Ausente se o link é permanente. */
  validUntilIso?: string | null;
}
