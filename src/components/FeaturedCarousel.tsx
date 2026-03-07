import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, MapPin, Clock } from "lucide-react";
import { events } from "@/data/events";
import { useNavigate } from "react-router-dom";

const featured = events.filter((e) => e.featured);

const FeaturedCarousel = () => {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  const next = useCallback(() => setCurrent((c) => (c + 1) % featured.length), []);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + featured.length) % featured.length), []);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  const event = featured[current];

  return (
    <div className="relative overflow-hidden rounded-3xl card-shadow-lg">
      <button
        onClick={() => navigate(`/evento/${event.id}`)}
        className="relative block w-full aspect-[9/12] sm:aspect-[16/10] text-left"
      >
        <img
          src={event.image}
          alt={event.title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000"
          key={event.id}
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/40 to-transparent" />

        {/* Badge top-left */}
        <div className="absolute left-4 top-4 flex gap-2">
          <span className="gradient-primary rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary-foreground">
            ✦ Destaque
          </span>
          {event.isToday && (
            <span className="badge-hoje rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest">
              Hoje
            </span>
          )}
        </div>

        {/* Content bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
          <span className={`${event.badgeClass} mb-3 inline-block rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider`}>
            {event.categoryLabel}
          </span>
          <h2 className="mb-2 text-2xl sm:text-3xl font-black text-foreground font-display leading-tight neon-text">
            {event.title}
          </h2>
          <div className="flex items-center gap-4 text-sm text-foreground/80">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary" />
              {event.venue}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary" />
              {event.time}
            </span>
          </div>
        </div>
      </button>

      {/* Nav arrows */}
      <button
        onClick={(e) => { e.stopPropagation(); prev(); }}
        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full glass p-2 text-foreground transition hover:neon-border"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); next(); }}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full glass p-2 text-foreground transition hover:neon-border"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
        {featured.map((_, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current ? "w-8 gradient-primary" : "w-2 bg-foreground/25"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default FeaturedCarousel;
