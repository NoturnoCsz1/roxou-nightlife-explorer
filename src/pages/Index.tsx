import { useState, useEffect, useRef, useCallback } from "react";
import { usePageTracking } from "@/hooks/usePageTracking";
import { Search, MapPin } from "lucide-react";
import SEO from "@/components/SEO";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import EventCard from "@/components/EventCard";
import type { SupabaseEvent } from "@/components/EventCard";
import CategoryPills from "@/components/CategoryPills";
import DateFilterPills from "@/components/DateFilterPills";
import type { DateAnchor } from "@/components/DateFilterPills";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import SectionHeader from "@/components/SectionHeader";
import VenueList from "@/components/VenueList";
import PopularVenues from "@/components/PopularVenues";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { isToday, isTomorrow } from "@/lib/dateUtils";

type EventCategory = "balada" | "show" | "bar" | "festival" | "sertanejo" | "funk" | "eletronica";

const Index = () => {
  const [category, setCategory] = useState<EventCategory | null>(null);
  const [events, setEvents] = useState<SupabaseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  usePageTracking();

  const sectionRefs = useRef<Record<DateAnchor, HTMLElement | null>>({ hoje: null, amanha: null, fds: null });

  const scrollTo = useCallback((anchor: DateAnchor) => {
    sectionRefs.current[anchor]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    async function load() {
      const now = new Date().toISOString();
      const { data: eventsData } = await supabase
        .from("events")
        .select("id, title, slug, description, date_time, category, venue_name, address, instagram, image_url, featured, status, partner_id")
        .eq("status", "published")
        .gt("date_time", now)
        .order("date_time", { ascending: true });

      const evts = eventsData || [];
      const partnerIds = [...new Set(evts.filter(e => e.partner_id).map(e => e.partner_id!))];
      let slugMap: Record<string, string> = {};
      if (partnerIds.length > 0) {
        const { data: partners } = await supabase.from("partners").select("id, slug").in("id", partnerIds);
        (partners || []).forEach(p => { slugMap[p.id] = p.slug; });
      }
      setEvents(evts.map(e => ({ ...e, partner_slug: e.partner_id ? slugMap[e.partner_id] || null : null })));
      setLoading(false);
    }
    load();
  }, []);

  // Build sections with deduplication
  const now = new Date();
  const todayEvents = events.filter(e => isToday(new Date(e.date_time)));
  const todayIds = new Set(todayEvents.map(e => e.id));

  const tomorrowEvents = events.filter(e => !todayIds.has(e.id) && isTomorrow(new Date(e.date_time)));
  const tomorrowIds = new Set(tomorrowEvents.map(e => e.id));

  const getWeekendEvents = () => {
    const day = now.getDay();
    let satStart: Date, sunEnd: Date;
    if (day === 0) {
      satStart = new Date(now); satStart.setHours(0,0,0,0);
      sunEnd = new Date(satStart); sunEnd.setHours(23,59,59,999);
    } else if (day === 6) {
      satStart = new Date(now); satStart.setHours(0,0,0,0);
      sunEnd = new Date(satStart); sunEnd.setDate(satStart.getDate() + 1); sunEnd.setHours(23,59,59,999);
    } else {
      const daysUntilSat = 6 - day;
      satStart = new Date(now); satStart.setDate(now.getDate() + daysUntilSat); satStart.setHours(0,0,0,0);
      sunEnd = new Date(satStart); sunEnd.setDate(satStart.getDate() + 1); sunEnd.setHours(23,59,59,999);
    }
    const usedIds = new Set([...todayIds, ...tomorrowIds]);
    return events.filter(e => {
      if (usedIds.has(e.id)) return false;
      const d = new Date(e.date_time);
      return d >= satStart && d <= sunEnd;
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
    <div className="min-h-screen bg-background pb-24">
      <SEO
        title="ROXOU — Eventos e bares em Presidente Prudente"
        description="Descubra festas, bares, baladas e shows acontecendo hoje em Presidente Prudente. Guia de eventos Roxou."
        canonical="https://roxou.com.br"
        jsonLd={{
          "@context": "https://schema.org", "@type": "WebSite", name: "ROXOU", url: "https://roxou.com.br",
          description: "Descubra festas, bares, baladas e shows acontecendo hoje em Presidente Prudente.",
          potentialAction: { "@type": "SearchAction", target: "https://roxou.com.br/?q={search_term_string}", "query-input": "required name=search_term_string" },
        }}
      />
      <header className="sticky top-0 z-40 glass border-b border-border/30">
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
          <div className="mt-3">
            <DateFilterPills onScrollTo={scrollTo} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 mt-5 space-y-8">
        <section><FeaturedCarousel /></section>

        <section>
          <SectionHeader title="Categorias" onSeeAll={() => navigate("/categorias")} />
          <CategoryPills selected={category} onSelect={c => setCategory(c)} />
        </section>

        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-12">Carregando eventos...</p>
        ) : searchResults ? (
          <section>
            <SectionHeader title={`Resultados para "${searchQuery}"`} />
            <div className="grid grid-cols-2 gap-3">
              {searchResults.map((e, i) => <EventCard key={e.id} event={e} index={i} />)}
            </div>
            {searchResults.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">Nenhum evento encontrado.</p>}
          </section>
        ) : filtered ? (
          <section>
            <SectionHeader title="Resultados" />
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((e, i) => <EventCard key={e.id} event={e} index={i} />)}
            </div>
            {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">Nenhum evento nessa categoria.</p>}
          </section>
        ) : (
          <>
            {todayEvents.length > 0 && (
              <section ref={el => { sectionRefs.current.hoje = el; }} className="scroll-mt-36">
                <SectionHeader emoji="🔥" title="Eventos de Hoje" subtitle={`${todayEvents.length} rolês pra você`} />
                <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-2">
                  {todayEvents.map((e, i) => (
                    <div key={e.id} className="w-[200px] shrink-0"><EventCard event={e} index={i} /></div>
                  ))}
                </div>
              </section>
            )}

            {tomorrowEvents.length > 0 && (
              <section ref={el => { sectionRefs.current.amanha = el; }} className="scroll-mt-36">
                <SectionHeader emoji="📅" title="Eventos de Amanhã" subtitle={`${tomorrowEvents.length} rolês confirmados`} />
                <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-2">
                  {tomorrowEvents.map((e, i) => (
                    <div key={e.id} className="w-[200px] shrink-0"><EventCard event={e} index={i} /></div>
                  ))}
                </div>
              </section>
            )}

            {weekendEvents.length > 0 && (
              <section ref={el => { sectionRefs.current.fds = el; }} className="scroll-mt-36">
                <SectionHeader emoji="🎉" title="Eventos do Fim de Semana" subtitle="Sábado e domingo" />
                <div className="grid grid-cols-2 gap-3">
                  {weekendEvents.map((e, i) => <EventCard key={e.id} event={e} index={i} />)}
                </div>
              </section>
            )}

            {popularEvents.length > 0 && (
              <section>
                <SectionHeader emoji="⚡" title="Populares da Semana" subtitle="Os mais procurados" onSeeAll={() => navigate("/semana")} />
                <div className="space-y-3">
                  {popularEvents.map((e, i) => <EventCard key={e.id} event={e} variant="wide" index={i} />)}
                </div>
              </section>
            )}

            {upcomingEvents.length > 0 && (
              <section>
                <SectionHeader emoji="📅" title="Próximos Eventos" onSeeAll={() => navigate("/semana")} />
                <div className="space-y-2.5">
                  {upcomingEvents.map((e, i) => <EventCard key={e.id} event={e} variant="compact" index={i} />)}
                </div>
              </section>
            )}

            <section>
              <SectionHeader emoji="🔥" title="Lugares mais populares" subtitle="Onde o público mais vai" />
              <PopularVenues />
            </section>

            <section>
              <SectionHeader emoji="📍" title="Lugares em Destaque" subtitle="Os melhores da cidade" />
              <VenueList />
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
