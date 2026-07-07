// ─── V3Home shell — orquestrador da Home pública ───
// Refatorado em Fase 5. Toda lógica visual está em src/apps/public/home/.
// Comportamento, queries, SEO e JSX literalmente preservados.

import { useEffect, lazy, Suspense } from "react";
import SEO from "@/components/SEO";
import { isTodaySP as isTodayFn } from "@/lib/dateUtils";

import { useHomeData } from "@/apps/public/home/hooks/useHomeData";
import { useHomeCarousels } from "@/apps/public/home/hooks/useHomeCarousels";
import { useHomeSearch } from "@/apps/public/home/hooks/useHomeSearch";
import { safeEvents, toSafeDate } from "@/apps/public/home/utils";
import { useIsDesktop } from "@/hooks/useIsDesktop";

// Lazy chunks: mobile e desktop viram bundles separados; só o correspondente
// ao viewport é baixado no carregamento inicial (LCP-2B).
const HomeMobile = lazy(() =>
  import("@/apps/public/home/HomeMobile").then(m => ({ default: m.HomeMobile }))
);
const HomeDesktop = lazy(() =>
  import("@/apps/public/home/HomeDesktop").then(m => ({ default: m.HomeDesktop }))
);

// Fallback neutro — evita flash de layout e mantém altura mínima da dobra.
const HomeFallback = () => (
  <div className="w-full min-h-[60vh]" aria-hidden="true" />
);

export default function V3Home() {
  const isDesktop = useIsDesktop();
  const data = useHomeData();
  const {
    events, rawTodayEvents, trendingIds, venueRanks, featuredPartners,
    heroEvents, trending, featured, weekEvents, weeklyHighlight,
    partnerRankMap, trendingIdSet, todayCount, maxViews,
    isLoading, loadingEventsRaw, loadingTimedOut, loadingToday, loadingTrending, loadingVenues,
    eventsError, todayError, hasHomeDataError,
  } = data;

  const { heroIdx, setHeroIdx, setIsHeroPaused } = useHomeCarousels(heroEvents);
  const { catFilter, setCatFilter, vibeFilter, setVibeFilter, filtered, vibeFiltered } =
    useHomeSearch(events, trendingIds);

  const hero = heroEvents[heroIdx] || heroEvents[0] || null;
  const heroDate = hero ? toSafeDate(hero.date_time) : null;
  const heroIsToday = heroDate ? isTodayFn(heroDate) : false;

  // [DEBUG SORRISO MAROTO] — preservado da implementação original (telemetria via console).
  useEffect(() => {
    const TARGET = "sorriso-maroto-ao-vivo-em-prudente";
    const findIn = (arr: typeof events, label: string) => {
      const found = arr.find(e => e.slug === TARGET || e.title?.toLowerCase().includes("sorriso"));
      if (found) {
        console.log(`[Sorriso ✅] ENCONTRADO em ${label}:`, {
          id: found.id, title: found.title, slug: found.slug,
          date_time: found.date_time, featured: found.featured, arraySize: arr.length,
        });
      } else {
        console.log(`[Sorriso ❌] Não está em ${label} (${arr.length} itens)`);
      }
    };

    console.group("%c[Sorriso Maroto — Diagnóstico V3Home]", "background:#7c3aed;color:white;padding:2px 8px;border-radius:4px;font-weight:bold");
    const allRaw = safeEvents(events);
    const rawFound = allRaw.find(e => e.slug === TARGET || e.title?.toLowerCase().includes("sorriso"));
    if (rawFound) {
      console.log("%c[Sorriso 📦] RAW query (events, limit 80):", "color:green;font-weight:bold", {
        id: rawFound.id, title: rawFound.title, slug: rawFound.slug,
        date_time: rawFound.date_time, featured: rawFound.featured,
      });
    } else {
      console.warn("[Sorriso ⚠️] NÃO encontrado na query principal.", {
        queryParams: { status: "published", limit: 80, total_returned: allRaw.length },
        possível_causa: allRaw.length >= 80
          ? "LIMITE de 80 eventos atingido — evento pode estar além do corte"
          : "Evento não publicado, data passada ou slug diferente no banco",
      });
      const byTitle = allRaw.filter(e => e.title?.toLowerCase().includes("sorriso") || e.title?.toLowerCase().includes("maroto"));
      console.log("[Sorriso 🔍] Busca por título 'sorriso'/'maroto' nos eventos retornados:", byTitle.length, byTitle.map(e => ({ id: e.id, title: e.title, slug: e.slug, date_time: e.date_time })));
    }
    findIn(safeEvents(rawTodayEvents), "rawTodayEvents (hoje)");
    findIn(heroEvents, "heroEvents (carousel hero)");
    findIn(trending, "trending (views 24h)");
    findIn(featured, "featured");
    findIn(weekEvents, "weekEvents (próximos 7 dias, excl. hero)");
    if (weeklyHighlight && (weeklyHighlight.slug === TARGET || weeklyHighlight.title?.toLowerCase().includes("sorriso"))) {
      console.log("[Sorriso ✅] É o WEEKLY HIGHLIGHT!", { id: weeklyHighlight.id, title: weeklyHighlight.title, slug: weeklyHighlight.slug });
    } else {
      console.log("[Sorriso ❌] Não é o weeklyHighlight");
    }
    console.log("[Sorriso ℹ️] mainEvents (CommandCenter) = merge de trending + featured + weekEvents, excluindo usedIds.");
    console.groupEnd();
  }, [events, rawTodayEvents, heroEvents, trending, featured, weekEvents, weeklyHighlight]);

  // [HOME DEBUG] temporário — preservado da implementação original.
  useEffect(() => {
    console.log("[HOME] featured", featured?.length);
    console.log("[HOME] today", rawTodayEvents?.length);
    console.log("[HOME] loading", isLoading, "(raw:", loadingEventsRaw, "timedOut:", loadingTimedOut, ")");
    console.log("[HOME] error", eventsError || todayError);
  }, [featured, rawTodayEvents, isLoading, loadingEventsRaw, loadingTimedOut, eventsError, todayError]);

  return (
    <div className="w-full max-w-full overflow-x-hidden">

      {/* SEO da home — JSON-LD WebSite + Organization + EntertainmentBusiness */}
      <SEO
        title="Roxou | Eventos, Bares, Restaurantes e Jogos ao Vivo em Presidente Prudente"
        description="A Roxou reúne eventos, shows, bares, restaurantes, música ao vivo, porções, chopp, jogos ao vivo e rolês em Presidente Prudente e região. Veja o que acontece hoje e no fim de semana."
        canonical="https://roxou.com.br/"
        ogType="website"
        keywords="eventos Presidente Prudente, bares Presidente Prudente, restaurantes Presidente Prudente, música ao vivo Prudente, jogos ao vivo Prudente, baladas Prudente, shows Prudente"
        jsonLd={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "name": "Roxou",
              "url": "https://roxou.com.br",
              "description": "Portal local para descobrir eventos, shows, bares, restaurantes, música ao vivo, jogos ao vivo e entretenimento em Presidente Prudente.",
              "inLanguage": "pt-BR",
              "potentialAction": {
                "@type": "SearchAction",
                "target": { "@type": "EntryPoint", "urlTemplate": "https://roxou.com.br/agenda?q={search_term_string}" },
                "query-input": "required name=search_term_string"
              }
            },
            {
              "@type": "Organization",
              "name": "Roxou",
              "url": "https://roxou.com.br",
              "description": "Portal de eventos, bares, restaurantes, jogos ao vivo e entretenimento em Presidente Prudente e região.",
              "sameAs": ["https://www.instagram.com/roxou.pp/"]
            },
            {
              "@type": "EntertainmentBusiness",
              "name": "Roxou",
              "url": "https://roxou.com.br",
              "description": "Plataforma local para descobrir eventos, bares, restaurantes e entretenimento em Presidente Prudente.",
              "areaServed": { "@type": "City", "name": "Presidente Prudente", "addressRegion": "SP", "addressCountry": "BR" },
              "knowsAbout": [
                "eventos em Presidente Prudente",
                "bares em Presidente Prudente",
                "restaurantes em Presidente Prudente",
                "música ao vivo em Presidente Prudente",
                "porções em Presidente Prudente",
                "chopp em Presidente Prudente",
                "jogos ao vivo em Presidente Prudente",
                "baladas em Presidente Prudente"
              ]
            }
          ]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any}
      />

      {isDesktop ? (
        <HomeDesktop
          isLoading={isLoading}
          hasHomeDataError={hasHomeDataError}
          hero={hero}
          heroIsToday={heroIsToday}
          heroEvents={heroEvents ?? []}
          heroIdx={heroIdx}
          setHeroIdx={setHeroIdx}
          weeklyHighlight={weeklyHighlight}
          rawTodayEvents={rawTodayEvents}
          todayCount={todayCount}
          trending={trending}
          featured={featured}
          weekEvents={weekEvents}
          trendingIdSet={trendingIdSet}
          partnerRankMap={partnerRankMap}
          venueRanks={venueRanks}
          featuredPartners={featuredPartners}
          events={events}
        />
      ) : (
        <HomeMobile
          isLoading={isLoading}
          hasHomeDataError={hasHomeDataError}
          hero={hero}
          heroIsToday={heroIsToday}
          heroEvents={heroEvents ?? []}
          heroIdx={heroIdx}
          setHeroIdx={setHeroIdx}
          setIsHeroPaused={setIsHeroPaused}
          todayCount={todayCount}
          partnerRankMap={partnerRankMap}
          trendingIdSet={trendingIdSet}
          loadingToday={loadingToday}
          todayError={todayError}
          rawTodayEvents={rawTodayEvents}
          catFilter={catFilter}
          setCatFilter={setCatFilter}
          vibeFilter={vibeFilter}
          setVibeFilter={setVibeFilter}
          filtered={filtered}
          vibeFiltered={vibeFiltered}
          events={events}
          featured={featured}
          weeklyHighlight={weeklyHighlight}
          trending={trending}
          loadingTrending={loadingTrending}
          weekEvents={weekEvents}
          venueRanks={venueRanks}
          loadingVenues={loadingVenues}
          maxViews={maxViews}
          featuredPartners={featuredPartners}
        />
      )}

    </div>
  );
}
