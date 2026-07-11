/**
 * Discovery Engine — contratos de consulta e resultado.
 *
 * TypeScript puro. Sem Supabase, sem React, sem side-effects.
 * Reutiliza os contratos públicos declarados em `@contracts/discovery`
 * para não duplicar modelos.
 *
 * Onda 9 (base). Campos ausentes hoje no schema (ex.: priceRange,
 * features, openNow) permanecem opcionais e são ignorados pelo
 * repository quando não houver coluna correspondente — permite evoluir
 * sem quebrar chamadores.
 */
import type { PublicEvent, PublicVenue } from "@/contracts/discovery";

/** Ocasiões declarativas suportadas pelo motor (não confundir com categoria). */
export type DiscoveryOccasion =
  | "onde-comer"
  | "onde-sair"
  | "happy-hour"
  | "romantico"
  | "familia"
  | "pet-friendly"
  | "aniversario";

/** Faixas de preço declarativas (map futuro para colunas reais). */
export type DiscoveryPriceRange = "econ" | "medio" | "premium";

/** Consulta de descoberta. Todos os campos são opcionais. */
export interface DiscoveryQuery {
  /** Slug/nome curto da cidade. */
  city?: string;
  /** Categoria Discovery (slug em `discoveryCategories`). */
  category?: string;
  /** Tipo de culinária (mapeia futuramente para tags/type). */
  cuisine?: string;
  /** Ocasião de consumo. */
  occasion?: DiscoveryOccasion;
  /** Faixa de preço. */
  priceRange?: DiscoveryPriceRange;
  /** Recursos desejados (ex.: 'ao-vivo', 'estacionamento'). */
  features?: string[];
  /** Dia da semana (0-6, domingo=0). */
  dayOfWeek?: number;
  /** Data alvo (YYYY-MM-DD ou ISO). */
  date?: string;
  /** Horário alvo (HH:mm). */
  time?: string;
  /** Coordenadas para busca por proximidade. */
  latitude?: number;
  longitude?: number;
  /** Raio em km (usa distância euclidiana simples). */
  radiusKm?: number;
  /** Somente locais abertos agora (best-effort, ignora sem horário). */
  openNow?: boolean;
  /** Restringe a locais com eventos publicados a partir de hoje. */
  hasEvents?: boolean;
  /** Paginação. */
  limit?: number;
  offset?: number;
}

/** Motivos tipados de por que um resultado foi incluído/rankeado. */
export type DiscoveryReason =
  | "matches_category"
  | "matches_occasion"
  | "matches_cuisine"
  | "matches_feature"
  | "matches_city"
  | "open_now"
  | "nearby"
  | "has_event"
  | "featured"
  | "verified";

/** Resultado individual para um local público. */
export interface DiscoveryVenueResult {
  venue: PublicVenue;
  /** Score interno de ordenação (não exibir como avaliação pública). */
  score: number;
  reasons: DiscoveryReason[];
  /** Distância em km, quando `latitude/longitude` foram fornecidos. */
  distanceKm?: number;
}

/** Resultado individual para um evento público. */
export interface DiscoveryEventResult {
  event: PublicEvent;
  score: number;
  reasons: DiscoveryReason[];
}

/** Retorno padronizado do motor. */
export interface DiscoveryResult {
  venues: DiscoveryVenueResult[];
  events: DiscoveryEventResult[];
  totalVenues: number;
  totalEvents: number;
  appliedFilters: DiscoveryQuery;
}

/** Contexto opcional para futuras heurísticas (IA, clima, perfil). */
export interface DiscoveryContext {
  nowIso?: string;
  latitude?: number;
  longitude?: number;
  occasion?: DiscoveryOccasion;
  weather?: string;
  userProfileHint?: Record<string, unknown>;
}
