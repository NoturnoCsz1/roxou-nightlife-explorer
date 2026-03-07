import { useState, useEffect } from "react";
import EventCard from "@/components/EventCard";
import type { SupabaseEvent } from "@/components/EventCard";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import CategoryPills from "@/components/CategoryPills";
import { supabase } from "@/integrations/supabase/client";
import { usePageTracking } from "@/hooks/usePageTracking";
import SEO from "@/components/SEO";

type EventCategory = "balada" | "show" | "bar" | "festival" | "sertanejo" | "funk" | "eletronica";

const Categorias = () => {
  usePageTracking();
  const [selected, setSelected] = useState<EventCategory | null>(null);
  const [events, setEvents] = useState<SupabaseEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("events")
      .select("id, title, slug, description, date_time, category, venue_name, address, instagram, image_url, featured, status, partner_id")
      .eq("status", "published")
      .order("date_time", { ascending: true })
      .then(({ data }) => { setEvents(data || []); setLoading(false); });
  }, []);

  const filtered = selected ? events.filter((e) => e.category === selected) : events;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 glass border-b border-border/30 px-4 pt-4 pb-3">
        <div className="mx-auto max-w-lg">
          <h1 className="text-xl font-black font-display text-foreground mb-3">🎭 Categorias</h1>
          <CategoryPills selected={selected} onSelect={setSelected} />
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 mt-5">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-16">Carregando...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
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
