import EventCard from "@/components/EventCard";
import BottomNav from "@/components/BottomNav";
import { events } from "@/data/events";

const Semana = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl px-4 pt-4 pb-3">
        <div className="mx-auto max-w-lg">
          <h1 className="text-xl font-bold font-display text-foreground">📅 Esta Semana</h1>
          <p className="text-xs text-muted-foreground mt-1">Todos os eventos dos próximos 7 dias</p>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 space-y-3 mt-4">
        {events.map((e) => (
          <EventCard key={e.id} event={e} variant="compact" />
        ))}
      </main>
      <BottomNav />
    </div>
  );
};

export default Semana;
