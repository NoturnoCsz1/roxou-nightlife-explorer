import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import NotFoundView from "@/components/NotFoundView";
import { trackEvent } from "@/lib/analytics";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, MapPin, ArrowLeft, Bookmark, Sparkles, Pencil } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import ReservationDrawer from "@/components/v3/ReservationDrawer";
import EventPresence from "@/components/v3/EventPresence";
import TransmissionBlock from "@/components/TransmissionBlock";
import { EventLivePresence } from "@/components/v3/EventLivePresence";
import { V3DetailSkeleton } from "@/components/v3/V3Skeletons";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { useSavedEvents } from "@/hooks/useSavedEvents";
import SafeHtml from "@/shared/components/SafeHtml";
import SEO from "@/components/SEO";
import {
  ADMIN_PARTNER_TYPE_OPTIONS,
  PARTNER_MUSIC_STYLE_LABELS,
  SPORTS_COMPETITION_LABELS,
} from "@/lib/categoryConfig";

const PARTNER_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  ADMIN_PARTNER_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);

export default function V3EventDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { isAdmin } = useAdminProfile();
  const { isSaved, toggleSave } = useSavedEvents();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: event, isLoading } = useQuery({
    queryKey: ["v3-event", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("*, partners:partner_id(name, slug, logo_url, type, music_style_primary, music_styles_secondary, supports_sports, sports_competitions)")
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
    // SPA — não podemos entregar HTTP 404 real, mas garantimos noindex,follow
    // via NotFoundView (padrão do projeto) e removemos a página fina anterior.
    return <NotFoundView />;
  }

  const date = new Date(event.date_time);
  const saved = isSaved(event.id);

  const ogImg =
    event.image_url ||
    (event as any).banner_url ||
    (event as any).flyer_url ||
    undefined;

  const canonicalUrl = `https://roxou.com.br/evento/${event.slug}`;
  const cleanDescription =
    event.description?.replace(/<[^>]+>/g, "").trim() || "";
  const seoDescription =
    cleanDescription.slice(0, 155) ||
    `${event.title} — ${event.venue_name || "Presidente Prudente"}`;

  // JSON-LD Event — apenas campos com dado real. Sem offers fictício:
  // omitimos `offers` inteiro quando não há preço/validFrom estruturados
  // no schema atual de events (evita avisos de campos incompletos).
  const partnerRel = (event as any).partners as
    | { name?: string | null; slug?: string | null }
    | null
    | undefined;
  const eventJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: event.date_time,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: canonicalUrl,
    ...(ogImg ? { image: ogImg } : {}),
    ...(cleanDescription ? { description: cleanDescription.slice(0, 500) } : {}),
    location: {
      "@type": "Place",
      name: event.venue_name || partnerRel?.name || "Presidente Prudente",
      address: {
        "@type": "PostalAddress",
        ...(event.address ? { streetAddress: event.address } : {}),
        addressLocality: (event as any).city || "Presidente Prudente",
        addressRegion: "SP",
        addressCountry: "BR",
      },
    },
    ...(partnerRel?.name
      ? {
          organizer: {
            "@type": "Organization",
            name: partnerRel.name,
            ...(partnerRel.slug
              ? { url: `https://roxou.com.br/local/${partnerRel.slug}` }
              : {}),
          },
        }
      : {}),
  };

  return (
    <div className="pb-8">
      <SEO
        title={`${event.title} | Roxou`}
        description={seoDescription}
        canonical={canonicalUrl}
        ogImage={ogImg}
        ogType="article"
        jsonLd={eventJsonLd}
      />

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

        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display font-bold text-2xl text-foreground leading-tight flex-1">{event.title}</h1>
          {/* Botão de edição — visível apenas para admins */}
          {isAdmin && (
            <Link
              to={`/admin/eventos/${event.id}/editar`}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/30 text-xs font-semibold text-primary hover:bg-primary/20 active:scale-95 transition-all"
              title="Editar este evento no painel admin"
            >
              <Pencil className="w-3.5 h-3.5" />
              Editar
            </Link>
          )}
        </div>

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

        {/* CTAs — carona (apenas se habilitado) e/ou ingresso */}
        {(event as any).transport_reservation_enabled && (
          <Button
            onClick={() => setDrawerOpen(true)}
            className="w-full rounded-xl h-12 text-sm font-bold uppercase tracking-wider gap-2 border-0 v3-pulse-glow text-white"
            style={{
              background:
                "linear-gradient(135deg, hsl(var(--v3-neon)), hsl(var(--v3-neon-soft)))",
            }}
          >
            <Sparkles className="w-4 h-4" />
            🚗 Reservar carona
          </Button>
        )}

        {event.ticket_url && (
          <Button
            onClick={async () => {
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
                // fire-and-forget
              }
              window.open(event.ticket_url!, "_blank", "noopener,noreferrer");
            }}
            variant="outline"
            className="w-full rounded-xl h-12 text-sm font-bold uppercase tracking-wider gap-2 border-primary/40 hover:border-primary text-foreground hover:bg-primary/10"
          >
            🎟 Comprar ingresso
          </Button>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <EventLivePresence eventId={event.id} />
        </div>
        <EventPresence eventId={event.id} />

        <TransmissionBlock
          isSportsTransmission={(event as any).is_sports_transmission}
          sportsMatchId={(event as any).sports_match_id}
          channel={(event as any).transmission_channel}
          url={(event as any).transmission_url}
          notes={(event as any).transmission_notes}
        />

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

        {/* Venue chips — derived from partner metadata */}
        {(() => {
          const p: any = (event as any).partners;
          if (!p) return null;
          const typeLabel = p.type ? PARTNER_TYPE_LABELS[p.type] || p.type : null;
          const primary = p.music_style_primary
            ? PARTNER_MUSIC_STYLE_LABELS[p.music_style_primary] || p.music_style_primary
            : null;
          const secondary: string[] = Array.isArray(p.music_styles_secondary)
            ? p.music_styles_secondary
                .slice(0, 2)
                .map((s: string) => PARTNER_MUSIC_STYLE_LABELS[s] || s)
            : [];
          const comps: string[] = Array.isArray(p.sports_competitions)
            ? p.sports_competitions.map((c: string) => SPORTS_COMPETITION_LABELS[c] || c)
            : [];
          const hasAny =
            typeLabel || primary || secondary.length > 0 || p.supports_sports;
          if (!hasAny) return null;
          return (
            <div className="space-y-2">
              <h2 className="font-display font-semibold text-base text-foreground">Sobre o local</h2>
              <div className="flex flex-wrap gap-2">
                {typeLabel && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-card border border-border/40 text-foreground">
                    {typeLabel}
                  </span>
                )}
                {primary && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/15 border border-primary/30 text-primary">
                    🎵 {primary}
                  </span>
                )}
                {secondary.map((s) => (
                  <span
                    key={s}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-primary/10 border border-primary/20 text-primary/90"
                  >
                    {s}
                  </span>
                ))}
                {p.supports_sports && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                    📺 Transmite futebol
                  </span>
                )}
                {p.supports_sports &&
                  comps.map((c) => (
                    <span
                      key={c}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                    >
                      {c}
                    </span>
                  ))}
              </div>
              {p.slug && (
                <Link
                  to={`/local/${p.slug}`}
                  className="inline-block text-xs font-semibold text-primary hover:underline"
                >
                  Ver perfil do local →
                </Link>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
