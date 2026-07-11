/**
 * Transporte Roxou — contrato público de link de transporte/excursão.
 *
 * Consumido pela Roxou Descobertas ao exibir CTA "Como você vai?"
 * em um evento ou local.
 */

export type PublicTransportKind =
  | "excursion"       // van/ônibus fretado
  | "ride"            // carona
  | "private";        // motorista privado

export interface PublicTransportLink {
  id: string;
  kind: PublicTransportKind;
  /** URL canônica pública, ex.: `/transportes/excursoes/:slug`. */
  url: string;
  /** Evento vinculado (se transporte para evento). */
  eventId?: string | null;
  /** Rota resumida para exibição. */
  originLabel?: string | null;
  destinationLabel?: string | null;
  /** Horário de saída ISO8601. */
  departureIso?: string | null;
  /** Preço público em BRL, se aplicável. */
  priceBrl?: number | null;
  /** Vagas restantes; null quando não se aplica. */
  seatsAvailable?: number | null;
  status: "open" | "sold_out" | "closed";
}
