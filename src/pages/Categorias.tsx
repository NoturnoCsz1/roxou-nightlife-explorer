import { useState } from "react";
import { categoryLabels, EventCategory, events } from "@/data/events";
import EventCard from "@/components/EventCard";
import BottomNav from "@/components/BottomNav";
import CategoryPills from "@/components/CategoryPills";

const Categorias = () => {
  const [selected, setSelected] = useState<EventCategory | null>(null);
  const filtered = selected ? events.filter((e) => e.category === selected) : events;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl px-4 pt-4 pb-3">
        <div className="mx-auto max-w-lg">
          <h1 className="text-xl font-bold font-display text-foreground">🎭 Categorias</h1>
          <div className="mt-3">
            <CategoryPills selected={selected} onSelect={setSelected} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 mt-4">
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">
            Nenhum evento nessa categoria.
          </p>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Categorias;
