import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { usePageTracking } from "@/hooks/usePageTracking";
import AdBanner from "@/components/AdBanner";
import { Search, MapPin } from "lucide-react";
import SEO from "@/components/SEO";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import EventCard from "@/components/EventCard";
import type { SupabaseEvent } from "@/components/EventCard";
import CategoryPills from "@/components/CategoryPills";
import DateFilterPills from "@/components/DateFilterPills";
import type { DateAnchor } from "@/components/DateFilterPills";
import BottomNav from "@/components/BottomNav";
import DesktopNav from "@/components/DesktopNav";
import Footer from "@/components/Footer";
import SectionHeader from "@/shared/components/SectionHeader";

import PopularVenues from "@/components/PopularVenues";
import HomeDiscoveryBlocks from "@/components/home/HomeDiscoveryBlocks";
import HomeIntentChips from "@/components/home/HomeIntentChips";
import { getHomeContext } from "@modules/discovery";
import { supabase } from "@/integrations/supabase/client";
import { fetchUpcomingPublishedEventsForHome } from "@modules/discovery/events";
import { fetchPartnerSlugsByIds } from "@modules/discovery/venues";
import { useNavigate } from "react-router-dom";
import { isTodaySP, isTomorrowSP, getWeekendRangeSP, getNowInSaoPaulo } from "@/lib/dateUtils";

type EventCategory = "balada" | "show" | "bar" | "festival" | "sertanejo" | "funk" | "eletronica" | "festa";

const Index = () => {
  const [category, setCategory] = useState<EventCategory | null>(null);
  const [events, setEvents] = useState<SupabaseEvent[]>([]);
  const [trendingIds, setTrendingIds] = useState<string[]>([]);
  const [featuredIds, setFeaturedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  usePageTracking();

  const [activeAnchor, setActiveAnchor] = useState<DateAnchor | null>(null);
  const homeContext = useMemo(() => getHomeContext(), []);
  const sectionRefs = useRef<Record<DateAnchor, HTMLElement | null>>({ hoje: null, amanha: null, fds: null });

  const scrollTo = useCallback((anchor: DateAnchor) => {
    setActiveAnchor(anchor);
    sectionRefs.current[anchor]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Track which section is in view
  useEffect(() => {
    const visibilityMap = new Map<string, IntersectionObserverEntry>();
    const observer = new IntersectionObserver(
      (obs) => {
        obs.forEach(e => visibilityMap.set(e.target.id, e));
        const order: DateAnchor[] = ["hoje", "amanha", "fds"];
        let best: DateAnchor | null = null;
        let bestRatio = 0;
        for (const k of order) {
          const entry = visibilityMap.get(`section-${k}`);
          if (entry?.isIntersecting && entry.intersectionRatio > bestRatio) {
            best = k;
            bestRatio = entry.intersectionRatio;
          }
        }
        setActiveAnchor(best);
      },
      { rootMargin: "-20% 0px -40% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    const keys: DateAnchor[] = ["hoje", "amanha", "fds"];
    keys.forEach(k => { const el = sectionRefs.current[k]; if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [loading, events]);

  useEffect(() => {
    async function load() {
      const [evts, trendingRes] = await Promise.all([
        fetchUpcomingPublishedEventsForHome(),
        supabase
          .from("page_views")
          .select("event_id")
          .not("event_id", "is", null)
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      ]);

      const partnerIds = [...new Set(evts.filter(e => e.partner_id).map(e => e.partner_id!))];
      const slugMap: Record<string, string> = {};
      if (partnerIds.length > 0) {
        const partners = await fetchPartnerSlugsByIds(partnerIds);
        partners.forEach(p => { slugMap[p.id] = p.slug; });
      }
      setEvents(evts.map(e => ({ ...e, partner_slug: e.partner_id ? slugMap[e.partner_id] || null : null })));

      // Count views per event and get top 5
      const viewCounts: Record<string, number> = {};
      const evtIds = new Set(evts.map(e => e.id));
      (trendingRes.data || []).forEach(v => {
        if (v.event_id && evtIds.has(v.event_id)) {
          viewCounts[v.event_id] = (viewCounts[v.event_id] || 0) + 1;
        }
      });
      const top5 = Object.entries(viewCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id);
      setTrendingIds(top5);

      setLoading(false);
    }
    load();
  }, []);

  // ATENÇÃO: agrupamentos Hoje/Amanhã/FDS sempre em America/Sao_Paulo.
  const now = getNowInSaoPaulo();
  const todayEvents = events.filter(e => isTodaySP(new Date(e.date_time)));
  const todayIds = new Set(todayEvents.map(e => e.id));

  const tomorrowEvents = events.filter(e => !todayIds.has(e.id) && isTomorrowSP(new Date(e.date_time)));
  const tomorrowIds = new Set(tomorrowEvents.map(e => e.id));

  const getWeekendEvents = () => {
    const { start, end } = getWeekendRangeSP();
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    const usedIds = new Set([...todayIds, ...tomorrowIds]);
    return events.filter(e => {
      if (usedIds.has(e.id)) return false;
      const t = new Date(e.date_time).getTime();
      return t >= startMs && t < endMs;
    });
  };
  const weekendEvents = getWeekendEvents();
  const allShownIds = new Set([...todayIds, ...tomorrowIds, ...weekendEvents.map(e => e.id)]);

  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const popularEvents = events.filter(e => e.featured && !allShownIds.has(e.id));
  const upcomingEvents = events.filter(e => {
    const d = new Date(e.date_time);
    return !allShownIds.has(e.id) && !popularEvents.some(p => p.id === e.id) && d > now && d <= weekFromNow;
  });

  const featuredIdSet = useMemo(() => new Set(featuredIds), [featuredIds]);
  const trendingEvents = useMemo(() =>
    trendingIds
      .filter(id => !featuredIdSet.has(id))
      .map(id => events.find(e => e.id === id))
      .filter(Boolean) as SupabaseEvent[],
    [trendingIds, events, featuredIdSet]
  );

  const filtered = category ? events.filter(e => e.category === category) : null;

  const searchTerm = searchQuery.trim().toLowerCase();
  const searchResults = searchTerm
    ? events.filter(e =>
        e.title.toLowerCase().includes(searchTerm) ||
        (e.venue_name || "").toLowerCase().includes(searchTerm) ||
        (e.category || "").toLowerCase().includes(searchTerm)
      )
    : null;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <SEO
        title="Eventos Hoje em Presidente Prudente — Festas, Baladas e Shows | ROXOU"
        description="Descubra os melhores eventos, festas, baladas, shows e bares em Presidente Prudente. Agenda atualizada diariamente com os rolês de hoje, amanhã e fim de semana."
        canonical="https://roxou.com.br"
        jsonLd={{
          "@context": "https://schema.org", "@type": "WebSite", name: "ROXOU",
          url: "https://roxou.com.br",
          description: "Guia de eventos, festas, baladas e shows em Presidente Prudente — SP.",
          potentialAction: { "@type": "SearchAction", target: "https://roxou.com.br/?q={search_term_string}", "query-input": "required name=search_term_string" },
        }}
      />

      {/* Desktop top nav */}
      <DesktopNav />

      {/* Mobile header */}
      <header className="sticky top-0 z-40 glass border-b border-border/30 md:hidden">
        <div className="mx-auto max-w-lg px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-black font-display neon-text text-primary tracking-tight">ROXOU</h1>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground font-medium">Presidente Prudente, SP</span>
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full gradient-primary">
              <span className="text-xs font-black text-primary-foreground">PP</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-2xl bg-secondary/80 px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar eventos, bares, festas..." className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" />
          </div>
          <HomeIntentChips context={homeContext} className="mt-3" />
          <div className="mt-3">
            <DateFilterPills active={activeAnchor} onScrollTo={scrollTo} />
          </div>
        </div>
      </header>

      {/* Desktop search + pills bar */}
      <div className="hidden md:block border-b border-border/20 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-4 space-y-3">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5 rounded-2xl bg-secondary/80 px-4 py-3 flex-1 max-w-md">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar eventos, bares, festas..." className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" />
            </div>
            <DateFilterPills active={activeAnchor} onScrollTo={scrollTo} />
          </div>
          <HomeIntentChips context={homeContext} />
        </div>
      </div>


      <main className="mx-auto max-w-lg md:max-w-6xl px-4 md:px-6 mt-4 md:mt-8 space-y-5 md:space-y-10">
        {/* Featured hero */}
        <section className="md:max-w-4xl md:mx-auto">
          <FeaturedCarousel onFeaturedLoad={setFeaturedIds} />
        </section>

        {/* Trending now */}
        {!loading && trendingEvents.length > 0 && !searchResults && !filtered && (
          <section>
            <SectionHeader emoji="🔥" title="Em alta agora" subtitle="Mais vistos nas últimas 24h" />
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-2 md:grid md:grid-cols-3 lg:grid-cols-5 md:overflow-x-visible md:mx-0 md:px-0 md:gap-4">
              {trendingEvents.map((e, i) => (
                <div key={e.id} className="w-[180px] shrink-0 md:w-auto relative">
                  <div className="absolute -top-1 -left-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {i + 1}
                  </div>
                  <EventCard event={e} index={i} />
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <SectionHeader title="Categorias" onSeeAll={() => navigate("/categorias")} />
          <CategoryPills selected={category} onSelect={c => setCategory(c)} />
        </section>

        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-12">Carregando eventos...</p>
        ) : searchResults ? (
          <section>
            <SectionHeader title={`Resultados para "${searchQuery}"`} />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {searchResults.map((e, i) => <EventCard key={e.id} event={e} index={i} />)}
            </div>
            {searchResults.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">Nenhum evento encontrado.</p>}
          </section>
        ) : filtered ? (
          <section>
            <SectionHeader title="Resultados" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {filtered.map((e, i) => <EventCard key={e.id} event={e} index={i} />)}
            </div>
            {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">Nenhum evento nessa categoria.</p>}
          </section>
        ) : (
          <>
            {todayEvents.length > 0 && (
              <section id="section-hoje" ref={el => { sectionRefs.current.hoje = el; }} className="scroll-mt-36 space-y-6">
                {todayEvents.filter(e => e.category === "festival").length > 0 && (
                  <>
                    <SectionHeader emoji="⚽" title="Futebol hoje" subtitle={`${todayEvents.filter(e => e.category === "festival").length} jogo(s)`} />
                    <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-2 md:grid md:grid-cols-3 lg:grid-cols-4 md:overflow-x-visible md:mx-0 md:px-0 md:gap-4">
                      {todayEvents.filter(e => e.category === "festival").map((e, i) => (
                        <div key={e.id} className="w-[200px] shrink-0 md:w-auto"><EventCard event={e} index={i} sponsored={e.featured} /></div>
                      ))}
                    </div>
                  </>
                )}
                {todayEvents.filter(e => e.category !== "festival").length > 0 && (
                  <>
                    <SectionHeader emoji="🎧" title="Música hoje" subtitle={`${todayEvents.filter(e => e.category !== "festival").length} rolê(s)`} />
                    <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-2 md:grid md:grid-cols-3 lg:grid-cols-4 md:overflow-x-visible md:mx-0 md:px-0 md:gap-4">
                      {todayEvents.filter(e => e.category !== "festival").map((e, i) => (
                        <div key={e.id} className="w-[200px] shrink-0 md:w-auto"><EventCard event={e} index={i} sponsored={e.featured} /></div>
                      ))}
                    </div>
                  </>
                )}
              </section>
            )}

            <AdBanner adSlot="1234567890" className="my-1 min-h-0 empty:hidden [&:has(ins[data-ad-status='unfilled'])]:hidden" />

            {tomorrowEvents.length > 0 && (
              <section id="section-amanha" ref={el => { sectionRefs.current.amanha = el; }} className="scroll-mt-36">
                <SectionHeader emoji="📅" title="Eventos de Amanhã" subtitle={`${tomorrowEvents.length} rolês confirmados`} />
                <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-2 md:grid md:grid-cols-3 lg:grid-cols-4 md:overflow-x-visible md:mx-0 md:px-0 md:gap-4">
                  {tomorrowEvents.map((e, i) => (
                    <div key={e.id} className="w-[200px] shrink-0 md:w-auto"><EventCard event={e} index={i} sponsored={e.featured} /></div>
                  ))}
                </div>
              </section>
            )}

            {weekendEvents.length > 0 && (
              <section id="section-fds" ref={el => { sectionRefs.current.fds = el; }} className="scroll-mt-36">
                <SectionHeader emoji="🎉" title="Eventos do Fim de Semana" subtitle="Sábado e domingo" />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {weekendEvents.map((e, i) => <EventCard key={e.id} event={e} index={i} sponsored={e.featured} />)}
                </div>
              </section>
            )}

            {popularEvents.length > 0 && (
              <section>
                <SectionHeader emoji="⚡" title="Populares da Semana" subtitle="Os mais procurados" onSeeAll={() => navigate("/semana")} />
                <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
                  {popularEvents.map((e, i) => <EventCard key={e.id} event={e} variant="wide" index={i} />)}
                </div>
              </section>
            )}

            {upcomingEvents.length > 0 && (
              <section>
                <SectionHeader emoji="📅" title="Próximos Eventos" onSeeAll={() => navigate("/semana")} />
                <div className="space-y-2.5 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
                  {upcomingEvents.map((e, i) => <EventCard key={e.id} event={e} variant="compact" index={i} />)}
                </div>
              </section>
            )}

            <HomeDiscoveryBlocks context={homeContext} />

            <section>
              <PopularVenues />
            </section>
          </>
        )}
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
};

export default Index;
