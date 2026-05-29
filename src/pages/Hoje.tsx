import { useEffect, useState } from "react";
import EventCard from "@/components/EventCard";
import type { SupabaseEvent } from "@/components/EventCard";
import BottomNav from "@/components/BottomNav";
import DesktopNav from "@/components/DesktopNav";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { usePageTracking } from "@/hooks/usePageTracking";
import SEO from "@/components/SEO";
import { formatDateHeader, getStartOfTodaySP, getEndOfTodaySP, getNowInSaoPaulo } from "@/lib/dateUtils";

const Hoje = () => {
  usePageTracking();
  const [events, setEvents] = useState<SupabaseEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // ATENÇÃO: filtro "Hoje" sempre em America/Sao_Paulo. Não usar UTC puro.
      const startOfDay = getStartOfTodaySP();
      const endOfDay = getEndOfTodaySP();

      const { data: eventsData } = await supabase
        .from("events")
        .select("id, title, slug, description, date_time, category, sub_category, venue_name, address, instagram, image_url, featured, status, partner_id")
        .eq("status", "published")
        .gte("date_time", startOfDay)
        .lt("date_time", endOfDay)
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
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <SEO
        title="Eventos Hoje em Presidente Prudente — O Que Fazer Hoje | ROXOU"
        description="Confira todos os eventos, festas, baladas e shows acontecendo HOJE em Presidente Prudente. Agenda atualizada em tempo real."
        canonical="https://roxou.com.br/hoje"
      />
      <DesktopNav />
      <header className="sticky top-0 z-40 glass border-b border-border/30 px-4 pt-4 pb-3 md:hidden">
        <div className="mx-auto max-w-lg">
          <h1 className="text-xl font-black font-display text-foreground">🔥 Hoje em Prudente</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatDateHeader(new Date())}
          </p>
        </div>
      </header>
      {/* Desktop page title */}
      <div className="hidden md:block border-b border-border/20 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <h1 className="text-2xl font-black font-display text-foreground">🔥 Hoje em Prudente</h1>
          <p className="text-sm text-muted-foreground mt-1">{formatDateHeader(new Date())}</p>
        </div>
      </div>
      <main className="mx-auto max-w-lg md:max-w-6xl px-4 md:px-6 mt-5 md:mt-8">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-12">Carregando...</p>
        ) : events.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">Nenhum evento hoje.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {events.map((e, i) => (
              <EventCard key={e.id} event={e} index={i} sponsored={e.featured} />
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
