/**
 * Onda 18 — Feature Engine Repository (implementação em memória).
 *
 * Sem Supabase, sem I/O. Fonte única: FEATURE_CATALOG.
 */
import { FEATURE_CATALOG } from "../catalog/featureCatalog";
import type { Feature, FeatureCategory } from "../types/feature";

export interface FeatureRepository {
  list(): Promise<Feature[]>;
  findById(id: string): Promise<Feature | null>;
  findBySlug(slug: string): Promise<Feature | null>;
  listByCategory(category: FeatureCategory): Promise<Feature[]>;
}

export function createInMemoryFeatureRepository(
  catalog: readonly Feature[] = FEATURE_CATALOG,
): FeatureRepository {
  const bySlug = new Map(catalog.map((f) => [f.slug, f]));
  const byId = new Map(catalog.map((f) => [f.id, f]));

  return {
    async list() {
      return [...catalog];
    },
    async findById(id) {
      return byId.get(id) ?? null;
    },
    async findBySlug(slug) {
      return bySlug.get(slug) ?? null;
    },
    async listByCategory(category) {
      return catalog.filter((f) => f.category === category);
    },
  };
}

export const featureRepository = createInMemoryFeatureRepository();
