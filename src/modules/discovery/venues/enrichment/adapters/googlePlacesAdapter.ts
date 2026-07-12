/**
 * Onda 15/16 — Venue Intelligence
 * Adapter Google Places — stub. Nenhuma chamada externa nesta onda.
 *
 * Onda 16: adiciona `fetchProfile(placeId)` no contrato, também stub,
 * para preparar o consumo futuro sem quebrar contratos.
 */
import type {
  VenueExternalSourceAdapter,
  VenueEnrichmentBatch,
} from "../types";
import type { GooglePlaceProfile, PlaceId } from "../types/googlePlaces";

export interface GooglePlacesAdapter extends VenueExternalSourceAdapter {
  /** Retorna o perfil bruto do Google Places. Stub nesta onda. */
  fetchProfile(placeId: PlaceId): Promise<GooglePlaceProfile | null>;
}

export const googlePlacesAdapter: GooglePlacesAdapter = {
  id: "google_places",
  async fetchSuggestions(venueId: string): Promise<VenueEnrichmentBatch> {
    return {
      venueId,
      source: "google_places",
      suggestions: [],
      generatedAt: new Date().toISOString(),
    };
  },
  async fetchProfile(): Promise<GooglePlaceProfile | null> {
    return null;
  },
};
