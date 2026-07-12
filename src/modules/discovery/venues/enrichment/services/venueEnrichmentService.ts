/**
 * Onda 15/16 — Venue Intelligence
 * Service central de enriquecimento.
 * Onda 16: adiciona composição de leads e ações de venue.
 */
import type {
  VenueEnrichmentBatch,
  VenueExternalSourceAdapter,
  VenueProfile,
} from "../types";
import type {
  Lead,
  LeadAction,
  LeadChannel,
  LeadContext,
  LeadLink,
  LeadMetadata,
  LeadOrigin,
  LeadResult,
  LeadSource,
} from "../types/lead";
import type { VenueAction } from "../types/venueAction";
import { venueEnrichmentRepository } from "../repositories/venueEnrichmentRepository";
import {
  buildLeadLinks as buildLeadLinksPure,
  buildVenueActions as buildVenueActionsPure,
  type BuildVenueActionsOptions,
} from "./venueActionsBuilder";

export interface VenueEnrichmentServiceDeps {
  adapters?: VenueExternalSourceAdapter[];
}

export interface BuildLeadInput {
  channel: LeadChannel;
  source: LeadSource;
  origin?: LeadOrigin;
  action?: LeadAction;
  result?: LeadResult;
  context: LeadContext;
  metadata?: LeadMetadata;
  occurredAt?: string;
}

export const VenueEnrichmentService = {
  async getProfile(venueId: string): Promise<VenueProfile | null> {
    return venueEnrichmentRepository.getProfile(venueId);
  },

  async collectSuggestions(
    venueId: string,
    deps: VenueEnrichmentServiceDeps = {},
  ): Promise<VenueEnrichmentBatch[]> {
    const adapters = deps.adapters ?? [];
    return Promise.all(adapters.map((a) => a.fetchSuggestions(venueId)));
  },

  /** Compõe um Lead totalmente formado a partir de input parcial. */
  buildLead(input: BuildLeadInput): Lead {
    return {
      channel: input.channel,
      source: input.source,
      origin: input.origin ?? "organic",
      action: input.action ?? "click",
      result: input.result ?? "pending",
      context: input.context,
      metadata: input.metadata,
      occurredAt: input.occurredAt ?? new Date().toISOString(),
    };
  },

  buildLeadLinks(profile: VenueProfile, opts?: BuildVenueActionsOptions): LeadLink[] {
    return buildLeadLinksPure(profile, opts);
  },

  buildVenueActions(profile: VenueProfile, opts?: BuildVenueActionsOptions): VenueAction[] {
    return buildVenueActionsPure(profile, opts);
  },
};

export type VenueEnrichmentServiceType = typeof VenueEnrichmentService;
