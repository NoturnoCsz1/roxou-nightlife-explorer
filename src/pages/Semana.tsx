import EventCard from "@/components/EventCard";
import BottomNav from "@/components/BottomNav";
import SectionHeader from "@/components/SectionHeader";
import { events } from "@/data/events";
import { usePageTracking } from "@/hooks/usePageTracking";

const Semana = () => {
  usePageTracking();
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 glass border-b border-border/30 px-4 pt-4 pb-3">
        <div className="mx-auto max-w-lg">
          <h1 className="text-xl font-black font-display text-foreground">📅 Esta Semana</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Todos os eventos dos próximos 7 dias</p>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 mt-5 space-y-3">
        {events.map((e, i) => (
          <EventCard key={e.id} event={e} variant="compact" index={i} />
        ))}
      </main>
      <BottomNav />
    </div>
  );
};

export default Semana;
