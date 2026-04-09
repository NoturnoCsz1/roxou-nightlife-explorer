import { Calendar, Clock, MapPin, Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatTime, formatDateShort, isToday } from "@/lib/dateUtils";
import { categoryConfig } from "@/lib/categoryConfig";

export interface SupabaseEvent {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  date_time: string;
  category: string;
  venue_name: string | null;
  address: string | null;
  instagram: string | null;
  image_url: string | null;
  featured: boolean;
  status: string;
  partner_id: string | null;
  partner_slug?: string | null;
}

interface EventCardProps {
  event: SupabaseEvent;
  variant?: "default" | "compact" | "wide";
  index?: number;
  sponsored?: boolean;
}

const EventCard = ({ event, variant = "default", index = 0, sponsored = false }: EventCardProps) => {
  const navigate = useNavigate();
  const dt = new Date(event.date_time);
  const todayEvent = isToday(dt);
  const cat = categoryConfig[event.category] || { label: event.category, badge: "bg-secondary" };
  const image = event.image_url || "/placeholder.svg";
  const venue = event.venue_name || "";
  const venueLink = event.partner_slug ? `/local/${event.partner_slug}` : null;
  const time = formatTime(dt);

  const formatDate = () => formatDateShort(dt);

  if (variant === "compact") {
    return (
      <button
        onClick={() => navigate(`/evento/${event.slug}`)}
        className="flex gap-4 rounded-2xl bg-card p-3 text-left transition-all active:scale-[0.98] card-shadow group w-full md:hover:neon-border md:hover:-translate-y-0.5 md:hover:shadow-[0_12px_40px_hsl(0_0%_0%/0.5)] duration-300"
        style={{ animationDelay: `${index * 80}ms` }}
      >
        <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-xl">
          <img src={image} alt={event.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
          {sponsored && <span className="absolute right-1.5 top-1.5 rounded-md bg-amber-500/90 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white">Ad</span>}
          {todayEvent && <span className="absolute left-1.5 top-1.5 badge-hoje rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">Hoje</span>}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          <div>
            <span className={`${cat.badge} mb-1.5 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide`}>{cat.label}</span>
            <h3 className="truncate text-[15px] font-bold text-foreground font-display leading-tight md:group-hover:text-primary transition-colors duration-200">{event.title}</h3>
            {venueLink ? (
              <p className="mt-0.5 truncate text-xs text-primary hover:underline" onClick={(e) => { e.stopPropagation(); navigate(venueLink); }}>{venue}</p>
            ) : (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{venue}</p>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-primary" />{formatDate()}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-primary" />{time}</span>
          </div>
        </div>
      </button>
    );
  }

  if (variant === "wide") {
    return (
      <button
        onClick={() => navigate(`/evento/${event.slug}`)}
        className="group relative w-full overflow-hidden rounded-2xl text-left card-shadow-lg active:scale-[0.98] transition-all duration-300 md:hover:-translate-y-1 md:hover:shadow-[0_20px_60px_hsl(0_0%_0%/0.6)] md:hover:neon-border"
        style={{ animationDelay: `${index * 80}ms` }}
      >
        <div className="relative aspect-[16/9] overflow-hidden">
          <img src={image} alt={event.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          <div className="absolute left-4 top-4 flex gap-2">
            {sponsored && (
              <span className="rounded-lg bg-amber-500/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white flex items-center gap-1">
                <Megaphone className="h-3 w-3" /> Patrocinado
              </span>
            )}
            {todayEvent && <span className="badge-hoje rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">Hoje</span>}
            <span className={`${cat.badge} rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider`}>{cat.label}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-lg font-bold text-foreground font-display leading-tight mb-1 md:group-hover:text-primary transition-colors duration-200">{event.title}</h3>
            <div className="flex items-center gap-3 text-xs text-foreground/70">
              <span className={`flex items-center gap-1 ${venueLink ? "text-primary hover:underline" : ""}`} onClick={venueLink ? (e) => { e.stopPropagation(); navigate(venueLink); } : undefined}><MapPin className="h-3 w-3" />{venue}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{time}</span>
            </div>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={() => navigate(`/evento/${event.slug}`)}
      className="group w-full overflow-hidden rounded-2xl bg-card text-left transition-all active:scale-[0.97] card-shadow animate-fade-up duration-300 md:hover:-translate-y-1.5 md:hover:neon-border md:hover:shadow-[0_16px_48px_hsl(0_0%_0%/0.55)]"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-t-2xl">
        <img src={image} alt={event.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {sponsored && (
            <span className="w-fit rounded-lg bg-amber-500/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white flex items-center gap-1">
              <Megaphone className="h-3 w-3" /> Patrocinado
            </span>
          )}
          {todayEvent && <span className="badge-hoje w-fit rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">Hoje</span>}
          <span className={`${cat.badge} w-fit rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider`}>{cat.label}</span>
        </div>
      </div>
      <div className="p-3.5">
        <h3 className="mb-1 text-sm font-bold text-foreground font-display leading-tight line-clamp-2 md:group-hover:text-primary transition-colors duration-200">{event.title}</h3>
        {venueLink ? (
          <p className="mb-2.5 text-xs text-primary hover:underline" onClick={(e) => { e.stopPropagation(); navigate(venueLink); }}>{venue}</p>
        ) : (
          <p className="mb-2.5 text-xs text-muted-foreground">{venue}</p>
        )}
        <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-primary" />{formatDate()}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-primary" />{time}</span>
        </div>
      </div>
    </button>
  );
};

export default EventCard;
