import { useState, useEffect } from "react";
import { usePageTracking } from "@/hooks/usePageTracking";
import { Search, MapPin } from "lucide-react";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import EventCard from "@/components/EventCard";
import type { SupabaseEvent } from "@/components/EventCard";
import CategoryPills from "@/components/CategoryPills";
import DateFilterPills from "@/components/DateFilterPills";
import type { DateFilter } from "@/components/DateFilterPills";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import SectionHeader from "@/components/SectionHeader";
import VenueList from "@/components/VenueList";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

type EventCategory = "balada" | "show" | "bar" | "festival" | "sertanejo" | "funk" | "eletronica";

const Index = () => {
  const [category, setCategory] = useState<EventCategory | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>("todos");
  const [events, setEvents] = useState<SupabaseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  usePageTracking();

  useEffect(() => {
    supabase
      .from("events")
      .select("id, title, slug, description, date_time, category, venue_name, address, instagram, image_url, featured, status, partner_id")
      .eq("status", "published")
      .order("date_time", { ascending: true })
      .then(({ data }) => {
        setEvents(data || []);
        setLoading(false);
      });
  }, []);

  const now = new Date();
  const todayStr = now.toDateString();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Date filter logic
  const getDateFiltered = () => {
    if (dateFilter === "hoje") {
      return events.filter((e) => new Date(e.date_time).toDateString() === todayStr);
    }
    if (dateFilter === "amanha") {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return events.filter((e) => new Date(e.date_time).toDateString() === tomorrow.toDateString());
    }
    if (dateFilter === "fds") {
      const dayOfWeek = now.getDay();
      const daysUntilSat = dayOfWeek <= 5 ? 6 - dayOfWeek : 0;
      const saturday = new Date(now); saturday.setDate(now.getDate() + daysUntilSat); saturday.setHours(0,0,0,0);
      const monday = new Date(saturday); monday.setDate(saturday.getDate() + 2); monday.setHours(23,59,59,999);
      return events.filter((e) => { const d = new Date(e.date_time); return d >= saturday && d <= monday; });
    }
    return null; // "todos" — show default sections
  };

  const dateFiltered = getDateFiltered();

  const todayEvents = events.filter((e) => new Date(e.date_time).toDateString() === todayStr);
  const upcomingEvents = events.filter((e) => {
    const d = new Date(e.date_time);
    return d > now && d <= weekFromNow;
  });
  const popularEvents = events.filter((e) => e.featured);
  const filtered = category ? events.filter((e) => e.category === category) : null;

  const searchTerm = searchQuery.trim().toLowerCase();
  const searchResults = searchTerm
    ? events.filter(
        (e) =>
          e.title.toLowerCase().includes(searchTerm) ||
          (e.venue_name || "").toLowerCase().includes(searchTerm) ||
          (e.category || "").toLowerCase().includes(searchTerm)
      )
    : null;

  return (
    <div className="min-h-screen bg-background pb-24">
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
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar eventos, bares, festas..." className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 mt-5 space-y-8">
        <section><FeaturedCarousel /></section>

        {/* Date filters */}
        <section>
          <DateFilterPills selected={dateFilter} onSelect={(f) => { setDateFilter(f); setCategory(null); }} />
        </section>

        <section>
          <SectionHeader title="Categorias" onSeeAll={() => navigate("/categorias")} />
          <CategoryPills selected={category} onSelect={(c) => { setCategory(c); setDateFilter("todos"); }} />
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
              <section>
                <SectionHeader emoji="🔥" title="Eventos de Hoje" subtitle={`${todayEvents.length} rolês pra você`} />
                <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-2">
                  {todayEvents.map((e, i) => (
                    <div key={e.id} className="w-[200px] shrink-0"><EventCard event={e} index={i} /></div>
                  ))}
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
