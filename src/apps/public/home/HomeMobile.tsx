// ─── HomeMobile — Layout mobile (lg:hidden) refatorado ───
// Ordem: Hero → Busca → Timeline Hoje → Destaques (Expo) → Descubra na Roxou
//        → Destaque da Semana → Últimas Notícias → Mais Acessadas → Footer


import { Link } from "react-router-dom";
import { HomeSectionBoundary } from "@/components/v3/home/HomeSectionBoundary";
import TodaySection from "@/components/v3/home/TodaySection";
import { TodayTimeline as TodayTimelineRaw, TodayEmptyState } from "@/components/v3/home/TodayTimeline";
import WeeklySpotlight from "@/components/v3/home/WeeklySpotlight";
import FadeSection from "@/components/v3/home/FadeSection";
import HomeDiscoveryHighlight from "@/components/home/HomeDiscoveryHighlight";
import GlobalSearchTrigger from "@/components/search/GlobalSearchTrigger";

import LatestNewsSection from "@/components/v3/home/LatestNewsSection";
import MostViewedNews from "@/components/v3/home/MostViewedNews";

import HighlightsCarousel, { type HighlightSlide } from "@/components/v3/home/HighlightsCarousel";
import ExpoHighlightCard from "@/components/v3/home/ExpoHighlightCard";

import type { Ev, VenueRank } from "./types";
import { safeEvents } from "./utils";
import { ImmersiveHero } from "./HomeHero";
import { PremiumEventCard } from "./HomeCuradoria";
import { EmptyHero, HomeDataFallback } from "./HomeSkeletons";

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
  // filters (mantidos por compatibilidade do contrato)
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
    events, weeklyHighlight,
  } = props;

  // Destaques fixos — Expo.
  const highlightSlides: HighlightSlide[] = [
    { key: "expo", node: <ExpoHighlightCard /> },
  ];

  return (
    <div className="lg:hidden w-full overflow-x-hidden">
      {/* 1 · HERO */}
      <HomeSectionBoundary name="Hero mobile" fallback={<EmptyHero />}>
        {isLoading ? (
          <div aria-hidden className="h-[58svh] min-h-[384px] max-h-[512px] w-full v3-skeleton" />
        ) : hero ? (
          <div className="relative z-10 overflow-hidden bg-background">
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
        ) : <EmptyHero />}
      </HomeSectionBoundary>

      {/* 2 · CAMPO DE BUSCA */}
      <HomeSectionBoundary name="Search bar" silent>
        <div className="px-4 pt-5">
          <GlobalSearchTrigger placeholder="Buscar evento, local, vibe..." />
        </div>
      </HomeSectionBoundary>

      {/* 3 · TIMELINE HOJE */}
      <HomeSectionBoundary name="Eventos de Hoje (mobile)">
        {hasHomeDataError ? (
          <HomeDataFallback />
        ) : !isLoading ? (
          <div className="pt-2">
            <TodaySection
              loading={loadingToday}
              error={todayError}
              events={safeEvents(rawTodayEvents)}
              partnerRankMap={partnerRankMap}
              trendingIdSet={trendingIdSet}
              Timeline={TodayTimeline}
              EmptyState={TodayEmptyState}
            />
          </div>
        ) : null}
      </HomeSectionBoundary>

      {/* 4 · DESTAQUES ROXOU (carrossel — Expo) */}
      <HomeSectionBoundary name="Destaques Roxou (mobile)" silent>
        <div className="pt-2">
          <HighlightsCarousel slides={highlightSlides} autoplayMs={6000} minHeight={240} />
        </div>
      </HomeSectionBoundary>

      {/* 5 · DESCUBRA NA ROXOU (substitui o bloco de Jogos) */}
      {!isLoading && !hasHomeDataError && (
        <HomeSectionBoundary name="Descubra na Roxou (mobile)" silent>
          <HomeDiscoveryHighlight />
        </HomeSectionBoundary>
      )}

      {/* 6 · DESCobrir MAIS / CATEGORIAS (DiscoverGrid → /descobrir?cat=) */}
      <HomeSectionBoundary name="Discover grid" silent>
        <div className="pt-4">
          <DiscoverGrid />
        </div>
      </HomeSectionBoundary>

      {/* 7 · DESTAQUE DA SEMANA */}
      <HomeSectionBoundary name="Destaque da semana" silent>
        {(safeEvents(events).length > 0) && (
          <div className="pt-2">
            <WeeklySpotlight
              ev={weeklyHighlight ?? undefined}
              events={safeEvents(events)}
              partnerAwardIds={new Set(partnerRankMap.keys())}
              FadeSection={FadeSection}
            />
          </div>
        )}
      </HomeSectionBoundary>

      {/* 8 · ÚLTIMAS NOTÍCIAS (renderizado UMA vez) */}
      <HomeSectionBoundary name="Últimas notícias" silent>
        <LatestNewsSection variant="latest" limit={6} />
      </HomeSectionBoundary>

      {/* 9 · MAIS ACESSADAS */}
      <HomeSectionBoundary name="Mais acessadas" silent>
        <MostViewedNews />
      </HomeSectionBoundary>

      {/* 10 · FOOTER — sempre por último, com folga acima da Bottom Navigation */}
      <HomeSectionBoundary name="Footer V3" silent>
        <FadeSection className="px-4 pt-6 pb-28">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] font-medium text-muted-foreground">
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
  );
}
