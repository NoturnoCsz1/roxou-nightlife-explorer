/**
 * Onda 16 — Lead Intelligence
 * Contratos para o Lead Engine.
 *
 * Nada é persistido. Apenas tipos e composição.
 */

export type LeadChannel =
  | "whatsapp"
  | "phone"
  | "instagram"
  | "website"
  | "menu"
  | "directions"
  | "reservation"
  | "vip_list"
  | "event"
  | "share"
  | "save";

export type LeadSource =
  | "venue_page"
  | "event_page"
  | "search"
  | "home"
  | "category"
  | "bio"
  | "external";

export type LeadOrigin =
  | "organic"
  | "promoter"
  | "campaign"
  | "qr"
  | "share"
  | "unknown";

export type LeadAction =
  | "click"
  | "copy"
  | "open_external"
  | "share"
  | "save"
  | "call"
  | "reserve"
  | "convert";

export type LeadResult = "pending" | "success" | "failed" | "abandoned";

export interface LeadContext {
  venueId: string;
  venueSlug: string;
  eventId?: string | null;
  eventSlug?: string | null;
  sourcePath?: string;
  referer?: string | null;
}

export interface LeadMetadata {
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  promoterSlug?: string | null;
  device?: "mobile" | "desktop" | "tablet" | "unknown";
  locale?: string;
  extra?: Record<string, string | number | boolean | null>;
}

export interface Lead {
  id?: string;
  channel: LeadChannel;
  source: LeadSource;
  origin: LeadOrigin;
  action: LeadAction;
  result: LeadResult;
  context: LeadContext;
  metadata?: LeadMetadata;
  occurredAt: string;
}

/** URL montada + canal — pronta para renderizar/rastrear. */
export interface LeadLink {
  channel: LeadChannel;
  url: string;
  label?: string;
}
