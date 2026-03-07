import { Calendar, Clock, MapPin } from "lucide-react";
import { NightEvent } from "@/data/events";
import { useNavigate } from "react-router-dom";

interface EventCardProps {
  event: NightEvent;
  variant?: "default" | "compact";
}

const EventCard = ({ event, variant = "default" }: EventCardProps) => {
  const navigate = useNavigate();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  if (variant === "compact") {
    return (
      <button
        onClick={() => navigate(`/evento/${event.id}`)}
        className="flex gap-3 rounded-lg bg-card p-3 text-left transition-all hover:neon-border w-full"
      >
        <img
          src={event.image}
          alt={event.title}
          className="h-20 w-20 shrink-0 rounded-md object-cover"
        />
        <div className="flex min-w-0 flex-col justify-between py-0.5">
          <div>
            <span className="mb-1 inline-block rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">
              {event.categoryLabel}
            </span>
            <h3 className="truncate text-sm font-semibold text-foreground font-display">
              {event.title}
            </h3>
            <p className="truncate text-xs text-muted-foreground">{event.venue}</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(event.date)}</span>
            <Clock className="h-3 w-3 ml-1" />
            <span>{event.time}</span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={() => navigate(`/evento/${event.id}`)}
      className="group w-full overflow-hidden rounded-xl bg-card text-left transition-all hover:neon-border animate-slide-up"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <img
          src={event.image}
          alt={event.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-primary/90 px-3 py-1 text-[11px] font-semibold text-primary-foreground backdrop-blur-sm">
          {event.categoryLabel}
        </span>
      </div>
      <div className="p-4">
        <h3 className="mb-1 text-base font-bold text-foreground font-display">{event.title}</h3>
        <p className="mb-2 text-sm text-muted-foreground">{event.venue}</p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            {formatDate(event.date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-primary" />
            {event.time}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span className="truncate max-w-[140px]">{event.address.split(" - ")[1] || event.address}</span>
          </span>
        </div>
      </div>
    </button>
  );
};

export default EventCard;
