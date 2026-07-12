/**
 * Onda 15 — Venue Intelligence
 * Adapter Google Places — stub. Nenhuma chamada externa nesta onda.
 *
 * Futuro: sincronizar endereço, telefone, coordenadas, horário,
 * website, mapa, place_id.
 */
import type {
  VenueExternalSourceAdapter,
  VenueEnrichmentBatch,
} from "../types";

export const googlePlacesAdapter: VenueExternalSourceAdapter = {
  id: "google_places",
  async fetchSuggestions(venueId: string): Promise<VenueEnrichmentBatch> {
    return {
      venueId,
      source: "google_places",
      suggestions: [],
      generatedAt: new Date().toISOString(),
    };
  },
};
