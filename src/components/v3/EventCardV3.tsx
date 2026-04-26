import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, CalendarDays, Sparkles, Heart } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ReservationDrawer from "@/components/v3/ReservationDrawer";
import { useSavedEvents } from "@/hooks/useSavedEvents";

interface EventCardV3Props {
  slug: string;
  title: string;
  imageUrl?: string | null;
  dateTime: string;
  venueName?: string | null;
  category: string;
  featured?: boolean;
  ticketUrl?: string | null;
}

export default function EventCardV3({
  slug,
  title,
  imageUrl,
  dateTime,
  venueName,
  category,
  featured,
  ticketUrl,
}: EventCardV3Props) {
  const date = new Date(dateTime);
  const isWide = featured;
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { isSaved, toggleSave } = useSavedEvents();

  const goDetail = () => navigate(`/v3/evento/${slug}`);

  return (
    <>
      <div
        className={`shrink-0 snap-start rounded-2xl overflow-hidden v3-glass v3-neon-hover group ${
          isWide ? "w-[280px]" : "w-[200px]"
        }`}
      >
        {/* Image area — clicking goes to detail */}
        <button
          type="button"
          onClick={goDetail}
          className={`relative w-full ${isWide ? "h-[160px]" : "h-[130px]"} overflow-hidden block`}
        >
          <img
            src={imageUrl || "/placeholder.svg"}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary/90 text-[10px] font-semibold text-primary-foreground uppercase tracking-wide">
            {category}
          </span>
          <button
            type="button"
            aria-label={isSaved(slug) ? "Remover dos favoritos" : "Favoritar evento"}
            onClick={(e) => {
              e.stopPropagation();
              toggleSave(slug);
            }}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/65 backdrop-blur-md border border-border/40 flex items-center justify-center transition-all active:scale-90"
          >
            <Heart className={`w-4 h-4 ${isSaved(slug) ? "text-primary fill-primary" : "text-foreground"}`} />
          </button>
        </button>

        <div className="p-3 space-y-1.5">
          <button type="button" onClick={goDetail} className="text-left w-full">
            <h3 className="font-display font-semibold text-sm text-foreground line-clamp-2 leading-tight">
              {title}
            </h3>
          </button>
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

          {/* Reserve CTA — opens drawer */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDrawerOpen(true);
            }}
            className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-bold uppercase tracking-wider text-white v3-neon-hover"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--v3-neon) / 0.9), hsl(var(--v3-neon-soft) / 0.9))",
            }}
          >
            <Sparkles className="w-3 h-3" />
            Reservar
          </button>
        </div>
      </div>

      <ReservationDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        eventTitle={title}
        eventSlug={slug}
        ticketUrl={ticketUrl}
        venueName={venueName}
        eventDate={dateTime}
        imageUrl={imageUrl}
      />
    </>
  );
}
