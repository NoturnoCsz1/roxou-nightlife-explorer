import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { events } from "@/data/events";
import { useNavigate } from "react-router-dom";

const featured = events.filter((e) => e.featured);

const FeaturedCarousel = () => {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  const next = () => setCurrent((c) => (c + 1) % featured.length);
  const prev = () => setCurrent((c) => (c - 1 + featured.length) % featured.length);

  const event = featured[current];

  return (
    <div className="relative overflow-hidden rounded-2xl neon-glow">
      <button
        onClick={() => navigate(`/evento/${event.id}`)}
        className="relative block w-full aspect-[16/10] text-left"
      >
        <img
          src={event.image}
          alt={event.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <span className="mb-2 inline-block rounded-full gradient-primary px-3 py-1 text-[11px] font-bold text-primary-foreground">
            EM DESTAQUE
          </span>
          <h2 className="mb-1 text-xl font-bold text-foreground font-display neon-text">
            {event.title}
          </h2>
          <p className="text-sm text-foreground/70">
            {event.venue} · {event.time}
          </p>
        </div>
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); prev(); }}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/60 p-1.5 text-foreground backdrop-blur-sm transition hover:bg-background/80"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); next(); }}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/60 p-1.5 text-foreground backdrop-blur-sm transition hover:bg-background/80"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
        {featured.map((_, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
            className={`h-1.5 rounded-full transition-all ${
              i === current ? "w-6 bg-primary" : "w-1.5 bg-foreground/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default FeaturedCarousel;
