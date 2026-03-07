import { useState } from "react";
import { EventCategory, events } from "@/data/events";
import EventCard from "@/components/EventCard";
import BottomNav from "@/components/BottomNav";
import CategoryPills from "@/components/CategoryPills";

const Categorias = () => {
  const [selected, setSelected] = useState<EventCategory | null>(null);
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
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((e, i) => (
            <EventCard key={e.id} event={e} index={i} />
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-16">
            Nenhum evento nessa categoria.
          </p>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Categorias;
