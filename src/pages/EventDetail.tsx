import { useParams, useNavigate } from "react-router-dom";
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
import EventCard from "@/components/EventCard";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { isToday, formatTime, formatDateFull, formatDay, formatMonthShort } from "@/lib/dateUtils";

const categoryConfig: Record<string, { label: string; badge: string }> = {
  balada: { label: "Balada", badge: "badge-balada" },
  show: { label: "Show", badge: "badge-show" },
  bar: { label: "Bar", badge: "badge-bar" },
  festival: { label: "Festival", badge: "badge-festival" },
  sertanejo: { label: "Sertanejo", badge: "badge-sertanejo" },
  funk: { label: "Funk", badge: "badge-funk" },
  eletronica: { label: "Eletrônica", badge: "badge-eletronica" },
  festa: { label: "Festa", badge: "badge-balada" },
};

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
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("slug", slug!)
        .eq("status", "published")
        .single();
      setEvent(data);

      if (data?.partner_id) {
        const { data: p } = await supabase
          .from("partners")
          .select("*")
          .eq("id", data.partner_id)
          .single();
        setPartner(p);
      }

      // Fetch related events (same category, excluding current)
      if (data) {
        const { data: related } = await supabase
          .from("events")
          .select("*")
          .eq("status", "published")
          .eq("category", data.category)
          .neq("id", data.id)
          .gte("date_time", new Date().toISOString())
          .order("date_time", { ascending: true })
          .limit(4);
        setRelatedEvents(related || []);
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
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground">Evento não encontrado.</p>
        <button
          onClick={() => navigate("/")}
          className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90"
        >
          Voltar ao início
        </button>
      </div>
    );
  }

  const dt = new Date(event.date_time);
  const todayEvent = isToday(dt);
  const cat = categoryConfig[event.category] || {
    label: event.category,
    badge: "bg-secondary",
  };
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
      <SEO
        title={`${event.title} — Evento em Presidente Prudente | ROXOU`}
        description={`${event.title} acontece em ${event.venue_name || "Presidente Prudente"} em Presidente Prudente. Veja informações completas do evento.`}
        canonical={`https://roxou.com.br/evento/${event.slug}`}
        ogImage={event.image_url || "https://roxou.com.br/og-image.png"}
        ogType="article"
      />
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
          {isToday && (
            <span className="badge-hoje rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
              Hoje
            </span>
          )}
          <span
            className={`${cat.badge} rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider`}
          >
            {cat.label}
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

        {/* About event */}
        {event.description && (
          <div className="mb-8">
            <h2 className="mb-3 text-base font-black font-display text-foreground">
              Sobre o evento
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
              {event.description}
            </p>
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

        {/* Related events */}
        {relatedEvents.length > 0 && (
          <div className="mb-4">
            <h2 className="mb-3 text-base font-black font-display text-foreground">
              Eventos relacionados
            </h2>
            <div className="space-y-2.5">
              {relatedEvents.map((e, i) => (
                <EventCard key={e.id} event={e} variant="compact" index={i} />
              ))}
            </div>
          </div>
        )}

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
