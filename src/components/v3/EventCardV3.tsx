import { Link } from "react-router-dom";
import { MapPin, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EventCardV3Props {
  slug: string;
  title: string;
  imageUrl?: string | null;
  dateTime: string;
  venueName?: string | null;
  category: string;
  featured?: boolean;
}

export default function EventCardV3({ slug, title, imageUrl, dateTime, venueName, category, featured }: EventCardV3Props) {
  const date = new Date(dateTime);
  const isWide = featured;

  return (
    <Link
      to={`/v3/evento/${slug}`}
      className={`shrink-0 snap-start rounded-xl overflow-hidden bg-card border border-border/40 group transition-transform active:scale-[0.97] ${
        isWide ? "w-[280px]" : "w-[200px]"
      }`}
    >
      <div className={`relative ${isWide ? "h-[160px]" : "h-[130px]"} overflow-hidden`}>
        <img
          src={imageUrl || "/placeholder.svg"}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary/90 text-[10px] font-semibold text-primary-foreground uppercase tracking-wide">
          {category}
        </span>
      </div>
      <div className="p-3 space-y-1.5">
        <h3 className="font-display font-semibold text-sm text-foreground line-clamp-2 leading-tight">{title}</h3>
        <div className="flex items-center gap-1 text-muted-foreground">
          <CalendarDays className="w-3 h-3 shrink-0" />
          <span className="text-[11px] capitalize">
            {format(date, "EEE, d MMM · HH'h'mm", { locale: ptBR })}
          </span>
        </div>
        {venueName && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="text-[11px] truncate">{venueName}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
