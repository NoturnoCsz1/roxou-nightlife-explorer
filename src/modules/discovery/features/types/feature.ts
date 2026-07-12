/**
 * Onda 18 — Feature Engine
 * Contratos oficiais para o catálogo de características dos estabelecimentos.
 *
 * Puro TypeScript. Sem Supabase, sem React, sem side-effects.
 */

export type FeatureCategory =
  | "ambiente"
  | "publico"
  | "comida"
  | "bebidas"
  | "servicos"
  | "estrutura"
  | "experiencia"
  | "entretenimento"
  | "acessibilidade"
  | "pagamento";

/**
 * Fonte de classificação de uma feature aplicada a um venue.
 * Reservado para IA/Admin/Partner nas próximas ondas.
 */
export type FeatureSource =
  | "manual_admin"
  | "manual_partner"
  | "google_places"
  | "instagram"
  | "ai"
  | "inferred";

/**
 * Registro do catálogo — imutável, versionado por deploy.
 * Nenhum campo aqui reflete estado de banco.
 */
export interface Feature {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** Nome do ícone (lucide-react). */
  icon: string;
  category: FeatureCategory;

  /** SEO. */
  seoTitle: string;
  seoDescription: string;
  /** Slug canônico para futuras URLs (ex.: /descubra/pet-friendly). */
  canonicalSlug: string;
  /** Elegível para indexação (páginas dedicadas). */
  indexable: boolean;

  /** Habilitada globalmente (pode ser desligada sem remover). */
  enabled: boolean;
  /** Peso para ranking do Discovery Engine (0..100). */
  weight: number;

  /** Sinônimos aceitos em busca e classificação. */
  synonyms: string[];
  /** Termos de busca completos que devem casar com essa feature. */
  searchTerms: string[];
}

/**
 * Feature aplicada a um venue — reservado para futuras ondas.
 * Nenhum consumidor nesta onda.
 */
export interface VenueFeatureAssignment {
  featureId: string;
  featureSlug: string;
  source: FeatureSource;
  /** 0..1. */
  confidence?: number;
  approved?: boolean;
  suggested?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
