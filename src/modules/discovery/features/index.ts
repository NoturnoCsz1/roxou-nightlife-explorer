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
  type FeatureService,
  type FeatureServiceDeps,
} from "./services/featureService";
