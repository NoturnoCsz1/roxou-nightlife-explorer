/**
 * Onda 15 — Venue Intelligence
 * Contratos de fontes externas de dados (Google, Instagram, etc).
 * Nenhuma implementação nesta onda.
 */
import type { VenueEnrichmentBatch } from "./venueEnrichment";

export type VenueExternalSourceId =
  | "google_places"
  | "instagram_business"
  | "facebook"
  | "website"
  | "manual_partner"
  | "manual_admin"
  | "ai";

export interface VenueExternalSourceAdapter {
  readonly id: VenueExternalSourceId;
  /** Retorna sugestões a partir da fonte. Sem side-effects nesta onda. */
  fetchSuggestions(venueId: string): Promise<VenueEnrichmentBatch>;
}
