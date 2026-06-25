// ─── HomeHero — heros mobile (ImmersiveHero) e desktop (DesktopHeroSection) ───
// Extraído de src/pages/v3/V3Home.tsx (Fase 5). JSX, classes e estilos idênticos.

import { useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Bot, CalendarDays, Car, ChevronLeft, ChevronRight, Clock,
  Flame, MapPin, Search, Sparkles, Trophy, Users,
} from "lucide-react";
import SmartImage from "@/components/v3/SmartImage";
import type { Ev } from "./types";
import { fmtDateFull, getDayLabel } from "./utils";

/* ─── IMMERSIVE HERO — viewport-tall, The Town vibes ─── */
export function ImmersiveHero({ ev, isToday, todayCount, venueRank, slides, index, onChange, onPauseAutoplay, onResumeAutoplay }: {
  ev: Ev; isToday: boolean; todayCount: number; venueRank?: number;
  slides?: Ev[]; index?: number; onChange?: (i: number) => void;
  onPauseAutoplay?: () => void; onResumeAutoplay?: () => void;
}) {
  const dayLabel = getDayLabel(ev.date_time);
  // momentumText referenciado apenas pela lógica original (não renderizado mais)
  void (isToday && todayCount > 1
    ? `+${todayCount - 1} eventos rolando`
    : venueRank && venueRank <= 3 ? "Top venue da semana" : null);

  const total = slides?.length || 0;
  const cur = index ?? 0;
  const go = (dir: number) => {
    if (!onChange || total <= 1) return;
    onChange((cur + dir + total) % total);
  };
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  return (
    <div
      className="relative h-[58svh] min-h-[384px] max-h-[512px] lg:h-auto lg:min-h-[368px] lg:max-h-[448px] lg:aspect-auto overflow-hidden"
      onTouchStart={(e) => {
        const t = e.touches[0];
        touchRef.current = { x: t.clientX, y: t.clientY };
        onPauseAutoplay?.();
      }}
      onTouchEnd={(e) => {
        const s = touchRef.current; if (!s) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - s.x; const dy = t.clientY - s.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
        touchRef.current = null;
        onResumeAutoplay?.();
      }}
    >
      <SmartImage
        src={ev.image_url}
        alt={ev.title}
        loading="eager"
        fetchPriority="high"
        wrapperClassName="absolute inset-0 w-full h-full"
        className="absolute inset-0 w-full h-full object-cover scale-105 animate-[v3PageFade_700ms_ease-out_both]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-background/15 lg:hidden" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-transparent lg:hidden" />
      <div
        className="absolute inset-0 hidden lg:block"
        style={{
          background:
            "linear-gradient(90deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.15) 100%)",
        }}
      />
      <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[120%] h-44 bg-primary/15 blur-[100px] rounded-full" />

      <div className="absolute top-20 lg:top-8 left-4 lg:left-10 right-4 lg:right-10 flex items-center gap-1.5 z-10">
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/95 backdrop-blur-sm neon-glow">
          {isToday ? <Flame className="w-3 h-3 text-primary-foreground" /> : <Sparkles className="w-3 h-3 text-primary-foreground" />}
          <span className="text-[10px] font-extrabold text-primary-foreground uppercase tracking-[0.15em]">{dayLabel}</span>
        </span>
        {todayCount > 0 && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full v3-glass-strong border border-accent/40 v3-pulse-glow">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-70 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent shadow-[0_0_10px_hsl(var(--accent))]" />
            </span>
            <span className="text-[10px] font-black text-foreground uppercase tracking-[0.18em]">
              <span className="text-accent">{todayCount}</span> {todayCount === 1 ? "evento" : "eventos"} hoje
            </span>
          </span>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] lg:p-10 lg:pb-10 space-y-3 lg:space-y-4 z-10 max-w-[88%] sm:max-w-[80%] lg:max-w-[55%]">
        <div className="space-y-2">
          <span className="inline-block text-[10px] font-semibold text-primary/80 uppercase tracking-[0.28em]">
            {ev.category}
          </span>
          <h1
            className="mt-2 font-display font-bold line-clamp-2 break-words [text-wrap:balance] tracking-tight text-foreground overflow-hidden"
            style={{
              fontSize: "clamp(20px, 5.2vw, 28px)",
              lineHeight: "1.1",
              textShadow: "0 2px 12px rgba(0,0,0,0.7), 0 1px 4px rgba(0,0,0,0.55)",
            }}
          >
            {ev.title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
          {ev.venue_name && (
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <MapPin className="w-3.5 h-3.5 text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.8)]" />
              </div>
              <span className="text-xs lg:text-sm font-bold text-foreground/95 truncate max-w-[180px] lg:max-w-[280px]">{ev.venue_name}</span>
              {venueRank && venueRank <= 3 && (
                <span className="px-1.5 py-0.5 rounded bg-primary/20 text-[9px] font-bold text-primary">#{venueRank}</span>
              )}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-accent drop-shadow-[0_0_6px_hsl(var(--accent)/0.8)]" />
            </div>
            <span className="text-xs lg:text-sm font-semibold text-foreground/85 capitalize">{fmtDateFull(ev.date_time)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            to={`/evento/${ev.slug}`}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold tracking-normal shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.5)] active:scale-95 transition-all"
          >
            Ver evento <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/agenda"
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-white/10 backdrop-blur-md border border-white/25 text-foreground text-sm font-semibold active:scale-95 transition-all hover:bg-white/20"
          >
            <CalendarDays className="w-3.5 h-3.5" /> Agenda
          </Link>
          <Link
            to="/jogos"
            className="hidden lg:inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-sm font-semibold active:scale-95 transition-all hover:bg-amber-500/30"
          >
            <Trophy className="w-3.5 h-3.5" /> Jogos ao vivo
          </Link>
          {ev.transport_reservation_enabled && (
            <Link
              to={`/transporte?event=${encodeURIComponent(ev.title)}&venue=${encodeURIComponent(ev.venue_name || "")}&date=${ev.date_time}`}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-white/10 backdrop-blur-md border border-white/25 text-foreground text-sm font-semibold active:scale-95 transition-all hover:bg-white/20"
            >
              <Car className="w-3.5 h-3.5" /> Como vou?
            </Link>
          )}
        </div>
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            aria-label="Anterior"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); go(-1); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-background/20 backdrop-blur-md border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/15 hover:border-primary/60 active:scale-95 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Próximo"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); go(1); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-background/20 backdrop-blur-md border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/15 hover:border-primary/60 active:scale-95 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
            {(slides ?? []).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ir para slide ${i + 1}`}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange?.(i); }}
                className={`h-1.5 rounded-full transition-all ${i === cur ? "w-5 bg-primary" : "w-1.5 bg-white/40 hover:bg-white/70"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── DESKTOP HERO SECTION — 2 colunas: tagline à esquerda, carrossel à direita ─── */
export function DesktopHeroSection({
  heroEvents, heroIdx, setHeroIdx, todayCount, weekEventsCount, partnerRankMap,
  onPauseAutoplay, onResumeAutoplay,
}: {
  heroEvents: Ev[]; heroIdx: number; setHeroIdx: (n: number) => void;
  todayCount: number; weekEventsCount: number; partnerRankMap: Map<string, number>;
  onPauseAutoplay?: () => void; onResumeAutoplay?: () => void;
}) {
  const ev = heroEvents[heroIdx];
  const total = heroEvents.length;
  const go = (dir: number) => setHeroIdx((heroIdx + dir + total) % total);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  if (!ev) return null;
  const dayLabel = getDayLabel(ev.date_time);
  const rank = ev.partner_id ? partnerRankMap.get(ev.partner_id) : undefined;

  return (
    <div className="grid grid-cols-2 gap-8 px-8 pt-8 pb-6 items-center">
      <div className="flex flex-col justify-center space-y-6 pr-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 w-fit">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_hsl(var(--primary))]" />
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-primary">
            {todayCount > 0 ? `${todayCount} evento${todayCount > 1 ? "s" : ""} hoje em Prudente` : "Próximos eventos em Prudente"}
          </span>
        </div>

        <div className="space-y-3">
          <h1
            className="font-display font-black text-foreground leading-[1.05]"
            style={{ fontSize: "clamp(30px, 3.2vw, 48px)" }}
          >
            O que rola hoje em<br />
            <span className="text-primary" style={{ textShadow: "0 0 40px hsl(var(--primary)/0.4)" }}>
              Presidente Prudente
            </span>
          </h1>
          <p className="text-[15px] text-muted-foreground leading-relaxed max-w-md">
            Eventos, shows, bares, restaurantes, música ao vivo, jogos ao vivo e rolês em Presidente Prudente — tudo em um só lugar, atualizado diariamente.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/agenda"
            className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.5)] hover:bg-primary/90 active:scale-95 transition-all"
          >
            <CalendarDays className="w-4 h-4" /> Ver agenda completa
          </Link>
          <Link
            to="/jogos"
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold text-sm hover:bg-amber-500/30 active:scale-95 transition-all"
          >
            <Trophy className="w-4 h-4" /> Jogos ao vivo
          </Link>
          <Link
            to="/ia"
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full v3-glass border border-border/40 text-foreground font-bold text-sm hover:border-primary/40 active:scale-95 transition-all"
          >
            <Bot className="w-4 h-4 text-primary" /> Aura IA
          </Link>
        </div>

        <div className="flex items-center gap-6">
          <Link to="/descobrir" className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-primary transition-colors">
            <Search className="w-3.5 h-3.5" /> Descobrir
          </Link>
          <Link to="/parceiros" className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-primary transition-colors">
            <Users className="w-3.5 h-3.5" /> Parceiros
          </Link>
          <Link to="/transportes" className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-primary transition-colors">
            <Car className="w-3.5 h-3.5" /> Transportes
          </Link>
        </div>

        {(todayCount > 0 || weekEventsCount > 0) && (
          <div className="flex items-center gap-5 pt-4 border-t border-border/20">
            {todayCount > 0 && (
              <div>
                <span className="text-3xl font-black text-foreground">{todayCount}</span>
                <p className="text-[11px] text-muted-foreground leading-tight">eventos hoje</p>
              </div>
            )}
            {todayCount > 0 && weekEventsCount > 0 && <div className="w-px h-10 bg-border/30" />}
            {weekEventsCount > 0 && (
              <div>
                <span className="text-3xl font-black text-foreground">{weekEventsCount}+</span>
                <p className="text-[11px] text-muted-foreground leading-tight">esta semana</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div
        className="flex flex-col gap-2"
        onMouseEnter={() => onPauseAutoplay?.()}
        onMouseLeave={() => onResumeAutoplay?.()}
      >
      <div
        className="relative rounded-3xl overflow-hidden h-[360px] shadow-[0_16px_48px_-12px_hsl(var(--primary)/0.4)]"
        onTouchStart={(e) => { const t = e.touches[0]; touchRef.current = { x: t.clientX, y: t.clientY }; }}
        onTouchEnd={(e) => {
          const s = touchRef.current; if (!s) return;
          const t = e.changedTouches[0];
          const dx = t.clientX - s.x; const dy = t.clientY - s.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
          touchRef.current = null;
        }}
      >
        <SmartImage
          src={ev.image_url}
          alt={ev.title}
          loading="eager"
          fetchPriority="high"
          wrapperClassName="absolute inset-0 w-full h-full"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/5" />

        <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/95 backdrop-blur-sm neon-glow">
            <Flame className="w-3 h-3 text-primary-foreground" />
            <span className="text-[10px] font-extrabold text-primary-foreground uppercase tracking-wide">{dayLabel}</span>
          </span>
          {rank && rank <= 3 && (
            <span className="px-2.5 py-1 rounded-full bg-amber-500/90 text-[10px] font-black text-white">#{rank} venue</span>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 space-y-2 z-10">
          <span className="inline-block text-[10px] font-semibold text-primary/80 uppercase tracking-widest">{ev.category}</span>
          <h2
            className="font-display font-black text-white line-clamp-2 break-words"
            style={{ fontSize: "clamp(18px, 2vw, 28px)", lineHeight: 1.1, textShadow: "0 2px 12px rgba(0,0,0,0.85)" }}
          >
            {ev.title}
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            {ev.venue_name && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm text-white/90 font-medium truncate max-w-[200px]">{ev.venue_name}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-accent" />
              <span className="text-sm text-white/80">{fmtDateFull(ev.date_time)}</span>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Link
              to={`/evento/${ev.slug}`}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.6)] hover:bg-primary/90 active:scale-95 transition-all"
            >
              Ver evento <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            {ev.ticket_url && (
              <a
                href={ev.ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-semibold hover:bg-white/20 active:scale-95 transition-all"
              >
                Ingressos
              </a>
            )}
          </div>
        </div>

        {total > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); go(-1); }}
              aria-label="Slide anterior"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm border border-white/25 flex items-center justify-center text-white hover:bg-primary/80 hover:border-primary/60 active:scale-95 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); go(1); }}
              aria-label="Próximo slide"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm border border-white/25 flex items-center justify-center text-white hover:bg-primary/80 hover:border-primary/60 active:scale-95 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          {heroEvents.map((e, i) => (
            <button
              key={e.id}
              onClick={() => setHeroIdx(i)}
              title={e.title}
              className={`shrink-0 relative rounded-xl overflow-hidden w-[88px] h-[52px] transition-all active:scale-95 ${
                i === heroIdx
                  ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                  : "opacity-40 hover:opacity-75"
              }`}
            >
              <SmartImage
                src={e.image_url}
                alt={e.title}
                loading="lazy"
                wrapperClassName="w-full h-full"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30" />
              {i === heroIdx && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-border/40 overflow-hidden">
                  <div
                    key={`prog-${heroIdx}`}
                    className="h-full bg-primary origin-left shadow-[0_0_6px_hsl(var(--primary)/0.9)]"
                    style={{
                      animation: "heroProgress 4.5s linear forwards",
                    }}
                  />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
