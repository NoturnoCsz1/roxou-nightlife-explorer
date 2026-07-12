/**
 * Barrel público — módulo Discovery.
 *
 * Superfície oficial consumida por consumidores externos.
 * Não exporta clientes Supabase, repositories internos, tipos de
 * tabela ou implementações internas.
 */

// Contratos e tipos do motor.
export type {
  DiscoveryQuery,
  DiscoveryResult,
  DiscoveryVenueResult,
  DiscoveryEventResult,
  DiscoveryReason,
  DiscoveryOccasion,
  DiscoveryPriceRange,
  DiscoveryContext,
} from "./shared/types/discoveryQuery";

// Helpers públicos de normalização.
export {
  normalizeDiscoveryQuery,
  normalizeSlug,
  normalizeCity,
  normalizeCategory,
  normalizeFeatures,
} from "./shared/utils/normalizeQuery";

// Categorias declarativas.
export {
  DISCOVERY_CATEGORIES,
  getDiscoveryCategoryBySlug,
  listEnabledDiscoveryCategories,
  type DiscoveryCategoryConfig,
} from "./categories/discoveryCategories";

// Motor.
export { discover, type DiscoverOptions } from "./recommendations";

// Context Engine (Onda 22).
export {
  getHomeContext,
  type HomeContext,
  type HomeContextBucket,
} from "./shared/context/homeContextService";
