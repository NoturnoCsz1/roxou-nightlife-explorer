/**
 * Onda 19 — Helpers puros de agrupamento e ordenação.
 * Consomem apenas o catálogo e `VenueFeatureAssignment[]`.
 */
import { FEATURE_CATALOG, FEATURE_CATEGORIES } from "../catalog/featureCatalog";
import type {
  Feature,
  FeatureCategory,
  VenueFeatureAssignment,
} from "../types/feature";

export interface ResolvedVenueFeature {
  feature: Feature;
  assignment: VenueFeatureAssignment;
}

export interface FeatureGroup {
  category: FeatureCategory;
  label: string;
  items: ResolvedVenueFeature[];
}

const CATEGORY_LABEL = new Map(
  FEATURE_CATEGORIES.map((c) => [c.id, c.label]),
);

const CATEGORY_ORDER = FEATURE_CATEGORIES.map((c) => c.id);

const CATALOG_BY_SLUG = new Map(FEATURE_CATALOG.map((f) => [f.slug, f]));

/**
 * Resolve assignments contra o catálogo e filtra:
 * - features desconhecidas;
 * - features desabilitadas;
 * - assignments com `approved === false`.
 */
export function resolveVenueFeatures(
  assignments: VenueFeatureAssignment[] | undefined | null,
): ResolvedVenueFeature[] {
  if (!assignments?.length) return [];
  const seen = new Set<string>();
  const out: ResolvedVenueFeature[] = [];
  for (const a of assignments) {
    if (a.approved === false) continue;
    if (seen.has(a.featureSlug)) continue;
    const feature = CATALOG_BY_SLUG.get(a.featureSlug);
    if (!feature || !feature.enabled) continue;
    seen.add(a.featureSlug);
    out.push({ feature, assignment: a });
  }
  return out;
}

/** Agrupa por categoria e ordena por `weight` desc dentro de cada grupo. */
export function groupResolvedFeaturesByCategory(
  resolved: ResolvedVenueFeature[],
): FeatureGroup[] {
  const buckets = new Map<FeatureCategory, ResolvedVenueFeature[]>();
  for (const r of resolved) {
    const arr = buckets.get(r.feature.category) ?? [];
    arr.push(r);
    buckets.set(r.feature.category, arr);
  }
  const groups: FeatureGroup[] = [];
  for (const cat of CATEGORY_ORDER) {
    const items = buckets.get(cat);
    if (!items?.length) continue;
    items.sort((a, b) => b.feature.weight - a.feature.weight);
    groups.push({
      category: cat,
      label: CATEGORY_LABEL.get(cat) ?? cat,
      items,
    });
  }
  return groups;
}

/** Verifica se um slug específico está presente na lista resolvida. */
export function hasFeatureSlug(
  resolved: ResolvedVenueFeature[],
  slug: string,
): boolean {
  return resolved.some((r) => r.feature.slug === slug);
}
