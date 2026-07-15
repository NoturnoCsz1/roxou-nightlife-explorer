import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import {
  Search, ChevronRight, Compass, BadgeCheck, X, Heart, MapPin,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useSavedPartners } from "@/hooks/useSavedPartners";
import SEO from "@/components/SEO";
import { listEnabledDiscoveryCategories } from "@modules/discovery";

/**
 * /descobrir — hub de descoberta de LUGARES (restaurantes, bares, experiências).
 * Eventos ficam em /agenda. Categorias vêm exclusivamente do Discovery Engine
 * (listEnabledDiscoveryCategories) e apontam para /descobrir/{slug}.
 */

// Slugs de "intenção" (topo) vs "cozinha/tipo" (segunda faixa) — separação
// puramente visual sobre o mesmo catálogo oficial.
const INTENT_SLUGS = new Set([
  "onde-comer",
  "onde-sair",
  "happy-hour",
  "romantico",
  "familia",
  "pet-friendly",
]);

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

export default function V3Discover() {
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const { isFollowed, toggleFollow } = useSavedPartners();

  const categories = useMemo(() => listEnabledDiscoveryCategories(), []);
  const intentCategories = categories.filter((c) => INTENT_SLUGS.has(c.slug));
  const cuisineCategories = categories.filter((c) => !INTENT_SLUGS.has(c.slug));

  /* ─── Lugares em destaque (parceiros verificados ativos) ─── */
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

  /* ─── Debounced search sobre PARCEIROS/LOCAIS ─── */
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
    <div className="pb-4">
      <SEO
        title="Descubra Presidente Prudente — Restaurantes, Bares e Lugares | Roxou"
        description="Encontre lugares para comer, beber e aproveitar Presidente Prudente. Restaurantes, bares, happy hour, pet friendly e mais."
        canonical="https://roxou.com.br/descobrir"
      />

      {/* ── Header ── */}
      <section className="px-4 pt-5 pb-1">
        <div className="flex items-center gap-2 mb-1.5">
          <Compass className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Discovery</span>
        </div>
        <h1 className="font-display font-extrabold text-2xl leading-tight text-foreground">
          Descubra Presidente Prudente
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Encontre lugares para comer, beber e aproveitar a cidade.
        </p>
      </section>

      {/* ── Busca (contexto: lugares) ── */}
      <div className="px-4 pt-4 pb-2">
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

      {/* ── Resultado da busca (lugares) ── */}
      {isSearching ? (
        <section className="px-4 pt-2 space-y-3">
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
                Tente buscar por nome, bairro ou tipo (bar, restaurante...).
              </p>
            </div>
          )}
        </section>
      ) : (
        <>
          {/* ── Como você quer aproveitar? ── */}
          {intentCategories.length > 0 && (
            <section className="px-4 pt-4" aria-label="Descubra por intenção">
              <h2 className="font-display font-bold text-base text-foreground mb-2.5">
                Como você quer aproveitar?
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {intentCategories.map((c) => (
                  <CategoryCard key={c.slug} slug={c.slug} title={c.title} />
                ))}
              </div>
            </section>
          )}

          {/* ── Explore por categoria (cozinhas) ── */}
          {cuisineCategories.length > 0 && (
            <section className="px-4 pt-5" aria-label="Explore por categoria">
              <h2 className="font-display font-bold text-base text-foreground mb-2.5">
                Explore por categoria
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {cuisineCategories.map((c) => (
                  <CategoryCard key={c.slug} slug={c.slug} title={c.title} />
                ))}
              </div>
            </section>
          )}

          {/* ── Lugares em destaque (parceiros verificados) ── */}
          {featuredVenues.length > 0 && (
            <section className="pt-5" aria-label="Lugares em destaque">
              <div className="px-4 mb-2">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-accent" />
                  <h2 className="font-display font-bold text-base text-foreground">
                    Lugares em destaque
                  </h2>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Lugares para conhecer na cidade
                </p>
              </div>
              <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-hide snap-x snap-mandatory">
                {featuredVenues.map((p) => (
                  <div
                    key={p.id}
                    className="shrink-0 snap-start w-[170px] rounded-xl bg-card border border-border/40 hover:border-accent/30 transition-all overflow-hidden"
                  >
                    <Link to={`/local/${p.slug}`}>
                      <div className="relative h-[80px] bg-secondary overflow-hidden">
                        {p.logo_url ? (
                          <img
                            src={p.logo_url}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/10">
                            <span className="font-display font-bold text-xl text-primary/60">
                              {p.name[0]}
                            </span>
                          </div>
                        )}
                        <div className="absolute top-1.5 right-1.5">
                          <BadgeCheck className="w-4 h-4 text-accent drop-shadow-md" />
                        </div>
                      </div>
                      <div className="p-2.5 pb-1">
                        <p className="font-display font-bold text-[12px] text-foreground truncate">
                          {p.name}
                        </p>
                        <p className="text-[9px] text-muted-foreground capitalize truncate">
                          {[p.type, p.neighborhood].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </Link>
                    <div className="px-2.5 pb-2.5 flex items-center justify-between">
                      <Link
                        to={`/local/${p.slug}`}
                        className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary"
                      >
                        Conhecer lugar <ChevronRight className="w-3 h-3" />
                      </Link>
                      {user && (
                        <button
                          onClick={() => toggleFollow(p.id)}
                          className="p-1"
                          aria-label={isFollowed(p.id) ? "Desfavoritar" : "Favoritar"}
                        >
                          <Heart
                            className={`w-3.5 h-3.5 transition-colors ${
                              isFollowed(p.id)
                                ? "text-primary fill-primary"
                                : "text-muted-foreground/40 hover:text-primary"
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <div className="h-4" />
    </div>
  );
}

/** Card compacto de categoria oficial do Discovery Engine. */
function CategoryCard({ slug, title }: { slug: string; title: string }) {
  return (
    <Link
      to={`/descobrir/${slug}`}
      className="group flex items-center justify-between gap-2 rounded-xl border border-border/40 bg-card/60 px-3 py-3 hover:border-primary/50 hover:bg-primary/10 transition-colors min-h-[52px]"
    >
      <span className="truncate text-[13px] font-bold text-foreground">
        {title}
      </span>
      <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-primary" />
    </Link>
  );
}

/** Linha de resultado da busca — foco em LUGAR (CTA: Conhecer lugar). */
function VenueRow({ p }: { p: PartnerLite }) {
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
