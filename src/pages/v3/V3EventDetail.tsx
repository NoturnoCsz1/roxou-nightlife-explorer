import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, MapPin, ExternalLink, ArrowLeft, Bookmark } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import TransportCTA from "@/components/v3/TransportCTA";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSavedEvents } from "@/hooks/useSavedEvents";

export default function V3EventDetail() {
  const { slug } = useParams<{ slug: string }>();

  const { data: event, isLoading } = useQuery({
    queryKey: ["v3-event", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("*, partners:partner_id(name, slug, logo_url)")
        .eq("slug", slug!)
        .eq("status", "published")
        .maybeSingle();
      return data;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Evento não encontrado</p>
        <Link to="/v3" className="text-primary text-sm mt-2 inline-block">Voltar</Link>
      </div>
    );
  }

  const date = new Date(event.date_time);

  return (
    <div className="pb-8">
      {/* Image */}
      <div className="relative h-[260px] overflow-hidden">
        <img src={event.image_url || "/placeholder.svg"} alt={event.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute top-4 left-4 right-4 flex justify-between">
          <Link to="/v3" className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-white" />
          </Link>
          <button className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <Share2 className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      <div className="px-4 -mt-8 relative space-y-4">
        {/* Category badge */}
        <span className="inline-block px-3 py-1 rounded-full bg-primary/90 text-[11px] font-bold text-primary-foreground uppercase tracking-wider">
          {event.category}
        </span>

        <h1 className="font-display font-bold text-2xl text-foreground leading-tight">{event.title}</h1>

        {/* Meta */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="w-4 h-4 text-primary" />
            <span className="text-sm capitalize">{format(date, "EEEE, d 'de' MMMM · HH'h'mm", { locale: ptBR })}</span>
          </div>
          {event.venue_name && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm">{event.venue_name}</span>
            </div>
          )}
        </div>

        {/* Ticket */}
        {event.ticket_url && (
          <a href={event.ticket_url} target="_blank" rel="noopener noreferrer">
            <Button className="w-full rounded-xl h-12 text-sm font-semibold gap-2">
              <ExternalLink className="w-4 h-4" />
              Comprar ingresso
            </Button>
          </a>
        )}

        {/* Transport CTA */}
        <TransportCTA eventName={event.title} venueName={event.venue_name || undefined} eventDate={event.date_time} />

        {/* Description */}
        {event.description && (
          <div className="space-y-2">
            <h2 className="font-display font-semibold text-base text-foreground">Sobre</h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{event.description}</p>
          </div>
        )}

        {/* Address */}
        {event.address && (
          <div className="space-y-2">
            <h2 className="font-display font-semibold text-base text-foreground">Local</h2>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-xl bg-card border border-border/40 text-sm text-muted-foreground hover:border-primary/30 transition-colors"
            >
              📍 {event.address}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
