/**
 * Onda 15 — Venue Intelligence
 * Adapter Instagram — stub. Nenhuma chamada externa nesta onda.
 *
 * Futuro: bio, posts, hashtags, especialidades, conteúdo.
 */
import type {
  VenueExternalSourceAdapter,
  VenueEnrichmentBatch,
} from "../types";

export const instagramAdapter: VenueExternalSourceAdapter = {
  id: "instagram_business",
  async fetchSuggestions(venueId: string): Promise<VenueEnrichmentBatch> {
    return {
      venueId,
      source: "instagram",
      suggestions: [],
      generatedAt: new Date().toISOString(),
    };
  },
};
