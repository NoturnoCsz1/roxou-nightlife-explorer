import { useState } from "react";
import { usePageTracking } from "@/hooks/usePageTracking";
import { Search, MapPin } from "lucide-react";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import EventCard from "@/components/EventCard";
import CategoryPills from "@/components/CategoryPills";
import BottomNav from "@/components/BottomNav";
import SectionHeader from "@/components/SectionHeader";
import VenueList from "@/components/VenueList";
import { events, EventCategory } from "@/data/events";
import { useNavigate } from "react-router-dom";

const todayEvents = events.filter((e) => e.isToday);
const upcomingEvents = events.filter((e) => !e.isToday);
const popularEvents = events.filter((e) => e.popular);

const Index = () => {
  const [category, setCategory] = useState<EventCategory | null>(null);
  const navigate = useNavigate();

  const filtered = category ? events.filter((e) => e.category === category) : null;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border/30">
        <div className="mx-auto max-w-lg px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-black font-display neon-text text-primary tracking-tight">
                ROXOU
              </h1>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground font-medium">
                  Presidente Prudente, SP
                </span>
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full gradient-primary">
              <span className="text-xs font-black text-primary-foreground">PP</span>
            </div>
          </div>
          {/* Search */}
          <div className="flex items-center gap-2.5 rounded-2xl bg-secondary/80 px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Buscar eventos, bares, festas..."
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 mt-5 space-y-8">
        {/* Featured Carousel */}
        <section>
          <FeaturedCarousel />
        </section>

        {/* Categories */}
        <section>
          <SectionHeader title="Categorias" onSeeAll={() => navigate("/categorias")} />
          <CategoryPills selected={category} onSelect={setCategory} />
        </section>

        {/* Filtered or default */}
        {filtered ? (
          <section>
            <SectionHeader title="Resultados" />
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((e, i) => (
                <EventCard key={e.id} event={e} index={i} />
              ))}
            </div>
            {filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-12">
                Nenhum evento nessa categoria.
              </p>
            )}
          </section>
        ) : (
          <>
            {/* Today */}
            <section>
              <SectionHeader
                emoji="🔥"
                title="Eventos de Hoje"
                subtitle={`${todayEvents.length} rolês pra você`}
              />
              <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-2">
                {todayEvents.map((e, i) => (
                  <div key={e.id} className="w-[200px] shrink-0">
                    <EventCard event={e} index={i} />
                  </div>
                ))}
              </div>
            </section>

            {/* Popular */}
            <section>
              <SectionHeader
                emoji="⚡"
                title="Populares da Semana"
                subtitle="Os mais procurados"
                onSeeAll={() => navigate("/semana")}
              />
              <div className="space-y-3">
                {popularEvents.map((e, i) => (
                  <EventCard key={e.id} event={e} variant="wide" index={i} />
                ))}
              </div>
            </section>

            {/* Upcoming */}
            <section>
              <SectionHeader
                emoji="📅"
                title="Próximos Eventos"
                onSeeAll={() => navigate("/semana")}
              />
              <div className="space-y-2.5">
                {upcomingEvents.map((e, i) => (
                  <EventCard key={e.id} event={e} variant="compact" index={i} />
                ))}
              </div>
            </section>

            {/* Venues */}
            <section>
              <SectionHeader
                emoji="📍"
                title="Lugares em Destaque"
                subtitle="Os melhores da cidade"
              />
              <VenueList />
            </section>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Index;
