import { useEffect, useState } from "react";
import EventCard from "@/components/EventCard";
import type { SupabaseEvent } from "@/components/EventCard";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { usePageTracking } from "@/hooks/usePageTracking";

const Semana = () => {
  usePageTracking();
  const [events, setEvents] = useState<SupabaseEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date().toISOString();
    const weekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    supabase
      .from("events")
      .select("id, title, slug, description, date_time, category, venue_name, address, instagram, image_url, featured, status, partner_id")
      .eq("status", "published")
      .gte("date_time", now)
      .lte("date_time", weekLater)
      .order("date_time", { ascending: true })
      .then(({ data }) => { setEvents(data || []); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 glass border-b border-border/30 px-4 pt-4 pb-3">
        <div className="mx-auto max-w-lg">
          <h1 className="text-xl font-black font-display text-foreground">📅 Esta Semana</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Todos os eventos dos próximos 7 dias</p>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 mt-5 space-y-3">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-12">Carregando...</p>
        ) : events.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">Nenhum evento esta semana.</p>
        ) : (
          events.map((e, i) => <EventCard key={e.id} event={e} variant="compact" index={i} />)
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Semana;
