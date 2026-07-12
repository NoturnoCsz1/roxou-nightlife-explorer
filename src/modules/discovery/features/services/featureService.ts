/**
 * Onda 18 — FeatureService.
 *
 * Camada pública do Feature Engine. Consome FeatureRepository.
 * Sem side-effects externos. Determinístico.
 */
import { normalizeSlug } from "../../shared/utils/normalizeQuery";
import { FEATURE_CATALOG } from "../catalog/featureCatalog";
import {
  featureRepository as defaultRepository,
  type FeatureRepository,
} from "../repositories/featureRepository";
import type { Feature, FeatureCategory } from "../types/feature";

function normalizeTerm(input: string | undefined | null): string {
  if (!input) return "";
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export interface FeatureServiceDeps {
  repository?: FeatureRepository;
}

export interface FeatureService {
  findBySlug(slug: string): Promise<Feature | null>;
  findById(id: string): Promise<Feature | null>;
  listByCategory(category: FeatureCategory): Promise<Feature[]>;
  findBySynonym(term: string): Promise<Feature | null>;
  searchByTerm(term: string): Promise<Feature[]>;
  listIndexable(): Promise<Feature[]>;
  listEnabled(): Promise<Feature[]>;
}

export function createFeatureService(
  deps: FeatureServiceDeps = {},
): FeatureService {
  const repository = deps.repository ?? defaultRepository;

  return {
    async findBySlug(slug) {
      const normalized = normalizeSlug(slug);
      if (!normalized) return null;
      return repository.findBySlug(normalized);
    },

    async findById(id) {
      if (!id) return null;
      return repository.findById(id);
    },

    async listByCategory(category) {
      return repository.listByCategory(category);
    },

    async findBySynonym(term) {
      const needle = normalizeTerm(term);
      if (!needle) return null;
      const all = await repository.list();
      return (
        all.find(
          (f) =>
            normalizeTerm(f.name) === needle ||
            f.slug === needle ||
            f.synonyms.some((s) => normalizeTerm(s) === needle),
        ) ?? null
      );
    },

    async searchByTerm(term) {
      const needle = normalizeTerm(term);
      if (!needle) return [];
      const all = await repository.list();
      return all.filter((f) => {
        if (normalizeTerm(f.name).includes(needle)) return true;
        if (f.slug.includes(needle)) return true;
        if (f.synonyms.some((s) => normalizeTerm(s).includes(needle))) return true;
        if (f.searchTerms.some((s) => normalizeTerm(s).includes(needle))) return true;
        return false;
      });
    },

    async listIndexable() {
      const all = await repository.list();
      return all.filter((f) => f.enabled && f.indexable);
    },

    async listEnabled() {
      const all = await repository.list();
      return all.filter((f) => f.enabled);
    },
  };
}

export const featureService = createFeatureService();

/** Acesso síncrono ao catálogo cru — para consumidores puros/estáticos. */
export function getFeatureCatalog(): readonly Feature[] {
  return FEATURE_CATALOG;
}
