/**
 * Onda 15 — Venue Intelligence
 * Service central de enriquecimento — stub.
 * Futuro: orquestra Google, Instagram, IA, Partner, Admin.
 */
import type {
  VenueEnrichmentBatch,
  VenueExternalSourceAdapter,
  VenueProfile,
} from "../types";
import { venueEnrichmentRepository } from "../repositories/venueEnrichmentRepository";

export interface VenueEnrichmentServiceDeps {
  adapters?: VenueExternalSourceAdapter[];
}

export const VenueEnrichmentService = {
  /** Retorna o perfil enriquecido (nesta onda: sempre null). */
  async getProfile(venueId: string): Promise<VenueProfile | null> {
    return venueEnrichmentRepository.getProfile(venueId);
  },

  /** Executa todos os adapters. Sem side-effects reais nesta onda. */
  async collectSuggestions(
    venueId: string,
    deps: VenueEnrichmentServiceDeps = {},
  ): Promise<VenueEnrichmentBatch[]> {
    const adapters = deps.adapters ?? [];
    return Promise.all(adapters.map((a) => a.fetchSuggestions(venueId)));
  },
};

export type VenueEnrichmentServiceType = typeof VenueEnrichmentService;
