/**
 * Barrel público — Feature Engine (Onda 18).
 * Nenhum consumidor externo migrado nesta onda.
 */
export type {
  Feature,
  FeatureCategory,
  FeatureSource,
  VenueFeatureAssignment,
} from "./types/feature";

export { FEATURE_CATALOG, FEATURE_CATEGORIES } from "./catalog/featureCatalog";

export {
  createInMemoryFeatureRepository,
  featureRepository,
  type FeatureRepository,
} from "./repositories/featureRepository";

export {
  createFeatureService,
  featureService,
  getFeatureCatalog,
  resolveVenueFeatures,
  groupResolvedFeaturesByCategory,
  hasFeatureSlug,
  buildFeatureSeo,
  type FeatureService,
  type FeatureServiceDeps,
  type ResolvedVenueFeature,
  type FeatureGroup,
  type FeatureSeoInput,
  type FeatureSeoOutput,
} from "./services";

export { getFeatureIcon } from "./ui/featureIconMap";
export { default as VenueFeaturesEditor } from "./ui/VenueFeaturesEditor";
export {
  venueFeaturesRepository,
  parseVenueFeaturesJson,
  type VenueFeaturesRepository,
} from "./repositories/venueFeaturesRepository";

