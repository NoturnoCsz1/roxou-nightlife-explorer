/**
 * Service — Discovery Engine.
 *
 * Recebe uma DiscoveryQuery, normaliza filtros, chama o repository,
 * monta um DiscoveryResult com ranking simples, determinístico e
 * explicável. Não consome IA. Não usa perfil do usuário. Não altera
 * banco.
 */
import type {
  DiscoveryContext,
  DiscoveryEventResult,
  DiscoveryQuery,
  DiscoveryReason,
  DiscoveryResult,
  DiscoveryVenueResult,
} from "../../shared/types/discoveryQuery";
import {
  haversineKm,
  normalizeDiscoveryQuery,
} from "../../shared/utils/normalizeQuery";
import { getDiscoveryCategoryBySlug } from "../../categories/discoveryCategories";
import type { PublicEvent, PublicVenue } from "@/contracts/discovery";
import {
  fetchDiscoveryUpcomingEvents,
  fetchDiscoveryVenues,
  fetchPartnerIdsWithUpcomingEvents,
  type DiscoveryEventRow,
  type DiscoveryVenueRow,
} from "../repositories/discoveryRepository";

// ── Projeções para contratos públicos ────────────────────────────────
function toPublicVenue(row: DiscoveryVenueRow): PublicVenue {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    type: row.type ?? null,
    city: row.city ?? null,
    address: row.address ?? null,
    neighborhood: row.neighborhood ?? null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    imageUrl: row.logo_url ?? null,
    logoUrl: row.logo_url ?? null,
    instagram: row.instagram ?? null,
    whatsapp: row.whatsapp ?? null,
    website: null,
    active: row.active,
    verified: row.verified_partner ?? false,
    priceRange: null,
    tags: row.aura_partner_tags ?? [],
  };
}

function toPublicEvent(row: DiscoveryEventRow): PublicEvent {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    subCategory: row.sub_category ?? null,
    dateTimeIso: row.date_time,
    venueName: row.venue_name ?? null,
    address: row.address ?? null,
    city: row.city ?? null,
    imageUrl: row.image_url ?? null,
    videoUrl: row.video_url ?? null,
    ticketUrl: row.ticket_url ?? null,
    status: (row.status as PublicEvent["status"]) ?? "published",
    partnerId: row.partner_id ?? null,
    partnerSlug: null,
  };
}

// ── Ranking helpers ──────────────────────────────────────────────────
function scoreVenue(
  row: DiscoveryVenueRow,
  query: DiscoveryQuery,
  hasEventPartnerIds: Set<string>,
): { score: number; reasons: DiscoveryReason[]; distanceKm?: number } {
  const reasons: DiscoveryReason[] = [];
  let score = 0;

  if (query.city && row.city === query.city) {
    reasons.push("matches_city");
    score += 10;
  }
  if (query.cuisine && row.type === query.cuisine) {
    reasons.push("matches_cuisine");
    score += 25;
  }
  if (query.occasion) {
    reasons.push("matches_occasion");
    score += 5;
  }
  if (query.features?.length && row.aura_partner_tags?.length) {
    const tagSet = new Set(row.aura_partner_tags);
    const hits = query.features.filter((f) => tagSet.has(f));
    if (hits.length) {
      reasons.push("matches_feature");
      score += 8 * hits.length;
    }
  }
  if (row.featured_home) {
    reasons.push("featured");
    score += 12;
  }
  if (row.verified_partner) {
    reasons.push("verified");
    score += 4;
  }
  if (hasEventPartnerIds.has(row.id)) {
    reasons.push("has_event");
    score += 15;
  }
  if (typeof row.aura_partner_score === "number") {
    score += Math.max(0, Math.min(20, row.aura_partner_score / 5));
  }

  let distanceKm: number | undefined;
  if (
    typeof query.latitude === "number" &&
    typeof query.longitude === "number" &&
    typeof row.latitude === "number" &&
    typeof row.longitude === "number"
  ) {
    distanceKm = haversineKm(
      query.latitude,
      query.longitude,
      row.latitude,
      row.longitude,
    );
    if (typeof query.radiusKm !== "number" || distanceKm <= query.radiusKm) {
      reasons.push("nearby");
      score += Math.max(0, 20 - distanceKm);
    }
  }

  return { score, reasons, distanceKm };
}

function scoreEvent(
  row: DiscoveryEventRow,
  query: DiscoveryQuery,
): { score: number; reasons: DiscoveryReason[] } {
  const reasons: DiscoveryReason[] = [];
  let score = 0;
  if (query.category && row.category === query.category) {
    reasons.push("matches_category");
    score += 20;
  }
  if (query.city && row.city === query.city) {
    reasons.push("matches_city");
    score += 8;
  }
  // Evento mais próximo no tempo pontua mais.
  const eventMs = new Date(row.date_time).getTime();
  const days = Math.max(0, (eventMs - Date.now()) / (1000 * 60 * 60 * 24));
  score += Math.max(0, 15 - days);
  reasons.push("has_event");
  return { score, reasons };
}

// ── API pública do service ───────────────────────────────────────────
export interface DiscoverOptions {
  /** Contexto opcional (preparado para IA/heurísticas futuras). */
  context?: DiscoveryContext;
}

/**
 * Motor principal de descoberta. Determinístico e explicável.
 * `options.context` é aceito e reservado para heurísticas futuras.
 */
export async function discover(
  input: DiscoveryQuery,
  _options: DiscoverOptions = {},
): Promise<DiscoveryResult> {
  const query = normalizeDiscoveryQuery(mergeCategoryFilters(input));

  const [venueRows, eventRows] = await Promise.all([
    fetchDiscoveryVenues(query),
    fetchDiscoveryUpcomingEvents(query),
  ]);

  const hasEventPartnerIds = query.hasEvents
    ? await fetchPartnerIdsWithUpcomingEvents(query.city)
    : new Set<string>(
        eventRows.map((e) => e.partner_id).filter((v): v is string => !!v),
      );

  // Venues
  let venues: DiscoveryVenueResult[] = venueRows
    .map<DiscoveryVenueResult>((row) => {
      const { score, reasons, distanceKm } = scoreVenue(
        row,
        query,
        hasEventPartnerIds,
      );
      return { venue: toPublicVenue(row), score, reasons, distanceKm };
    })
    .filter((r) => {
      if (query.hasEvents && !r.reasons.includes("has_event")) return false;
      if (
        typeof query.radiusKm === "number" &&
        typeof r.distanceKm === "number" &&
        r.distanceKm > query.radiusKm
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.score - a.score);

  const events: DiscoveryEventResult[] = eventRows
    .map<DiscoveryEventResult>((row) => {
      const { score, reasons } = scoreEvent(row, query);
      return { event: toPublicEvent(row), score, reasons };
    })
    .sort((a, b) => b.score - a.score);

  const totalVenues = venues.length;
  const totalEvents = events.length;

  const offset = query.offset ?? 0;
  const limit = query.limit ?? 20;
  venues = venues.slice(offset, offset + limit);

  return {
    venues,
    events: events.slice(0, limit),
    totalVenues,
    totalEvents,
    appliedFilters: query,
  };
}

function mergeCategoryFilters(input: DiscoveryQuery): DiscoveryQuery {
  const cfg = getDiscoveryCategoryBySlug(input.category);
  if (!cfg) return input;
  return {
    ...cfg.filters,
    ...input,
    features: Array.from(
      new Set([...(cfg.filters.features ?? []), ...(input.features ?? [])]),
    ),
  };
}
