import { useState } from "react";
import { Search } from "lucide-react";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import EventCard from "@/components/EventCard";
import CategoryPills from "@/components/CategoryPills";
import BottomNav from "@/components/BottomNav";
import { events, venues, EventCategory } from "@/data/events";

const todayEvents = events.filter((e) => e.date === "2026-03-07");
const upcomingEvents = events.filter((e) => e.date !== "2026-03-07");

const Index = () => {
  const [category, setCategory] = useState<EventCategory | null>(null);

  const filtered = category
    ? events.filter((e) => e.category === category)
    : null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl px-4 pt-4 pb-3">
        <div className="mx-auto max-w-lg flex items-center justify-between">
          <h1 className="text-2xl font-bold font-display neon-text text-primary">ROXOU</h1>
          <span className="text-[11px] text-muted-foreground">Presidente Prudente</span>
        </div>
        {/* Search */}
        <div className="mx-auto max-w-lg mt-3">
          <div className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar eventos, bares, festas..."
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 space-y-6">
        {/* Featured */}
        <FeaturedCarousel />

        {/* Categories */}
        <section>
          <h2 className="mb-3 text-lg font-bold font-display text-foreground">Categorias</h2>
          <CategoryPills selected={category} onSelect={setCategory} />
        </section>

        {/* Filtered results or default sections */}
        {filtered ? (
          <section>
            <h2 className="mb-3 text-lg font-bold font-display text-foreground">Resultados</h2>
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
            {filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                Nenhum evento encontrado nessa categoria.
              </p>
            )}
          </section>
        ) : (
          <>
            {/* Today */}
            <section>
              <h2 className="mb-3 text-lg font-bold font-display text-foreground">
                🔥 Acontecendo Hoje
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {todayEvents.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            </section>

            {/* Upcoming */}
            <section>
              <h2 className="mb-3 text-lg font-bold font-display text-foreground">
                📅 Próximos Eventos
              </h2>
              <div className="space-y-3">
                {upcomingEvents.map((e) => (
                  <EventCard key={e.id} event={e} variant="compact" />
                ))}
              </div>
            </section>

            {/* Venues */}
            <section>
              <h2 className="mb-3 text-lg font-bold font-display text-foreground">
                📍 Locais em Destaque
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {venues.map((v) => (
                  <div
                    key={v.name}
                    className="rounded-xl bg-card p-4 transition-all hover:neon-border"
                  >
                    <h3 className="text-sm font-bold text-foreground font-display">{v.name}</h3>
                    <p className="mt-1 text-[11px] text-muted-foreground">{v.address}</p>
                    <span className="mt-2 inline-block text-[10px] font-semibold text-primary">
                      {v.eventsCount} eventos
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Index;
