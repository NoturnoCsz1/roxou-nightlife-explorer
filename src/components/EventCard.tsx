import { Calendar, Clock, MapPin } from "lucide-react";
import { NightEvent } from "@/data/events";
import { useNavigate } from "react-router-dom";

interface EventCardProps {
  event: NightEvent;
  variant?: "default" | "compact" | "wide";
  index?: number;
}

const EventCard = ({ event, variant = "default", index = 0 }: EventCardProps) => {
  const navigate = useNavigate();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  if (variant === "compact") {
    return (
      <button
        onClick={() => navigate(`/evento/${event.id}`)}
        className="flex gap-4 rounded-2xl bg-card p-3 text-left transition-all active:scale-[0.98] card-shadow group w-full"
        style={{ animationDelay: `${index * 80}ms` }}
      >
        <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-xl">
          <img
            src={event.image}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          {event.isToday && (
            <span className="absolute left-1.5 top-1.5 badge-hoje rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
              Hoje
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          <div>
            <span className={`${event.badgeClass} mb-1.5 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide`}>
              {event.categoryLabel}
            </span>
            <h3 className="truncate text-[15px] font-bold text-foreground font-display leading-tight">
              {event.title}
            </h3>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{event.venue}</p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 text-primary" />
              {formatDate(event.date)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-primary" />
              {event.time}
            </span>
          </div>
        </div>
      </button>
    );
  }

  if (variant === "wide") {
    return (
      <button
        onClick={() => navigate(`/evento/${event.id}`)}
        className="group relative w-full overflow-hidden rounded-2xl text-left card-shadow-lg active:scale-[0.98] transition-transform"
        style={{ animationDelay: `${index * 80}ms` }}
      >
        <div className="relative aspect-[16/9] overflow-hidden">
          <img
            src={event.image}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          <div className="absolute left-4 top-4 flex gap-2">
            {event.isToday && (
              <span className="badge-hoje rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                Hoje
              </span>
            )}
            <span className={`${event.badgeClass} rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider`}>
              {event.categoryLabel}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-lg font-bold text-foreground font-display leading-tight mb-1">
              {event.title}
            </h3>
            <div className="flex items-center gap-3 text-xs text-foreground/70">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {event.venue}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {event.time}
              </span>
            </div>
          </div>
        </div>
      </button>
    );
  }

  // Default vertical card
  return (
    <button
      onClick={() => navigate(`/evento/${event.id}`)}
      className="group w-full overflow-hidden rounded-2xl bg-card text-left transition-all active:scale-[0.97] card-shadow animate-fade-up"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-t-2xl">
        <img
          src={event.image}
          alt={event.title}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {event.isToday && (
            <span className="badge-hoje w-fit rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
              Hoje
            </span>
          )}
          <span className={`${event.badgeClass} w-fit rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider`}>
            {event.categoryLabel}
          </span>
        </div>
      </div>
      <div className="p-3.5">
        <h3 className="mb-1 text-sm font-bold text-foreground font-display leading-tight line-clamp-2">
          {event.title}
        </h3>
        <p className="mb-2.5 text-xs text-muted-foreground">{event.venue}</p>
        <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-primary" />
            {formatDate(event.date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-primary" />
            {event.time}
          </span>
        </div>
      </div>
    </button>
  );
};

export default EventCard;
