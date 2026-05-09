import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, MapPin, ArrowLeft, Bookmark, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import ReservationDrawer from "@/components/v3/ReservationDrawer";
import EventPresence from "@/components/v3/EventPresence";
import { EventLivePresence } from "@/components/v3/EventLivePresence";
import { V3DetailSkeleton } from "@/components/v3/V3Skeletons";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSavedEvents } from "@/hooks/useSavedEvents";
import SafeHtml from "@/components/SafeHtml";

export default function V3EventDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { isSaved, toggleSave } = useSavedEvents();
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  useEffect(() => {
    if (!event?.id) return;
    try {
      trackEvent({
        event_type: "event_view",
        event_id: event.id,
        venue_id: event.partner_id || null,
        category: event.category || null,
        city: event.city || null,
        metadata: {
          slug: event.slug,
          title: event.title,
          venue_name: event.venue_name,
        },
      });
    } catch {
      // fire-and-forget; nunca quebra render
    }
  }, [event?.id]);

  if (isLoading) {
    return <V3DetailSkeleton />;
  }

  if (!event) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Evento não encontrado</p>
        <Link to="/" className="text-primary text-sm mt-2 inline-block">Voltar</Link>
      </div>
    );
  }

  const date = new Date(event.date_time);
  const saved = isSaved(event.id);

  return (
    <div className="pb-8">
      {/* Image */}
      <div className="relative h-[260px] overflow-hidden">
        <img src={event.image_url || "/placeholder.svg"} alt={event.title} className="w-full h-full object-cover" fetchPriority="high" decoding="async" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute top-4 left-4 right-4 flex justify-between">
          <Link to="/" className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-white" />
          </Link>
          {user && (
            <button
              onClick={() => toggleSave(event.id)}
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
            >
              <Bookmark className={`w-4 h-4 ${saved ? "text-primary fill-primary" : "text-white"}`} />
            </button>
          )}
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

        {/* Reserve CTA — opens drawer with both options */}
        <Button
          onClick={() => setDrawerOpen(true)}
          className="w-full rounded-xl h-12 text-sm font-bold uppercase tracking-wider gap-2 border-0 v3-pulse-glow text-white"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--v3-neon)), hsl(var(--v3-neon-soft)))",
          }}
        >
          <Sparkles className="w-4 h-4" />
          Reservar agora
        </Button>

        <div className="flex items-center gap-2 flex-wrap">
          <EventLivePresence eventId={event.id} />
        </div>
        <EventPresence eventId={event.id} />

        <ReservationDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          eventTitle={event.title}
          eventSlug={event.slug}
          ticketUrl={event.ticket_url}
          venueName={event.venue_name}
          eventDate={event.date_time}
          imageUrl={event.image_url}
          onTicketClick={() => {
            try {
              trackEvent({
                event_type: "ticket_click",
                event_id: event.id,
                venue_id: event.partner_id || null,
                category: event.category || null,
                city: event.city || null,
                metadata: {
                  slug: event.slug,
                  title: event.title,
                  venue_name: event.venue_name,
                  ticket_url: event.ticket_url,
                },
              });
            } catch {
              // fire-and-forget; nunca bloqueia navegação
            }
          }}
        />
        {/* Description */}
        {event.description && (
          <div className="space-y-2">
            <h2 className="font-display font-semibold text-base text-foreground">Sobre</h2>
            <SafeHtml
              html={event.description}
              className="text-sm text-muted-foreground leading-relaxed [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_strong]:text-foreground"
            />
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
