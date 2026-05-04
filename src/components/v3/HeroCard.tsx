import { Link } from "react-router-dom";
import { CalendarDays, MapPin, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import SmartImage from "@/components/v3/SmartImage";

interface HeroCardProps {
  slug: string;
  title: string;
  imageUrl?: string | null;
  dateTime: string;
  venueName?: string | null;
  category: string;
}

export default function HeroCard({ slug, title, imageUrl, dateTime, venueName, category }: HeroCardProps) {
  const date = new Date(dateTime);

  return (
    <Link to={`/v3/evento/${slug}`} className="block relative rounded-2xl overflow-hidden mx-4 group">
      <div className="relative h-[220px] overflow-hidden">
        <SmartImage
          src={imageUrl}
          alt={title}
          wrapperClassName="absolute inset-0 w-full h-full"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        {/* Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/90 backdrop-blur-sm">
          <Sparkles className="w-3 h-3 text-primary-foreground" />
          <span className="text-[10px] font-bold text-primary-foreground uppercase tracking-wider">Destaque</span>
        </div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">{category}</span>
          <h2 className="font-display font-bold text-xl text-white leading-tight line-clamp-2">{title}</h2>
          <div className="flex items-center gap-3 text-white/70">
            <div className="flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="text-xs capitalize">{format(date, "EEE, d MMM · HH'h'mm", { locale: ptBR })}</span>
            </div>
            {venueName && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span className="text-xs truncate max-w-[140px]">{venueName}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Glow */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-primary/20 blur-2xl rounded-full" />
    </Link>
  );
}
