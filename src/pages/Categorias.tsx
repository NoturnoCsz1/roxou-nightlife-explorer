import { useState, useEffect } from "react";
import EventCard from "@/components/EventCard";
import type { SupabaseEvent } from "@/components/EventCard";
import BottomNav from "@/components/BottomNav";
import DesktopNav from "@/components/DesktopNav";
import Footer from "@/components/Footer";
import CategoryPills from "@/components/CategoryPills";
import { supabase } from "@/integrations/supabase/client";
import { usePageTracking } from "@/hooks/usePageTracking";
import SEO from "@/components/SEO";

type EventCategory = "balada" | "show" | "bar" | "festival" | "sertanejo" | "funk" | "eletronica" | "festa";

const Categorias = () => {
  usePageTracking();
  const [selected, setSelected] = useState<EventCategory | null>(null);
  const [events, setEvents] = useState<SupabaseEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("events")
      .select("id, title, slug, description, date_time, category, sub_category, venue_name, address, instagram, image_url, featured, status, partner_id")
      .eq("status", "published")
      .gt("date_time", new Date().toISOString())
      .order("date_time", { ascending: true })
      .then(({ data }) => { setEvents(data || []); setLoading(false); });
  }, []);

  const filtered = selected ? events.filter((e) => e.category === selected) : events;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <SEO
        title="Categorias de Eventos em Presidente Prudente | ROXOU"
        description="Explore eventos por categoria: baladas, shows, bares, festivais e mais em Presidente Prudente."
        canonical="https://roxou.com.br/categorias"
      />
      <DesktopNav />
      <header className="sticky top-0 z-40 glass border-b border-border/30 px-4 pt-4 pb-3 md:hidden">
        <div className="mx-auto max-w-lg">
          <h1 className="text-xl font-black font-display text-foreground mb-3">🎭 Categorias</h1>
          <CategoryPills selected={selected} onSelect={setSelected} />
        </div>
      </header>
      <div className="hidden md:block border-b border-border/20 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <h1 className="text-2xl font-black font-display text-foreground mb-4">🎭 Categorias</h1>
          <CategoryPills selected={selected} onSelect={setSelected} />
        </div>
      </div>
      <main className="mx-auto max-w-lg md:max-w-6xl px-4 md:px-6 mt-5 md:mt-8">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-16">Carregando...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {filtered.map((e, i) => <EventCard key={e.id} event={e} index={i} />)}
            </div>
            {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-16">Nenhum evento nessa categoria.</p>}
          </>
        )}
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
};

export default Categorias;
