// ─── HomeDesktop — bloco completo do layout desktop (hidden lg:block) ───
// Extraído de src/pages/v3/V3Home.tsx (Fase 5). JSX literal preservado.

import { HomeSectionBoundary } from "@/components/v3/home/HomeSectionBoundary";
import CopaHighlightCard from "@/components/v3/home/CopaHighlightCard";
import ExpoHighlightCard from "@/components/v3/home/ExpoHighlightCard";
import HighlightsCarousel from "@/components/v3/home/HighlightsCarousel";
import LatestNewsSection from "@/components/v3/home/LatestNewsSection";
import MostViewedNews from "@/components/v3/home/MostViewedNews";

import type { Ev, VenueRank } from "./types";
import { CommandCenter } from "./HomeCommandCenter";
import { DesktopHomeSkeleton, HomeDataFallback } from "./HomeSkeletons";

export interface HomeDesktopProps {
  isLoading: boolean;
  hasHomeDataError: boolean;
  hero: Ev | null;
  heroIsToday: boolean;
  heroEvents: Ev[];
  heroIdx: number;
  setHeroIdx: (n: number) => void;
  weeklyHighlight: Ev | null;
  rawTodayEvents: Ev[];
  todayCount: number;
  trending: Ev[];
  featured: Ev[];
  weekEvents: Ev[];
  trendingIdSet: Set<string>;
  partnerRankMap: Map<string, number>;
  venueRanks: VenueRank[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  featuredPartners: any[];
  events: Ev[];
}

export function HomeDesktop(props: HomeDesktopProps) {
  const {
    isLoading, hasHomeDataError, hero, heroIsToday, heroEvents, heroIdx, setHeroIdx,
    weeklyHighlight, rawTodayEvents, todayCount, trending, featured, weekEvents,
    trendingIdSet, partnerRankMap, venueRanks, featuredPartners, events,
  } = props;
  // safeEvents é aplicado dentro do CommandCenter para preservar paridade literal
  return (
    <>
      <div className="hidden lg:block">
        <HomeSectionBoundary name="CommandCenter desktop" fallback={<div className="mx-auto max-w-7xl px-6 py-6"><HomeDataFallback /></div>}>
          {hasHomeDataError ? (
            <div className="mx-auto max-w-7xl px-6 py-6"><HomeDataFallback /></div>
          ) : isLoading ? (
            <DesktopHomeSkeleton />
          ) : (
            <CommandCenter
              hero={hero}
              heroIsToday={!!heroIsToday}
              heroEvents={heroEvents ?? []}
              heroIdx={heroIdx}
              setHeroIdx={setHeroIdx}
              weeklyHighlight={weeklyHighlight}
              todayEvents={rawTodayEvents}
              todayCount={todayCount}
              trending={trending ?? []}
              featured={featured ?? []}
              weekEvents={weekEvents ?? []}
              trendingIdSet={trendingIdSet}
              partnerRankMap={partnerRankMap}
              venueRanks={venueRanks ?? []}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              featuredPartners={(featuredPartners as any[]) ?? []}
              events={events ?? []}
            />
          )}
        </HomeSectionBoundary>
      </div>

      {/* Destaques Roxou — carrossel desktop (Expo, Copa, FEJUPI, campanhas) */}
      <div className="hidden lg:block max-w-5xl mx-auto">
        <HomeSectionBoundary name="Destaques Roxou (desktop)" silent>
          <HighlightsCarousel
            slides={[
              { key: "expo", node: <ExpoHighlightCard /> },
              { key: "copa", node: <CopaHighlightCard /> },
            ]}
          />
        </HomeSectionBoundary>
      </div>


      {/* ══════ NOTÍCIAS — após layout principal ══════ */}
      {!isLoading && !hasHomeDataError && (
        <div className="max-w-5xl mx-auto min-h-[200px] px-4 lg:px-6">
          <HomeSectionBoundary name="Últimas notícias" silent>
            <LatestNewsSection variant="latest" limit={6} />
          </HomeSectionBoundary>
          <HomeSectionBoundary name="Notícias mais vistas" silent>
            <MostViewedNews />
          </HomeSectionBoundary>
        </div>
      )}
    </>
  );
}
