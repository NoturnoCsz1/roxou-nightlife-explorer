/**
 * Configuração declarativa das categorias iniciais do Discovery Engine.
 *
 * Exclusiva do módulo Discovery — NÃO substitui `src/lib/categoryConfig.ts`
 * (taxonomia legada cross-produto). Preparada para expansão e futuras
 * páginas SEO, sem gerar rotas nesta onda.
 */
import type {
  DiscoveryOccasion,
  DiscoveryQuery,
} from "../shared/types/discoveryQuery";

export interface DiscoveryCategoryConfig {
  /** Slug canônico (usado em URLs futuras). */
  slug: string;
  /** Título curto para exibição/header. */
  title: string;
  /** Descrição curta usada em SEO/meta. */
  description: string;
  /** Filtros base aplicados quando a categoria for selecionada. */
  filters: DiscoveryQuery;
  /** Intenção principal (informacional / transacional / navegacional). */
  seoIntent: "informational" | "transactional" | "navigational";
  /** Caminho canônico futuro (não roteado nesta onda). */
  canonicalPath: string;
  /** Se deve ser indexado no futuro. */
  indexable: boolean;
  /** Habilitado como categoria consultável no motor. */
  enabled: boolean;
}

const OCC = (o: DiscoveryOccasion): DiscoveryQuery => ({ occasion: o });

export const DISCOVERY_CATEGORIES: readonly DiscoveryCategoryConfig[] = [
  {
    slug: "onde-comer",
    title: "Onde comer",
    description: "Restaurantes e bares para comer bem na cidade.",
    filters: OCC("onde-comer"),
    seoIntent: "transactional",
    canonicalPath: "/onde-comer",
    indexable: true,
    enabled: true,
  },
  {
    slug: "onde-sair",
    title: "Onde sair",
    description: "Baladas, bares e casas noturnas para curtir hoje.",
    filters: OCC("onde-sair"),
    seoIntent: "transactional",
    canonicalPath: "/onde-sair",
    indexable: true,
    enabled: true,
  },
  {
    slug: "happy-hour",
    title: "Happy hour",
    description: "Bares e lounges com happy hour ativo.",
    filters: OCC("happy-hour"),
    seoIntent: "transactional",
    canonicalPath: "/happy-hour",
    indexable: true,
    enabled: true,
  },
  {
    slug: "romantico",
    title: "Romântico",
    description: "Ambientes reservados para uma noite a dois.",
    filters: OCC("romantico"),
    seoIntent: "informational",
    canonicalPath: "/romantico",
    indexable: true,
    enabled: true,
  },
  {
    slug: "familia",
    title: "Para família",
    description: "Locais com estrutura para famílias e grupos.",
    filters: OCC("familia"),
    seoIntent: "informational",
    canonicalPath: "/familia",
    indexable: true,
    enabled: true,
  },
  {
    slug: "pet-friendly",
    title: "Pet friendly",
    description: "Locais que aceitam pets.",
    filters: { ...OCC("familia"), features: ["pet-friendly"] },
    seoIntent: "informational",
    canonicalPath: "/pet-friendly",
    indexable: true,
    enabled: true,
  },
  {
    slug: "churrascarias",
    title: "Churrascarias",
    description: "As melhores churrascarias da cidade.",
    filters: { cuisine: "churrascaria" },
    seoIntent: "transactional",
    canonicalPath: "/churrascarias",
    indexable: true,
    enabled: true,
  },
  {
    slug: "pizzarias",
    title: "Pizzarias",
    description: "Pizzarias com destaque na cidade.",
    filters: { cuisine: "pizzaria" },
    seoIntent: "transactional",
    canonicalPath: "/pizzarias",
    indexable: true,
    enabled: true,
  },
  {
    slug: "hamburguerias",
    title: "Hamburguerias",
    description: "Hamburguerias artesanais e clássicas.",
    filters: { cuisine: "hamburgueria" },
    seoIntent: "transactional",
    canonicalPath: "/hamburguerias",
    indexable: true,
    enabled: true,
  },
  {
    slug: "cafeterias",
    title: "Cafeterias",
    description: "Cafeterias para trabalhar, encontrar amigos ou tomar um café especial.",
    filters: { cuisine: "cafeteria" },
    seoIntent: "informational",
    canonicalPath: "/cafeterias",
    indexable: true,
    enabled: true,
  },
] as const;

export function getDiscoveryCategoryBySlug(
  slug: string | undefined,
): DiscoveryCategoryConfig | undefined {
  if (!slug) return undefined;
  return DISCOVERY_CATEGORIES.find((c) => c.slug === slug);
}

export function listEnabledDiscoveryCategories(): DiscoveryCategoryConfig[] {
  return DISCOVERY_CATEGORIES.filter((c) => c.enabled);
}
