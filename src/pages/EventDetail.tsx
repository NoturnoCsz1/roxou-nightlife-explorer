import { useParams, useNavigate, Link } from "react-router-dom";
import NotFoundView from "@/components/NotFoundView";
import DesktopNav from "@/components/DesktopNav";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Bookmark,
  Share2,
  Instagram,
  MessageCircle,
  Navigation,
  ExternalLink,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { usePageTracking } from "@/hooks/usePageTracking";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  fetchPublishedEventBySlug,
  fetchSimilarByCategory,
  fetchSimilarByDate,
} from "@modules/discovery/events";
import { fetchVenueById } from "@modules/discovery/venues";
import EventCard from "@/components/EventCard";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import AdBanner from "@/components/AdBanner";
import EventCountdown from "@/components/EventCountdown";
import { isToday, formatTime, formatDateFull, formatDay, formatMonthShort } from "@/lib/dateUtils";
import { generateICS, downloadICS } from "@/shared/utils/calendarUtils";
import {
  categoryConfig,
  getCategoryLabel,
  ADMIN_PARTNER_TYPE_OPTIONS,
  PARTNER_MUSIC_STYLE_LABELS,
  SPORTS_COMPETITION_LABELS,
} from "@/lib/categoryConfig";
import SafeHtml from "@/shared/components/SafeHtml";
import TransmissionBlock from "@/components/TransmissionBlock";

const EventDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Tables<"events"> | null>(null);
  const [partner, setPartner] = useState<Tables<"partners"> | null>(null);
  const [relatedEvents, setRelatedEvents] = useState<Tables<"events">[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  usePageTracking({ event_id: event?.id });

  useEffect(() => {
    async function load() {
      const data = await fetchPublishedEventBySlug(slug!);
      setEvent(data);

      if (data?.partner_id) {
        const p = await fetchVenueById(data.partner_id);
        setPartner(p);
      }

      // Fetch similar events (same category or same date, excluding current)
      if (data) {
        const eventDate = data.date_time.split("T")[0];
        const [byCat, byDate] = await Promise.all([
          fetchSimilarByCategory(data.id, data.category, 4),
          fetchSimilarByDate(data.id, eventDate, 4),
        ]);
        // Merge and deduplicate, limit to 4
        const seen = new Set<string>();
        const merged: Tables<"events">[] = [];
        for (const e of [...byCat, ...byDate]) {
          if (!seen.has(e.id)) {
            seen.add(e.id);
            merged.push(e);
          }
          if (merged.length >= 4) break;
        }
        setRelatedEvents(merged);
      }

      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Carregando evento...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    // Slug não encontrado: redireciona para /agenda (SPA fallback).
    // Em servidor próprio, configurar 301 real para /evento/* não encontrado → /agenda.
    return <Navigate to="/agenda" replace />;
  }

  const dt = new Date(event.date_time);
  const todayEvent = isToday(dt);
  const cat = categoryConfig[event.category] || {
    label: event.category,
    badge: "bg-secondary",
  };
  const catLabel = getCategoryLabel(event.category, (event as any).sub_category);
  const image = event.image_url || "/placeholder.svg";
  const time = formatTime(dt);
  const dateFormatted = formatDateFull(dt);
  const dayNumber = formatDay(dt);
  const monthShort = formatMonthShort(dt);

  const handleSave = () => {
    setSaved(!saved);
    toast(saved ? "Evento removido dos salvos" : "Evento salvo! ✨");
  };

  const handleShare = async () => {
    const shareData = {
      title: event.title,
      text: `${event.title} — ${dateFormatted} às ${time}`,
      url: window.location.href,
    };
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast("Link copiado! 🔗");
    }
  };

  const handleWhatsAppShare = () => {
    const text = `🎉 *${event.title}*\n📅 ${dateFormatted} às ${time}\n📍 ${event.venue_name || "Presidente Prudente"}\n\nVeja mais: ${window.location.href}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const instagramUrl =
    partner?.instagram || event.instagram
      ? `https://instagram.com/${(partner?.instagram || event.instagram || "").replace("@", "")}`
      : null;

  const whatsappUrl = partner?.whatsapp
    ? `https://wa.me/${partner.whatsapp.replace(/\D/g, "")}`
    : null;

  const mapsUrl = event.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address + (event.venue_name ? `, ${event.venue_name}` : ""))}`
    : null;

  return (
    <div className="min-h-screen bg-background">
      <DesktopNav />
      <SEO
        title={`${event.title} — ${dateFormatted} em ${event.venue_name || "Presidente Prudente"} | ROXOU`}
        description={`${event.title} acontece ${dateFormatted} às ${time} em ${event.venue_name || "Presidente Prudente"}. Veja local, horário, como chegar e ingressos.`}
        canonical={`https://roxou.com.br/evento/${event.slug}`}
        ogImage={event.image_url || (event as any).banner_url || (event as any).flyer_url || "https://roxou.com.br/og-image.png"}
        ogType="article"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Event",
          name: event.title,
          description: event.description || `${event.title} em Presidente Prudente.`,
          startDate: event.date_time,
          eventStatus: "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          image: event.image_url || "https://roxou.com.br/og-image.png",
          location: {
            "@type": "Place",
            name: event.venue_name || "Presidente Prudente",
            address: {
              "@type": "PostalAddress",
              streetAddress: event.address || "",
              addressLocality: "Presidente Prudente",
              addressRegion: "SP",
              addressCountry: "BR",
            },
          },
          ...(partner
            ? {
                organizer: {
                  "@type": "Organization",
                  name: partner.name,
                  url: `https://roxou.com.br/local/${partner.slug}`,
                },
              }
            : {}),
          ...((event as any).ticket_url ? { offers: { "@type": "Offer", url: (event as any).ticket_url, availability: "https://schema.org/InStock" } } : {}),
        }}
      />
      {/* BreadcrumbList */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "ROXOU", item: "https://roxou.com.br" },
          ...(partner ? [{ "@type": "ListItem", position: 2, name: partner.name, item: `https://roxou.com.br/local/${partner.slug}` }] : []),
          { "@type": "ListItem", position: partner ? 3 : 2, name: event.title, item: `https://roxou.com.br/evento/${event.slug}` },
        ],
      }) }} />
      {/* Hero image */}
      <div className="relative">
        <img
          src={image}
          alt={event.title}
          className="aspect-[3/4] w-full max-h-[70vh] object-cover sm:aspect-[16/10] sm:max-h-[60vh]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/20" />

        {/* Top bar */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full glass p-2.5 text-foreground transition hover:neon-border"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className={`rounded-full glass p-2.5 transition hover:neon-border ${saved ? "text-primary" : "text-foreground"}`}
            >
              <Bookmark className={`h-5 w-5 ${saved ? "fill-current" : ""}`} />
            </button>
            <button
              onClick={handleShare}
              className="rounded-full glass p-2.5 text-foreground transition hover:neon-border"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Badges */}
        <div className="absolute left-4 bottom-20 flex gap-2">
          {todayEvent && (
            <span className="badge-hoje rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
              Hoje
            </span>
          )}
          <span
            className={`${cat.badge} rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider`}
          >
            {catLabel}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl -mt-16 relative z-10 px-4 pb-8">
        {/* Title block */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-foreground font-display neon-text mb-2 leading-tight">
            {event.title}
          </h1>
          {/* Calendar save button */}
          <button
            onClick={() => {
              const ics = generateICS({
                title: event.title,
                dateTime: event.date_time,
                venue: event.venue_name,
                address: event.address,
                description: event.description,
                url: `https://roxou.com.br/evento/${event.slug}`,
              });
              downloadICS(event.slug, ics);
              toast("Evento salvo na agenda ✅");
            }}
            className="flex items-center justify-center gap-2 w-full rounded-2xl gradient-primary py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 active:scale-[0.98] mb-3 card-shadow"
          >
            📅 Salvar na agenda
          </button>
          {event.venue_name && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              {partner ? (
                <button onClick={() => navigate(`/local/${partner.slug}`)} className="text-primary hover:underline">{event.venue_name}</button>
              ) : (
                event.venue_name
              )}
              {event.address && (
                <span className="text-muted-foreground/60"> · Presidente Prudente</span>
              )}
            </p>
          )}
          <EventCountdown dateTime={event.date_time} />
        </div>

        {/* Date & time card */}
        <div className="flex items-center gap-4 rounded-2xl bg-card p-4 card-shadow mb-3">
          <div className="flex h-14 w-14 flex-col items-center justify-center rounded-xl gradient-primary shrink-0">
            <span className="text-lg font-black text-primary-foreground leading-none">
              {dayNumber}
            </span>
            <span className="text-[10px] font-bold text-primary-foreground/80 uppercase">
              {monthShort}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground capitalize">
              {dateFormatted}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3 text-primary" />
              {time} · Horário de início
            </p>
          </div>
        </div>

        <div className="mb-3">
          <TransmissionBlock
            isSportsTransmission={(event as any).is_sports_transmission}
            sportsMatchId={(event as any).sports_match_id}
            channel={(event as any).transmission_channel}
            url={(event as any).transmission_url}
            notes={(event as any).transmission_notes}
          />
        </div>


        {/* Location card */}
        <div className="flex items-center gap-4 rounded-2xl bg-card p-4 card-shadow mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl gradient-primary shrink-0">
            <MapPin className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {event.venue_name}
            </p>
            {event.address && (
              <p className="text-xs text-muted-foreground truncate">
                {event.address}
              </p>
            )}
          </div>
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-xl bg-secondary p-2.5 text-muted-foreground transition hover:text-primary hover:neon-border"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2.5 mb-8">
          {instagramUrl ? (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 rounded-2xl bg-card p-4 card-shadow transition hover:neon-border active:scale-95"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(340,80%,55%)] to-[hsl(270,80%,55%)]">
                <Instagram className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-[11px] font-semibold text-foreground">
                Instagram
              </span>
            </a>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-card/50 p-4 opacity-40">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary">
                <Instagram className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground">
                Instagram
              </span>
            </div>
          )}

          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 rounded-2xl bg-card p-4 card-shadow transition hover:neon-border active:scale-95"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(142,70%,40%)]">
                <MessageCircle className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-[11px] font-semibold text-foreground">
                WhatsApp
              </span>
            </a>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-card/50 p-4 opacity-40">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary">
                <MessageCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground">
                WhatsApp
              </span>
            </div>
          )}

          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 rounded-2xl bg-card p-4 card-shadow transition hover:neon-border active:scale-95"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(210,80%,50%)]">
                <Navigation className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-[11px] font-semibold text-foreground">
                Como chegar
              </span>
            </a>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-card/50 p-4 opacity-40">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary">
                <Navigation className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground">
                Como chegar
              </span>
            </div>
          )}
        </div>

        {/* Event info summary card */}
        <div className="mb-6 rounded-xl bg-secondary/30 p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Calendar className="h-4 w-4 text-primary shrink-0" />
            <span className="font-semibold capitalize">{dateFormatted}</span>
            <span className="text-foreground/60">·</span>
            <span>{time}</span>
          </div>
          {event.venue_name && (
            <div className="flex items-center gap-2 text-sm text-foreground">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <span>{event.venue_name}</span>
            </div>
          )}
          {event.address && (
            <div className="flex items-center gap-2 text-sm text-foreground/80">
              <Navigation className="h-4 w-4 text-primary shrink-0" />
              <span>{event.address}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-foreground/80">
            <span className={`${cat.badge} rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider`}>
              {catLabel}
            </span>
          </div>
        </div>

        {/* CTA carona — apenas quando o evento habilitar reserva de transporte */}
        {(event as any).transport_reservation_enabled && (
          <a
            href={`/transporte?event=${encodeURIComponent(event.slug)}`}
            className="flex items-center justify-center gap-2 w-full rounded-2xl gradient-primary py-3.5 px-6 text-sm font-bold text-primary-foreground transition hover:opacity-90 active:scale-[0.98] mb-3 card-shadow"
          >
            🚗 Reservar carona
          </a>
        )}

        {/* Ticket / ingresso */}
        {(event as any).ticket_url && (
          <button
            onClick={async () => {
              try {
                await supabase.from("ticket_clicks").insert({ event_id: event.id });
              } catch {}
              window.open((event as any).ticket_url, "_blank", "noopener,noreferrer");
            }}
            className="flex items-center justify-center gap-2 w-full rounded-2xl border border-primary/40 bg-background/40 py-3.5 px-6 text-sm font-bold text-foreground transition hover:bg-primary/10 active:scale-[0.98] mb-6"
          >
            <ExternalLink className="h-4 w-4" />
            🎟 Comprar ingresso
          </button>
        )}

        {/* Ad banner */}
        <AdBanner adSlot="1234567890" className="mb-6" />

        {/* About event */}
        {event.description && (
          <div className="mb-8">
            <h2 className="mb-3 text-base font-black font-display text-foreground">
              Sobre o evento
            </h2>
            <SafeHtml
              html={event.description}
              className="text-sm leading-relaxed text-foreground/90 space-y-2 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_strong]:text-foreground"
            />
          </div>
        )}

        {/* Partner / Venue info */}
        {partner && (
          <div className="mb-8">
            <h2 className="mb-3 text-base font-black font-display text-foreground">
              Sobre o local
            </h2>
            <button onClick={() => navigate(`/local/${partner.slug}`)} className="rounded-2xl bg-card p-4 card-shadow w-full text-left transition hover:neon-border">
              <div className="flex items-center gap-3 mb-3">
                {partner.logo_url ? (
                  <img
                    src={partner.logo_url}
                    alt={partner.name}
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary text-sm font-bold text-primary-foreground">
                    {partner.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {partner.name}
                  </p>
                  {partner.type && (
                    <p className="text-[11px] text-muted-foreground capitalize">
                      {partner.type}
                    </p>
                  )}
                </div>
              </div>
              {(() => {
                const typeLabel = partner.type
                  ? ADMIN_PARTNER_TYPE_OPTIONS.find((o) => o.value === partner.type)?.label || partner.type
                  : null;
                const primary = (partner as any).music_style_primary
                  ? PARTNER_MUSIC_STYLE_LABELS[(partner as any).music_style_primary] || (partner as any).music_style_primary
                  : null;
                const secondary: string[] = Array.isArray((partner as any).music_styles_secondary)
                  ? (partner as any).music_styles_secondary
                      .slice(0, 2)
                      .map((s: string) => PARTNER_MUSIC_STYLE_LABELS[s] || s)
                  : [];
                const supportsSports = Boolean((partner as any).supports_sports);
                const comps: string[] = Array.isArray((partner as any).sports_competitions)
                  ? (partner as any).sports_competitions.map(
                      (c: string) => SPORTS_COMPETITION_LABELS[c] || c,
                    )
                  : [];
                const hasAny = typeLabel || primary || secondary.length > 0 || supportsSports;
                if (!hasAny) return null;
                return (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {typeLabel && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted/40 border border-border/40 text-foreground">
                        {typeLabel}
                      </span>
                    )}
                    {primary && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/15 border border-primary/30 text-primary">
                        🎵 {primary}
                      </span>
                    )}
                    {secondary.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 border border-primary/20 text-primary/90"
                      >
                        {s}
                      </span>
                    ))}
                    {supportsSports && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-500">
                        📺 Transmite futebol
                      </span>
                    )}
                    {supportsSports &&
                      comps.map((c) => (
                        <span
                          key={c}
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-500/90"
                        >
                          {c}
                        </span>
                      ))}
                  </div>
                );
              })()}
              {partner.full_description && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {partner.full_description}
                </p>
              )}
              {!partner.full_description && partner.short_description && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {partner.short_description}
                </p>
              )}
              {partner.address && (
                <p className="text-xs text-muted-foreground/60 mt-2 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {partner.address}
                </p>
              )}
            </button>
          </div>
        )}

        {/* Aviso de evento encerrado */}
        {dt.getTime() < Date.now() && !todayEvent && (
          <div className="mb-4 rounded-2xl border border-border/40 bg-card/60 p-4 card-shadow">
            <h2 className="text-sm font-bold text-foreground">Este evento já aconteceu</h2>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              A Roxou mantém esta página como registro da agenda de eventos em Presidente Prudente. Confira abaixo outras opções parecidas ou veja a agenda atualizada.
            </p>
            <Link
              to="/agenda"
              className="mt-3 inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Ver agenda atualizada →
            </Link>
          </div>
        )}

        {/* Related events */}
        {relatedEvents.length > 0 && (
          <div className="mb-4">
            <h2 className="mb-3 text-base font-black font-display text-foreground">
              Eventos parecidos
            </h2>
            <div className="space-y-2.5">
              {relatedEvents.map((e, i) => (
                <EventCard key={e.id} event={e} variant="compact" index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Links internos para reduzir Soft 404 */}
        <div className="mb-4">
          <h2 className="mb-3 text-sm font-bold text-foreground">Explore na Roxou</h2>
          <div className="flex flex-wrap gap-2">
            <Link to="/agenda" className="rounded-xl bg-card px-3 py-2 text-xs font-semibold text-foreground card-shadow hover:text-primary transition-colors">Agenda</Link>
            <Link to="/o-que-fazer-em-presidente-prudente-hoje" className="rounded-xl bg-card px-3 py-2 text-xs font-semibold text-foreground card-shadow hover:text-primary transition-colors">O que fazer hoje</Link>
            <Link to="/musica-ao-vivo-em-presidente-prudente" className="rounded-xl bg-card px-3 py-2 text-xs font-semibold text-foreground card-shadow hover:text-primary transition-colors">Música ao vivo</Link>
            <Link to="/baladas-em-presidente-prudente" className="rounded-xl bg-card px-3 py-2 text-xs font-semibold text-foreground card-shadow hover:text-primary transition-colors">Baladas</Link>
            <Link to="/bares-em-presidente-prudente" className="rounded-xl bg-card px-3 py-2 text-xs font-semibold text-foreground card-shadow hover:text-primary transition-colors">Bares</Link>
            {partner?.slug && (
              <Link to={`/local/${partner.slug}`} className="rounded-xl bg-card px-3 py-2 text-xs font-semibold text-foreground card-shadow hover:text-primary transition-colors">{partner.name || "Local"}</Link>
            )}
          </div>
        </div>


        {/* Bottom CTA */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={handleSave}
            className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold transition-all active:scale-95 ${
              saved
                ? "gradient-primary text-primary-foreground neon-glow"
                : "bg-card text-foreground card-shadow hover:neon-border"
            }`}
          >
            <Bookmark
              className={`h-5 w-5 ${saved ? "fill-current" : ""}`}
            />
            {saved ? "Salvo" : "Salvar"}
          </button>
          <button
            onClick={handleWhatsAppShare}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[hsl(142,70%,40%)] py-4 text-sm font-bold text-primary-foreground transition-all active:scale-95 hover:opacity-90"
          >
            <MessageCircle className="h-5 w-5" />
            WhatsApp
          </button>
          <button
            onClick={handleShare}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl gradient-primary py-4 text-sm font-bold text-primary-foreground transition-all active:scale-95 neon-glow"
          >
            <Share2 className="h-5 w-5" />
            Compartilhar
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default EventDetail;
