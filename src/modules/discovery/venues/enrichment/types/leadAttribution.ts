/**
 * Onda 15 — Venue Intelligence
 * Tipos para atribuição de leads gerados a partir das páginas de local.
 *
 * Nada é persistido nesta onda.
 */

export type VenueLeadChannel =
  | "whatsapp"
  | "phone"
  | "instagram"
  | "directions"
  | "menu"
  | "reservation"
  | "vip_list"
  | "event";

export interface VenueLeadAttribution {
  venueId: string;
  venueSlug: string;
  channel: VenueLeadChannel;
  /** Referência opcional ao evento que originou o clique. */
  eventId?: string | null;
  /** Página de origem (path relativo). */
  sourcePath?: string;
  /** UTM/attribution já parseado pelo caller. */
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  occurredAt: string;
}
