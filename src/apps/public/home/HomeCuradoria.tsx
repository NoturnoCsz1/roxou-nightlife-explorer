// ─── PremiumEventCard — card editorial reutilizado em rails e bento ───
// Extraído de src/pages/v3/V3Home.tsx (Fase 5). JSX, classes e estados idênticos.

import { useState } from "react";
import { Link } from "react-router-dom";
import { Car, Clock, Heart, MapPin, Sparkles } from "lucide-react";
import SmartImage from "@/components/v3/SmartImage";
import ReservationDrawer from "@/components/v3/ReservationDrawer";
import { useSavedEvents } from "@/hooks/useSavedEvents";
import type { Ev } from "./types";
import { fmtDateFull, fmtTime, getDayLabel, isEventLive } from "./utils";

export function PremiumEventCard({ ev, size = "md", premium, isTrending, partnerRank, timeline, className }: {
  ev: Ev; size?: "md" | "lg"; premium?: boolean; isTrending?: boolean; partnerRank?: number; timeline?: boolean; className?: string;
}) {
  const isLg = size === "lg";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { isSaved, toggleSave } = useSavedEvents();
  const saved = isSaved(ev.id);
  const badge = premium ? "⭐ Premium"
    : isTrending ? "🔥 Em alta"
    : partnerRank && partnerRank <= 3 ? `📈 #${partnerRank} hoje` : null;
  const live = isEventLive(ev.date_time);
  // ref para silenciar lint quando isLg não é usado em alguns paths
  void isLg;

  return (
    <>
      <div
        className={`${className || ""} ${timeline ? "w-full" : "shrink-0 snap-start"} relative rounded-3xl overflow-hidden v3-glass v3-neon-hover group transition-all duration-300 hover:scale-105 active:scale-[0.97] ${
          premium ? "border-primary/40 neon-border" : ""
        } ${timeline ? "min-h-[178px]" : isLg ? "w-[260px] min-h-[320px]" : "w-[190px] min-h-[260px]"}`}
        style={{
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.05), 0 0 8px hsl(var(--primary) / 0.10), 0 8px 24px rgba(0,0,0,0.4)",
        }}
      >
        <Link to={`/evento/${ev.slug}`} className="absolute inset-0 block">
          <div className="absolute inset-0 overflow-hidden">
            <SmartImage
              src={ev.image_url}
              alt={ev.title}
              wrapperClassName="absolute inset-0 w-full h-full"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/35 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/10" />
            <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-3xl pointer-events-none group-hover:ring-primary/60 transition-colors" />
            {live && (
              <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-400/45 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300 backdrop-blur-md z-10">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_hsl(142_71%_45%)]" />
                Começou
              </span>
            )}
            <span className={`absolute ${live ? "top-9" : "top-2"} left-2 px-1.5 py-0.5 rounded-full bg-primary/95 text-[9px] font-bold text-primary-foreground uppercase tracking-wide`}>
              {getDayLabel(ev.date_time)}
            </span>
            <button
              type="button"
              aria-label={saved ? "Remover dos favoritos" : "Favoritar evento"}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleSave(ev.id);
              }}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/55 backdrop-blur-sm border border-border/30 flex items-center justify-center transition-all active:scale-90"
            >
              <Heart className={`w-4 h-4 ${saved ? "text-primary fill-primary" : "text-foreground"}`} />
            </button>
          </div>
          <div
            className="absolute bottom-0 left-0 right-0 p-3 lg:p-4 space-y-1.5"
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 40%, transparent 100%)",
            }}
          >
            <h3
              className="font-display font-medium text-foreground line-clamp-2 break-words tracking-normal"
              style={{
                fontSize: "clamp(11px, 1vw, 15px)",
                lineHeight: "1.15",
                maxWidth: "75%",
                textShadow: "0 2px 10px rgba(0,0,0,0.95), 0 0 18px rgba(0,0,0,0.65)",
              }}
            >
              {ev.title}
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-foreground/85">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/15">
                <Clock className="w-3 h-3 text-accent" />
              </span>
              <span className="capitalize">{fmtDateFull(ev.date_time)}</span>
            </div>
            {ev.venue_name && (
              <div className="flex items-center gap-1.5 text-[11px] text-foreground/80">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/15">
                  <MapPin className="w-3 h-3 text-primary shrink-0" />
                </span>
                <span className="font-medium truncate">{ev.venue_name}</span>
              </div>
            )}
            {badge && <span className="inline-block text-[10px] font-bold text-accent">{badge}</span>}
          </div>
        </Link>
        {(ev.transport_reservation_enabled || !!ev.ticket_url) && (
          <div className="absolute bottom-3 right-3 z-10">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDrawerOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-bold text-white v3-neon-hover"
              style={{ background: "linear-gradient(135deg, hsl(var(--v3-neon) / 0.95), hsl(var(--v3-neon-soft) / 0.95))" }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {ev.transport_reservation_enabled ? "Reservar" : "Ingresso"}
            </button>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-3 top-14 z-10 hidden translate-y-2 rounded-2xl border border-primary/30 bg-background/80 p-3 opacity-0 backdrop-blur-xl transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:block">
          <p className="line-clamp-3 text-[11px] font-medium leading-relaxed text-foreground/90">
            {ev.venue_name ? `${ev.venue_name} · ` : ""}{ev.category} marcado para {fmtTime(ev.date_time)}. Veja detalhes e opções sem perder o ritmo.
          </p>
          {ev.transport_reservation_enabled && (
            <Link to={`/transporte?event=${encodeURIComponent(ev.title)}&venue=${encodeURIComponent(ev.venue_name || "")}&date=${ev.date_time}`} className="pointer-events-auto mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1.5 text-[10px] font-black uppercase text-primary hover:bg-primary/25">
              <Car className="h-3 w-3" /> Pedir carona
            </Link>
          )}
        </div>
      </div>
      <ReservationDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        eventTitle={ev.title}
        eventSlug={ev.slug}
        ticketUrl={ev.ticket_url}
        venueName={ev.venue_name}
        eventDate={ev.date_time}
        imageUrl={ev.image_url}
        transportEnabled={!!ev.transport_reservation_enabled}
      />
    </>
  );
}
