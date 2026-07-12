/**
 * Onda 21 — Home Discovery.
 *
 * Blocos reutilizáveis alimentados pelo Discovery Engine + Feature Engine.
 * Consome exclusivamente a superfície pública `@modules/discovery`. Não
 * acessa Supabase. Não redefine ranking. Não altera rotas.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, ChevronRight, BadgeCheck } from "lucide-react";
import {
  discover,
  listEnabledDiscoveryCategories,
  getHomeContext,
  type DiscoveryResult,
  type HomeContext,
} from "@modules/discovery";
import SectionHeader from "@/shared/components/SectionHeader";
import PartnerLogo from "@/components/partners/PartnerLogo";

/** Emojis por slug — mapeamento visual apenas. */
const CATEGORY_EMOJI: Record<string, string> = {
  "onde-comer": "🍽️",
  "onde-sair": "🌙",
  "happy-hour": "🍻",
  romantico: "❤️",
  familia: "👨‍👩‍👧",
  "pet-friendly": "🐾",
  churrascarias: "🥩",
  pizzarias: "🍕",
  hamburguerias: "🍔",
  cafeterias: "☕",
};

/** Buckets visuais — não altera dados nem ranking. */
const INTEREST_SLUGS = new Set([
  "onde-comer",
  "onde-sair",
  "happy-hour",
  "romantico",
  "familia",
  "pet-friendly",
]);

interface CategoryChip {
  slug: string;
  title: string;
  emoji: string;
}

function toChip(slug: string, title: string): CategoryChip {
  return { slug, title, emoji: CATEGORY_EMOJI[slug] ?? "✨" };
}

interface HomeDiscoveryBlocksProps {
  /** Contexto opcional; se ausente, é computado localmente. */
  context?: HomeContext;
}

/** Reordena chips colocando slugs preferidos do contexto no topo. */
function prioritize<T extends { slug: string }>(chips: T[], preferred: string[]): T[] {
  if (!preferred.length) return chips;
  const rank = new Map(preferred.map((s, i) => [s, i]));
  return [...chips].sort((a, b) => {
    const ra = rank.get(a.slug) ?? Number.POSITIVE_INFINITY;
    const rb = rank.get(b.slug) ?? Number.POSITIVE_INFINITY;
    return ra - rb;
  });
}

const HomeDiscoveryBlocks = ({ context }: HomeDiscoveryBlocksProps = {}) => {
  const navigate = useNavigate();

  const activeContext = useMemo(() => context ?? getHomeContext(), [context]);
  const preferred = activeContext.preferredCategorySlugs;

  const categories = useMemo(() => listEnabledDiscoveryCategories(), []);
  const interestChips: CategoryChip[] = useMemo(
    () =>
      prioritize(
        categories
          .filter((c) => INTEREST_SLUGS.has(c.slug))
          .map((c) => toChip(c.slug, c.title)),
        preferred,
      ),
    [categories, preferred],
  );
  const popularCategoryChips: CategoryChip[] = useMemo(
    () =>
      prioritize(
        categories
          .filter((c) => !INTEREST_SLUGS.has(c.slug))
          .map((c) => toChip(c.slug, c.title)),
        preferred,
      ),
    [categories, preferred],
  );

  // Em Alta — venues com eventos futuros, ordenados pelo motor.
  const trendingQuery = useQuery<DiscoveryResult>({
    queryKey: ["home-discovery-trending"],
    staleTime: 60 * 1000,
    queryFn: () => discover({ hasEvents: true, limit: 8 }),
  });

  const trending = trendingQuery.data?.venues ?? [];
  // Reutiliza o mesmo resultado para o bloco "Tendências da Cidade".
  const cityTrends = trending.slice(0, 4);

  if (interestChips.length === 0 && popularCategoryChips.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6 md:space-y-10">
      {interestChips.length > 0 && (
        <section aria-label="Descubra por interesse">
          <SectionHeader
            emoji="✨"
            title="Descubra por interesse"
            subtitle="Encontre o rolê certo pra você"
          />
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1 md:flex-wrap md:overflow-visible md:mx-0 md:px-0">
            {interestChips.map((chip) => (
              <button
                key={chip.slug}
                type="button"
                onClick={() => navigate(`/descobrir/${chip.slug}`)}
                className="shrink-0 inline-flex items-center gap-2 rounded-full border border-border/40 bg-secondary/70 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10"
              >
                <span aria-hidden>{chip.emoji}</span>
                <span>{chip.title}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {trending.length > 0 && (
        <section aria-label="Em alta">
          <SectionHeader
            emoji="🔥"
            title="Em alta"
            subtitle="Locais com eventos programados"
          />
          <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-2 md:grid md:grid-cols-3 lg:grid-cols-4 md:overflow-x-visible md:mx-0 md:px-0 md:gap-4">
            {trending.map((r) => (
              <button
                key={r.venue.id}
                type="button"
                onClick={() => navigate(`/local/${r.venue.slug}`)}
                className="w-[180px] shrink-0 md:w-auto text-left rounded-2xl border border-border/40 bg-card/50 p-3 transition-colors hover:border-primary/40 hover:bg-card"
              >
                <div className="flex items-center gap-3">
                  <PartnerLogo
                    src={r.venue.logoUrl}
                    alt={r.venue.name}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {r.venue.name}
                      </p>
                      {r.venue.verified && (
                        <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.venue.type ?? "Local"}
                      {r.venue.neighborhood ? ` · ${r.venue.neighborhood}` : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-primary">
                  <TrendingUp className="h-3 w-3" />
                  <span>Em alta agora</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {popularCategoryChips.length > 0 && (
        <section aria-label="Categorias populares">
          <SectionHeader
            emoji="🍽️"
            title="Categorias populares"
            subtitle="Explore por tipo de cozinha"
          />
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
            {popularCategoryChips.map((chip) => (
              <button
                key={chip.slug}
                type="button"
                onClick={() => navigate(`/descobrir/${chip.slug}`)}
                className="group flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-card/50 px-4 py-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/10"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-lg" aria-hidden>
                    {chip.emoji}
                  </span>
                  <span className="truncate text-sm font-semibold text-foreground">
                    {chip.title}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </button>
            ))}
          </div>
        </section>
      )}

      {cityTrends.length > 0 && (
        <section aria-label="Tendências da Cidade">
          <SectionHeader
            emoji="📈"
            title="Tendências da Cidade"
            subtitle={`Movimento agora · ${activeContext.label}`}
          />
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
            {cityTrends.map((r, i) => (
              <button
                key={r.venue.id}
                type="button"
                onClick={() => navigate(`/local/${r.venue.slug}`)}
                className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card/50 px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-card"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                  {i + 1}
                </span>
                <PartnerLogo src={r.venue.logoUrl} alt={r.venue.name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {r.venue.name}
                    </span>
                    {r.venue.verified && (
                      <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
                    )}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {r.venue.type ?? "Local"}
                    {r.venue.neighborhood ? ` · ${r.venue.neighborhood}` : ""}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default HomeDiscoveryBlocks;
