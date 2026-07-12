/**
 * Onda 15 — Venue Intelligence
 * Repository vazio — contratos apenas. Sem banco.
 */
import type {
  VenueProfile,
  VenueEnrichmentSuggestion,
} from "../types";

export interface VenueEnrichmentRepository {
  getProfile(venueId: string): Promise<VenueProfile | null>;
  listSuggestions(venueId: string): Promise<VenueEnrichmentSuggestion[]>;
  approveSuggestion(id: string, approvedBy: string): Promise<void>;
  rejectSuggestion(id: string, rejectedBy: string, reason?: string): Promise<void>;
}

/**
 * Implementação padrão — no-op. Substituir em onda futura.
 */
export const venueEnrichmentRepository: VenueEnrichmentRepository = {
  async getProfile() {
    return null;
  },
  async listSuggestions() {
    return [];
  },
  async approveSuggestion() {
    /* no-op */
  },
  async rejectSuggestion() {
    /* no-op */
  },
};
