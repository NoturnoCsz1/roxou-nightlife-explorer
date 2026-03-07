import { useEffect, useState } from "react";
import EventCard from "@/components/EventCard";
import type { SupabaseEvent } from "@/components/EventCard";
import BottomNav from "@/components/BottomNav";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { usePageTracking } from "@/hooks/usePageTracking";
import SEO from "@/components/SEO";

const Semana = () => {
  usePageTracking();
  const [events, setEvents] = useState<SupabaseEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const now = new Date().toISOString();
      const weekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: eventsData } = await supabase
        .from("events")
        .select("id, title, slug, description, date_time, category, venue_name, address, instagram, image_url, featured, status, partner_id")
        .eq("status", "published")
        .gte("date_time", now)
        .lte("date_time", weekLater)
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

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEO
        title="Eventos da Semana em Presidente Prudente | ROXOU"
        description="Confira todos os eventos dos próximos 7 dias em Presidente Prudente. Festas, shows e baladas."
        canonical="https://roxou.com.br/semana"
      />
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
      <Footer />
      <BottomNav />
    </div>
  );
};

export default Semana;
