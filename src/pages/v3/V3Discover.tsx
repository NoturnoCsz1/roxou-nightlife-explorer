import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  Search, ChevronRight, Compass, BadgeCheck, X, Heart, MapPin,
  UtensilsCrossed, Beer, Heart as HeartIcon, Users, PawPrint, Moon, Coffee,
  Flame, Pizza, Sandwich,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useSavedPartners } from "@/hooks/useSavedPartners";
import SEO from "@/components/SEO";
import {
  listEnabledDiscoveryCategories,
  getHomeContext,
  type HomeContext,
} from "@modules/discovery";

/**
 * /descobrir — GUIA EDITORIAL DE DESCOBERTA (lugares & gastronomia).
 * Eventos ficam em /agenda. Toda taxonomia vem do Discovery Engine.
 * Reutiliza uma única query (parceiros verificados) para todas as seções
 * visuais e o serviço puro `getHomeContext` para o destaque contextual.
 */

interface PartnerLite {
  id: string;
  name: string;
  slug: string;
  type: string | null;
  logo_url: string | null;
  short_description: string | null;
  verified_partner: boolean | null;
  city?: string | null;
  neighborhood?: string | null;
}

// ── Presentation-only maps (dados vêm sempre do catálogo oficial) ──
const INTENT_SLUGS = new Set([
  "onde-comer", "onde-sair", "happy-hour", "romantico", "familia", "pet-friendly",
]);
const CUISINE_SLUGS = ["churrascarias", "pizzarias", "hamburguerias", "cafeterias"] as const;

const INTENT_ICON: Record<string, typeof UtensilsCrossed> = {
  "onde-comer": UtensilsCrossed,
  "onde-sair": Moon,
  "happy-hour": Beer,
  "romantico": HeartIcon,
  "familia": Users,
  "pet-friendly": PawPrint,
};

const CUISINE_META: Record<string, { icon: typeof Flame; gradient: string; tagline: string }> = {
  churrascarias: { icon: Flame,    gradient: "from-orange-500/30 via-red-500/20 to-primary/20", tagline: "Corte nobre e brasa" },
  pizzarias:     { icon: Pizza,    gradient: "from-red-500/25 via-amber-500/15 to-primary/20",  tagline: "Massa fresca e forno a lenha" },
  hamburguerias: { icon: Sandwich, gradient: "from-amber-500/25 via-orange-500/20 to-primary/20", tagline: "Artesanal e clássico" },
  cafeterias:    { icon: Coffee,   gradient: "from-amber-400/25 via-primary/15 to-accent/20",   tagline: "Café especial e pausa" },
};

// ── Contextual highlight copy (deriva de HomeContextService) ──
function contextualCopy(ctx: HomeContext): { eyebrow: string; title: string; subtitle: string } {
  if (ctx.isWeekend && (ctx.bucket === "lunch" || ctx.bucket === "afternoon")) {
    return { eyebrow: "Para o fim de semana", title: "Programa em família", subtitle: "Lugares com estrutura para grupos e crianças." };
  }
  switch (ctx.bucket) {
    case "morning":     return { eyebrow: "Para agora", title: "Café para começar o dia", subtitle: "Cafeterias e padarias abertas na cidade." };
    case "lunch":       return { eyebrow: "Para agora", title: "Onde almoçar hoje?",       subtitle: "Restaurantes e executivos para o seu almoço." };
    case "afternoon":   return { eyebrow: "Para agora", title: "Uma pausa para o café",     subtitle: "Cafeterias para trabalhar ou encontrar amigos." };
    case "happy-hour":  return { eyebrow: "Para agora", title: "O happy hour começa aqui",  subtitle: "Bares e lounges com happy hour ativo." };
    case "dinner":      return { eyebrow: "Para agora", title: "Escolha onde jantar hoje",  subtitle: "Restaurantes para o seu jantar." };
    case "night":       return { eyebrow: "Para agora", title: "Descubra onde aproveitar a noite", subtitle: "Bares, baladas e casas noturnas." };
  }
}

export default function V3Discover() {
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const { isFollowed, toggleFollow } = useSavedPartners();

  const categories = useMemo(() => listEnabledDiscoveryCategories(), []);
  const bySlug = useMemo(() => new Map(categories.map((c) => [c.slug, c])), [categories]);
  const intentCategories = categories.filter((c) => INTENT_SLUGS.has(c.slug));
  const cuisineCategories = CUISINE_SLUGS
    .map((s) => bySlug.get(s))
    .filter((c): c is NonNullable<typeof c> => !!c);

  const homeCtx = useMemo(() => getHomeContext(), []);
  const contextTarget = useMemo(() => {
    for (const slug of homeCtx.preferredCategorySlugs) {
      const cat = bySlug.get(slug);
      if (cat) return cat;
    }
    return bySlug.get("onde-comer") ?? categories[0] ?? null;
  }, [homeCtx, bySlug, categories]);
  const ctxCopy = contextualCopy(homeCtx);

  /* ─── ÚNICA query: parceiros verificados ativos (reutilizada nas seções) ─── */
  const { data: featuredVenues = [] } = useQuery<PartnerLite[]>({
    queryKey: ["v3-discover-featured-venues"],
    queryFn: async () => {
      const { data } = await supabase
        .from("partners")
        .select("id,name,slug,type,logo_url,short_description,verified_partner,city,neighborhood")
        .eq("active", true)
        .eq("verified_partner", true)
        .order("name")
        .limit(24);
      return (data as PartnerLite[]) || [];
    },
  });

  /* ─── Busca focada em LUGARES ─── */
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data: partnerMatches = [] } = useQuery<PartnerLite[]>({
    queryKey: ["v3-discover-partner-search", debouncedSearch],
    enabled: debouncedSearch.length >= 2,
    queryFn: async () => {
      const term = `%${debouncedSearch}%`;
      const { data } = await supabase
        .from("partners")
        .select("id,name,slug,type,logo_url,short_description,verified_partner,city,neighborhood")
        .eq("active", true)
        .or(`name.ilike.${term},short_description.ilike.${term},neighborhood.ilike.${term},type.ilike.${term}`)
        .limit(20);
      return (data as PartnerLite[]) || [];
    },
  });

  const isSearching = debouncedSearch.length >= 2;

  return (
    <div className="pb-8">
      <SEO
        title="Descubra Presidente Prudente — Restaurantes, Bares e Lugares | Roxou"
        description="Guia de descoberta de Presidente Prudente: restaurantes, bares, cafeterias, happy hour, opções para família e pet friendly."
        canonical="https://roxou.com.br/descobrir"
      />

      {/* ── HERO COMPACTO ── */}
      <section className="px-4 pt-4 pb-1">
        <div className="flex items-center gap-2 mb-1">
          <Compass className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Discovery</span>
        </div>
        <h1 className="font-display font-extrabold text-[22px] leading-tight text-foreground">
          Descubra Presidente Prudente
        </h1>
        <p className="text-[12.5px] text-muted-foreground mt-0.5">
          Lugares para comer, beber e aproveitar a cidade.
        </p>
      </section>

      {/* ── BUSCA (lugares) ── */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar restaurantes, bares e lugares..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-10 h-11 rounded-xl bg-card border-border/40 text-sm"
            aria-label="Buscar restaurantes, bares e lugares"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
              aria-label="Limpar busca"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {isSearching ? (
        <section className="px-4 pt-2 space-y-3" aria-label="Resultados">
          <p className="text-xs text-muted-foreground">
            {partnerMatches.length} lugar{partnerMatches.length !== 1 ? "es" : ""} encontrado{partnerMatches.length !== 1 ? "s" : ""}
          </p>
          {partnerMatches.length > 0 ? (
            <div className="space-y-2">
              {partnerMatches.map((p) => (
                <VenueRow key={p.id} p={p} />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Search className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-foreground font-semibold">
                Nenhum lugar encontrado para "{debouncedSearch}"
              </p>
              <p className="text-[11px] text-muted-foreground/70 mt-1">
                Tente por nome, bairro ou tipo (bar, restaurante...).
              </p>
            </div>
          )}
        </section>
      ) : (
        <>
          {/* ── 1. DESTAQUE CONTEXTUAL DO MOMENTO ── */}
          {contextTarget && (
            <section className="px-4 pt-3" aria-label="Destaque do momento">
              <Link
                to={`/descobrir/${contextTarget.slug}`}
                className="group relative block overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/25 via-accent/10 to-background p-5 md:p-6 min-h-[160px] transition-all hover:border-primary/50 hover:shadow-[0_0_28px_-8px_hsl(var(--primary)/0.55)]"
              >
                <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-primary/20 blur-3xl opacity-70 pointer-events-none" />
                <div className="absolute -left-6 -bottom-10 w-40 h-40 rounded-full bg-accent/15 blur-3xl opacity-60 pointer-events-none" />
                <div className="relative">
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-primary/90 mb-2">
                    {ctxCopy.eyebrow}
                  </span>
                  <h2 className="font-display font-extrabold text-xl md:text-2xl leading-tight text-foreground max-w-md">
                    {ctxCopy.title}
                  </h2>
                  <p className="text-[13px] text-muted-foreground mt-1.5 max-w-md">
                    {ctxCopy.subtitle}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-primary group-hover:gap-1.5 transition-all">
                    Explorar {contextTarget.title.toLowerCase()} <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            </section>
          )}

          {/* ── 2. INTENÇÕES (carrossel de chips) ── */}
          {intentCategories.length > 0 && (
            <section className="pt-5" aria-label="Escolha seu momento">
              <div className="px-4 flex items-baseline justify-between mb-2">
                <h2 className="font-display font-bold text-base text-foreground">O que combina com você?</h2>
              </div>
              <div className="flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide snap-x">
                {intentCategories.map((c) => {
                  const Icon = INTENT_ICON[c.slug] ?? Compass;
                  return (
                    <Link
                      key={c.slug}
                      to={`/descobrir/${c.slug}`}
                      className="shrink-0 snap-start inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/70 px-4 h-10 text-[12.5px] font-semibold text-foreground hover:border-primary/50 hover:bg-primary/10 transition-colors"
                    >
                      <Icon className="w-4 h-4 text-primary" />
                      {c.title}
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── 3. EXPLORE OS SABORES DA CIDADE (cards visuais) ── */}
          {cuisineCategories.length > 0 && (
            <section className="pt-6" aria-label="Sabores da cidade">
              <div className="px-4 mb-2.5">
                <h2 className="font-display font-bold text-base text-foreground">Explore os sabores da cidade</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Do café da manhã ao jantar.</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5 px-4 md:grid-cols-4">
                {cuisineCategories.map((c) => {
                  const meta = CUISINE_META[c.slug];
                  const Icon = meta?.icon ?? UtensilsCrossed;
                  return (
                    <Link
                      key={c.slug}
                      to={`/descobrir/${c.slug}`}
                      className={`group relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br ${meta?.gradient ?? "from-primary/15 to-accent/10"} p-3.5 min-h-[128px] flex flex-col justify-between hover:border-primary/50 transition-all`}
                    >
                      <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/5 blur-2xl pointer-events-none" />
                      <div className="relative">
                        <div className="w-9 h-9 rounded-xl bg-background/50 backdrop-blur flex items-center justify-center border border-white/10">
                          <Icon className="w-4.5 h-4.5 text-foreground" />
                        </div>
                      </div>
                      <div className="relative">
                        <p className="font-display font-bold text-[14px] text-foreground leading-tight">{c.title}</p>
                        <p className="text-[10.5px] text-muted-foreground mt-0.5 line-clamp-1">{meta?.tagline ?? c.description}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── 4. EM DESTAQUE NA CIDADE (parceiros verificados) ── */}
          {featuredVenues.length > 0 && (
            <section className="pt-6" aria-label="Em destaque na cidade">
              <div className="px-4 mb-2.5">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-accent" />
                  <h2 className="font-display font-bold text-base text-foreground">Em destaque na cidade</h2>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Descobertas curadas pela Roxou.</p>
              </div>
              <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide snap-x snap-mandatory">
                {featuredVenues.map((p) => (
                  <VenueFeaturedCard
                    key={p.id}
                    p={p}
                    followed={isFollowed(p.id)}
                    canFollow={!!user}
                    onToggleFollow={() => toggleFollow(p.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── 5. SEO editorial curto ── */}
          <section className="px-4 pt-8" aria-label="Sobre o guia">
            <div className="rounded-2xl border border-border/30 bg-card/40 p-4">
              <h2 className="font-display font-bold text-sm text-foreground">
                Descubra onde comer e aproveitar Presidente Prudente
              </h2>
              <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">
                A Roxou reúne restaurantes, bares, cafeterias e experiências gastronômicas
                da cidade — com opções para família, encontros a dois, happy hour, ambientes
                pet friendly e programas para diferentes momentos do dia.
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
 * Cards (sponsored prop reservada para monetização futura — no-op)
 * ──────────────────────────────────────────────────────────────── */

interface VenueCardBaseProps {
  p: PartnerLite;
  /** Reservado para monetização futura. Não altera ranking nem renderiza rótulo hoje. */
  sponsored?: boolean;
}

function VenueFeaturedCard({
  p, followed, canFollow, onToggleFollow,
}: VenueCardBaseProps & { followed: boolean; canFollow: boolean; onToggleFollow: () => void }) {
  return (
    <div className="shrink-0 snap-start w-[190px] rounded-2xl bg-card border border-border/40 hover:border-primary/40 transition-all overflow-hidden">
      <Link to={`/local/${p.slug}`} className="block">
        <div className="relative h-[110px] bg-secondary overflow-hidden">
          {p.logo_url ? (
            <img
              src={p.logo_url}
              alt={p.name}
              width={190}
              height={110}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/25 to-accent/15">
              <span className="font-display font-bold text-2xl text-primary/70">{p.name[0]}</span>
            </div>
          )}
          {p.verified_partner && (
            <div className="absolute top-1.5 right-1.5 bg-background/60 backdrop-blur rounded-full p-0.5">
              <BadgeCheck className="w-3.5 h-3.5 text-accent" />
            </div>
          )}
        </div>
        <div className="p-2.5">
          <p className="font-display font-bold text-[12.5px] text-foreground truncate">{p.name}</p>
          <p className="text-[10px] text-muted-foreground capitalize truncate mt-0.5">
            {[p.type, p.neighborhood].filter(Boolean).join(" · ") || "Presidente Prudente"}
          </p>
        </div>
      </Link>
      <div className="px-2.5 pb-2.5 flex items-center justify-between">
        <Link
          to={`/local/${p.slug}`}
          className="inline-flex items-center gap-0.5 text-[10.5px] font-semibold text-primary"
        >
          Conhecer lugar <ChevronRight className="w-3 h-3" />
        </Link>
        {canFollow && (
          <button
            onClick={onToggleFollow}
            className="p-1"
            aria-label={followed ? "Desfavoritar" : "Favoritar"}
          >
            <Heart
              className={`w-3.5 h-3.5 transition-colors ${
                followed ? "text-primary fill-primary" : "text-muted-foreground/40 hover:text-primary"
              }`}
            />
          </button>
        )}
      </div>
    </div>
  );
}

function VenueRow({ p }: VenueCardBaseProps) {
  return (
    <Link
      to={`/local/${p.slug}`}
      className="flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border/40 hover:border-primary/40 transition-all active:scale-[0.98]"
    >
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary shrink-0">
        {p.logo_url ? (
          <img src={p.logo_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/10">
            <span className="font-display font-bold text-base text-primary/60">{p.name[0]}</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="font-display font-bold text-sm text-foreground truncate">{p.name}</p>
          {p.verified_partner && <BadgeCheck className="w-3.5 h-3.5 text-accent shrink-0" />}
        </div>
        <p className="text-[10px] text-muted-foreground capitalize truncate">
          {[p.type, p.neighborhood || p.city].filter(Boolean).join(" · ")}
        </p>
        <p className="text-[10px] text-primary font-semibold mt-0.5 flex items-center gap-0.5">
          <MapPin className="w-2.5 h-2.5" /> Conhecer lugar
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </Link>
  );
}
