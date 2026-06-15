// ─── HomeMobile — bloco completo do layout mobile (lg:hidden) ───
// Extraído de src/pages/v3/V3Home.tsx (Fase 5). JSX literal preservado.

import { Link } from "react-router-dom";
import { ChevronRight, Crown, Gem, Trophy } from "lucide-react";
import { HomeSectionBoundary } from "@/components/v3/home/HomeSectionBoundary";
import TodaySection from "@/components/v3/home/TodaySection";
import { TodayTimeline as TodayTimelineRaw, TodayEmptyState } from "@/components/v3/home/TodayTimeline";
import CopaHighlightCard from "@/components/v3/home/CopaHighlightCard";
import WeeklySpotlight from "@/components/v3/home/WeeklySpotlight";
import FadeSection from "@/components/v3/home/FadeSection";
import HomeJogosCard from "@/components/jogos/HomeJogosCard";
import V3SearchBar from "@/components/v3/V3SearchBar";
import V3VibeChips from "@/components/v3/V3VibeChips";
import CategoryChips from "@/components/v3/CategoryChips";
import AIHomeWidget from "@/components/v3/AIHomeWidget";
import LatestNewsSection from "@/components/v3/home/LatestNewsSection";

import type { Ev, VenueRank } from "./types";
import { safeEvents } from "./utils";
import { VIBE_FILTERS } from "./constants";
import { ImmersiveHero } from "./HomeHero";
import { PremiumEventCard } from "./HomeCuradoria";
import { BentoGrid, Rail, VibeSelector } from "./HomeSections";
import { FeaturedPartnerCard, VenueRankCard, VenueSpotlight } from "./HomeLists";
import { EmptyHero, HomeDataFallback, RailSkeleton, VenueRankSkeleton } from "./HomeSkeletons";

const TodayTimeline = (props: Omit<React.ComponentProps<typeof TodayTimelineRaw>, "Card">) => (
  <TodayTimelineRaw {...props} Card={PremiumEventCard} />
);

export interface HomeMobileProps {
  isLoading: boolean;
  hasHomeDataError: boolean;
  hero: Ev | null;
  heroIsToday: boolean;
  heroEvents: Ev[];
  heroIdx: number;
  setHeroIdx: (n: number) => void;
  setIsHeroPaused: (b: boolean) => void;
  todayCount: number;
  partnerRankMap: Map<string, number>;
  trendingIdSet: Set<string>;
  loadingToday: boolean;
  todayError: unknown;
  rawTodayEvents: Ev[];
  // filters
  catFilter: string;
  setCatFilter: (s: string) => void;
  vibeFilter: string;
  setVibeFilter: (s: string) => void;
  filtered: Ev[];
  vibeFiltered: Ev[];
  // collections
  events: Ev[];
  featured: Ev[];
  weeklyHighlight: Ev | null;
  trending: Ev[];
  loadingTrending: boolean;
  weekEvents: Ev[];
  venueRanks: VenueRank[];
  loadingVenues: boolean;
  maxViews: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  featuredPartners: any[];
}

export function HomeMobile(props: HomeMobileProps) {
  const {
    isLoading, hasHomeDataError, hero, heroIsToday, heroEvents, heroIdx, setHeroIdx, setIsHeroPaused,
    todayCount, partnerRankMap, trendingIdSet, loadingToday, todayError, rawTodayEvents,
    catFilter, setCatFilter, vibeFilter, setVibeFilter, filtered, vibeFiltered,
    events, featured, weeklyHighlight, trending, loadingTrending, weekEvents,
    venueRanks, loadingVenues, maxViews, featuredPartners,
  } = props;

  return (
    <>
      {/* ══════ MOBILE: IMMERSIVE HERO ══════ */}
      <div className="lg:hidden">
        <HomeSectionBoundary name="Hero mobile" fallback={<EmptyHero />}>
          {isLoading ? (
            <div aria-hidden className="h-[96px] w-full bg-background" />
          ) : hero ? (
            <div className="relative z-10 group overflow-hidden bg-background">
              <div className="relative">
                <ImmersiveHero
                  ev={hero}
                  isToday={!!heroIsToday}
                  todayCount={todayCount}
                  venueRank={hero.partner_id ? partnerRankMap.get(hero.partner_id) : undefined}
                  slides={heroEvents}
                  index={heroIdx}
                  onChange={setHeroIdx}
                  onPauseAutoplay={() => setIsHeroPaused(true)}
                  onResumeAutoplay={() => setIsHeroPaused(false)}
                />
              </div>
            </div>
          ) : <EmptyHero />}

        </HomeSectionBoundary>

        {/* Eventos de hoje */}
        <HomeSectionBoundary name="Eventos de Hoje (mobile)">
          {hasHomeDataError ? (
            <HomeDataFallback />
          ) : !isLoading ? (
            <TodaySection loading={loadingToday} error={todayError} events={safeEvents(rawTodayEvents)} partnerRankMap={partnerRankMap} trendingIdSet={trendingIdSet} Timeline={TodayTimeline} EmptyState={TodayEmptyState} />
          ) : null}
        </HomeSectionBoundary>

        {/* Destaque Copa do Mundo 2026 */}
        <HomeSectionBoundary name="Copa Highlight (mobile)" silent>
          <CopaHighlightCard />
        </HomeSectionBoundary>


        {/* Jogos ao vivo */}
        {!isLoading && !hasHomeDataError && (
          <HomeSectionBoundary name="Jogos mobile" silent>
            <div className="px-4 pt-4 pb-1">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="font-display font-extrabold text-base text-foreground">Jogos ao vivo hoje</h2>
                    <p className="text-[10px] text-muted-foreground -mt-0.5">Futebol, onde assistir em Prudente</p>
                  </div>
                </div>
                <Link to="/jogos" className="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5">
                  Ver todos <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
            <HomeJogosCard />
          </HomeSectionBoundary>
        )}
      </div>

      {/* Resto mobile (search, vibe, sections) */}
      <div className="space-y-1 lg:hidden">

        {/* SEARCH BAR */}
        <HomeSectionBoundary name="Search bar" silent>
          <div className="px-4 pt-4">
            <V3SearchBar
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              events={safeEvents(events) as any}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              fallbackEvent={(featured[0] || safeEvents(events)[0]) as any}
              placeholder="Buscar evento, local, vibe..."
            />
          </div>
        </HomeSectionBoundary>

        {/* VIBE CHIPS */}
        <HomeSectionBoundary name="Vibe chips" silent>
          <V3VibeChips />
        </HomeSectionBoundary>

        {/* DESTAQUE DA SEMANA */}
        <HomeSectionBoundary name="Destaque da semana" silent>
          {(safeEvents(events).length > 0) && (
            <WeeklySpotlight
              ev={weeklyHighlight ?? undefined}
              events={safeEvents(events)}
              partnerAwardIds={new Set(partnerRankMap.keys())}
              FadeSection={FadeSection}
            />
          )}
        </HomeSectionBoundary>

        <HomeSectionBoundary name="AI widget" silent>
          <AIHomeWidget />
        </HomeSectionBoundary>

        {/* BENTO GRID */}
        <HomeSectionBoundary name="Bento grid">
          <BentoGrid />
        </HomeSectionBoundary>

        <HomeSectionBoundary name="Vibe selector" silent>
          <VibeSelector selected={vibeFilter} onSelect={setVibeFilter} />
        </HomeSectionBoundary>

        <HomeSectionBoundary name="Vibe filtered rail" silent>
          {vibeFilter && (vibeFiltered ?? []).length > 0 && (
            <Rail title={VIBE_FILTERS.find(v => v.key === vibeFilter)?.label || "Vibe"} subtitle="Seleção por intenção">
              {(vibeFiltered ?? []).slice(0, 12).map(e => (
                <PremiumEventCard key={e.id} ev={e} size="lg" partnerRank={e.partner_id ? partnerRankMap.get(e.partner_id) : undefined} isTrending={trendingIdSet.has(e.id)} />
              ))}
            </Rail>
          )}
        </HomeSectionBoundary>

        {/* CATEGORIES */}
        <HomeSectionBoundary name="Category chips" silent>
          <CategoryChips selected={catFilter} onSelect={setCatFilter} />
        </HomeSectionBoundary>

        <HomeSectionBoundary name="Category filtered rail" silent>
          {catFilter && (filtered ?? []).length > 0 && (
            <Rail title={catFilter}>
              {(filtered ?? []).slice(0, 12).map(e => (
                <PremiumEventCard key={e.id} ev={e} partnerRank={e.partner_id ? partnerRankMap.get(e.partner_id) : undefined} isTrending={trendingIdSet.has(e.id)} />
              ))}
            </Rail>
          )}
        </HomeSectionBoundary>

        {/* EM ALTA AGORA */}
        <HomeSectionBoundary name="Em alta agora" silent>
          {loadingTrending ? <RailSkeleton count={3} /> : (trending ?? []).length > 0 ? (
            <Rail title="🔥 Em alta agora" subtitle="Mais acessados nas últimas 24h">
              {(trending ?? []).map(e => (
                <PremiumEventCard key={e.id} ev={e} size="lg" isTrending partnerRank={e.partner_id ? partnerRankMap.get(e.partner_id) : undefined} />
              ))}
            </Rail>
          ) : null}
        </HomeSectionBoundary>

        {/* LOCAIS EM ALTA */}
        <HomeSectionBoundary name="Locais em alta" silent>
          {loadingVenues ? <VenueRankSkeleton /> : (venueRanks ?? []).length > 0 ? (
            <FadeSection className="px-4 pt-6 pb-3">
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center neon-glow">
                  <Crown className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-display font-extrabold text-lg text-foreground uppercase tracking-wide">Locais em alta</h2>
                  <p className="text-[10px] text-muted-foreground -mt-0.5">Ranking semanal · Os mais acessados no Roxou</p>
                </div>
              </div>

              {(venueRanks ?? [])[0] && <VenueSpotlight v={(venueRanks ?? [])[0]} maxViews={maxViews} />}

              {(venueRanks ?? []).length > 1 && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {(venueRanks ?? []).slice(1, 5).map((v, i) => (
                    <VenueRankCard key={v.id} v={v} rank={i + 2} maxViews={maxViews} />
                  ))}
                </div>
              )}

              {(venueRanks ?? []).length > 5 && (
                <div className="flex gap-2 overflow-x-auto mt-3 pb-1 scrollbar-hide">
                  {(venueRanks ?? []).slice(5).map((v, i) => (
                    <Link key={v.id} to={`/local/${v.slug}`}
                      className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border/30 hover:border-primary/20 transition-all">
                      <span className="text-[10px] font-bold text-muted-foreground">#{i + 6}</span>
                      <div className="w-6 h-6 rounded-md overflow-hidden bg-secondary shrink-0">
                        {v.logo_url ? <img src={v.logo_url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <span className="text-[8px] font-bold text-muted-foreground flex items-center justify-center h-full">{v.name[0]}</span>}
                      </div>
                      <span className="text-[10px] font-semibold text-foreground whitespace-nowrap">{v.name}</span>
                      <span className="text-[9px] text-muted-foreground">{v.views}</span>
                    </Link>
                  ))}
                </div>
              )}
            </FadeSection>
          ) : null}
        </HomeSectionBoundary>

        {/* PARCEIROS EM DESTAQUE */}
        <HomeSectionBoundary name="Parceiros em destaque" silent>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {((featuredPartners as any[]) ?? []).length > 0 && (
            <FadeSection className="px-4 pt-5 pb-3">
              <div className="flex items-center gap-2 mb-0.5">
                <Gem className="w-5 h-5 text-accent" />
                <h2 className="font-display font-extrabold text-lg text-foreground uppercase tracking-wide">Parceiros em destaque</h2>
              </div>
              <p className="text-[11px] text-muted-foreground mb-3">Quem está movimentando a cena</p>
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {((featuredPartners as any[]) ?? []).map(p => (
                  <FeaturedPartnerCard key={p.id} p={p} />
                ))}
              </div>
            </FadeSection>
          )}
        </HomeSectionBoundary>

        {/* EVENTOS PREMIUM */}
        <HomeSectionBoundary name="Eventos premium" silent>
          {(featured ?? []).length > 0 && (
            <Rail title="⭐ Eventos premium" subtitle="Destaque">
              {(featured ?? []).map(e => (
                <PremiumEventCard key={e.id} ev={e} size="lg" premium partnerRank={e.partner_id ? partnerRankMap.get(e.partner_id) : undefined} />
              ))}
            </Rail>
          )}
        </HomeSectionBoundary>

        {/* ESTA SEMANA */}
        <HomeSectionBoundary name="Esta semana" silent>
          {isLoading ? <RailSkeleton count={4} /> : (weekEvents ?? []).length > 0 ? (
            <Rail title="📅 Esta semana" subtitle="Próximos 7 dias">
              {(weekEvents ?? []).map(e => (
                <PremiumEventCard key={e.id} ev={e} partnerRank={e.partner_id ? partnerRankMap.get(e.partner_id) : undefined} />
              ))}
            </Rail>
          ) : null}
        </HomeSectionBoundary>

        {/* ÚLTIMAS NOTÍCIAS */}
        <HomeSectionBoundary name="Últimas notícias" silent>
          <LatestNewsSection variant="latest" limit={6} />
        </HomeSectionBoundary>

        {/* Footer institucional V3 */}
        <HomeSectionBoundary name="Footer V3" silent>
          <FadeSection className="px-4 pt-6 pb-2">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-medium text-muted-foreground">
              <Link to="/sobre" className="hover:text-primary transition-colors">Sobre</Link>
              <span className="opacity-30">·</span>
              <Link to="/contato" className="hover:text-primary transition-colors">Contato</Link>
              <span className="opacity-30">·</span>
              <Link to="/privacy" className="hover:text-primary transition-colors">Privacidade</Link>
              <span className="opacity-30">·</span>
              <Link to="/terms" className="hover:text-primary transition-colors">Termos</Link>
              <span className="opacity-30">·</span>
              <Link to="/remover-dados" className="hover:text-primary transition-colors">Remover dados</Link>
            </div>
          </FadeSection>
        </HomeSectionBoundary>
      </div>
    </>
  );
}
