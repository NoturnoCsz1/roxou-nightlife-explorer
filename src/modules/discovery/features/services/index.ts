export {
  createFeatureService,
  featureService,
  getFeatureCatalog,
  type FeatureService,
  type FeatureServiceDeps,
} from "./featureService";

export {
  resolveVenueFeatures,
  groupResolvedFeaturesByCategory,
  hasFeatureSlug,
  type ResolvedVenueFeature,
  type FeatureGroup,
} from "./featureGrouping";

export {
  buildFeatureSeo,
  type FeatureSeoInput,
  type FeatureSeoOutput,
} from "./featureSeoHelper";

