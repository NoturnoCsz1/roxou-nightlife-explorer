import { useEffect, useState } from "react";
import EventCard from "@/components/EventCard";
import type { SupabaseEvent } from "@/components/EventCard";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { usePageTracking } from "@/hooks/usePageTracking";

const Hoje = () => {
  usePageTracking();
  const [events, setEvents] = useState<SupabaseEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

    supabase
      .from("events")
      .select("id, title, slug, description, date_time, category, venue_name, address, instagram, image_url, featured, status, partner_id")
      .eq("status", "published")
      .gte("date_time", startOfDay)
      .lt("date_time", endOfDay)
      .order("date_time", { ascending: true })
      .then(({ data }) => {
        setEvents(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 glass border-b border-border/30 px-4 pt-4 pb-3">
        <div className="mx-auto max-w-lg">
          <h1 className="text-xl font-black font-display text-foreground">🔥 Hoje em Prudente</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 mt-5">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-12">Carregando...</p>
        ) : events.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">Nenhum evento hoje.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {events.map((e, i) => (
              <EventCard key={e.id} event={e} index={i} />
            ))}
          </div>
        )}
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
};

export default Hoje;
