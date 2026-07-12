/**
 * Onda 15 — Venue Intelligence
 * Tipos que descrevem sugestões de enriquecimento (fluxo IA/Admin/Partner).
 *
 * Somente contratos.
 */
import type { VenueEnrichmentSource } from "./venueProfile";

export type VenueEnrichmentStatus =
  | "suggested"
  | "approved"
  | "rejected"
  | "expired";

export type VenueEnrichmentConfidence = "low" | "medium" | "high";

/**
 * Uma sugestão pontual — proposta de valor para UM campo do perfil.
 * O `field` deve corresponder a um caminho válido em VenueProfile.
 */
export interface VenueEnrichmentSuggestion<TValue = unknown> {
  id: string;
  venueId: string;
  field: string;
  value: TValue;
  status: VenueEnrichmentStatus;
  source: VenueEnrichmentSource;
  confidence: VenueEnrichmentConfidence;
  /** Trecho, URL ou observação que fundamenta a sugestão. */
  evidence?: string | null;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string | null;
  rejectedBy?: string | null;
  rejectionReason?: string | null;
}

export interface VenueEnrichmentBatch {
  venueId: string;
  source: VenueEnrichmentSource;
  suggestions: VenueEnrichmentSuggestion[];
  generatedAt: string;
}
