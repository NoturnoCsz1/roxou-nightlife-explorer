import { useEffect, useState } from "react";
import EventCard from "@/components/EventCard";
import type { SupabaseEvent } from "@/components/EventCard";
import BottomNav from "@/components/BottomNav";
import DesktopNav from "@/components/DesktopNav";
import Footer from "@/components/Footer";
import { fetchWeekPublishedEvents } from "@modules/discovery/events";
import { fetchPartnerSlugsByIds } from "@modules/discovery/venues";
import { usePageTracking } from "@/hooks/usePageTracking";
import SEO from "@/components/SEO";

const Semana = () => {
  usePageTracking();
  const [events, setEvents] = useState<SupabaseEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const evts = await fetchWeekPublishedEvents();

      const partnerIds = [...new Set(evts.filter(e => e.partner_id).map(e => e.partner_id!))];
      let slugMap: Record<string, string> = {};
      if (partnerIds.length > 0) {
        const partners = await fetchPartnerSlugsByIds(partnerIds);
        partners.forEach(p => { slugMap[p.id] = p.slug; });
      }
      setEvents(evts.map(e => ({ ...e, partner_slug: e.partner_id ? slugMap[e.partner_id] || null : null })));
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <SEO
        title="Agenda de Eventos da Semana em Presidente Prudente | ROXOU"
        description="Agenda completa dos próximos 7 dias em Presidente Prudente. Festas, shows, baladas, bares e eventos ao vivo."
        canonical="https://roxou.com.br/semana"
      />
      <DesktopNav />
      <header className="sticky top-0 z-40 glass border-b border-border/30 px-4 pt-4 pb-3 md:hidden">
        <div className="mx-auto max-w-lg">
          <h1 className="text-xl font-black font-display text-foreground">📅 Esta Semana</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Todos os eventos dos próximos 7 dias</p>
        </div>
      </header>
      <div className="hidden md:block border-b border-border/20 bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <h1 className="text-2xl font-black font-display text-foreground">📅 Esta Semana</h1>
          <p className="text-sm text-muted-foreground mt-1">Todos os eventos dos próximos 7 dias</p>
        </div>
      </div>
      <main className="mx-auto max-w-lg md:max-w-6xl px-4 md:px-6 mt-5 md:mt-8 space-y-3 md:space-y-0">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-12">Carregando...</p>
        ) : events.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">Nenhum evento esta semana.</p>
        ) : (
          <div className="space-y-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0">
            {events.map((e, i) => <EventCard key={e.id} event={e} variant="compact" index={i} sponsored={e.featured} />)}
          </div>
        )}
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
};

export default Semana;
