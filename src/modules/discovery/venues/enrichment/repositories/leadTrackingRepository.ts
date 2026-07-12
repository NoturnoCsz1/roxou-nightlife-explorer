/**
 * Onda 16 — Lead Intelligence
 * Interface para futura persistência de leads / cliques / conversões.
 * Implementação no-op. Nenhum acesso a banco.
 */
import type { Lead, LeadChannel, LeadContext, LeadMetadata } from "../types/lead";

export interface LeadClickInput {
  channel: LeadChannel;
  context: LeadContext;
  metadata?: LeadMetadata;
  occurredAt?: string;
}

export interface LeadConversionInput {
  leadId?: string;
  channel: LeadChannel;
  context: LeadContext;
  value?: number;
  metadata?: LeadMetadata;
  occurredAt?: string;
}

export interface LeadTrackingRepository {
  trackLead(lead: Lead): Promise<void>;
  trackClick(input: LeadClickInput): Promise<void>;
  trackConversion(input: LeadConversionInput): Promise<void>;
}

export const leadTrackingRepository: LeadTrackingRepository = {
  async trackLead() {
    /* no-op */
  },
  async trackClick() {
    /* no-op */
  },
  async trackConversion() {
    /* no-op */
  },
};
