import { useRef, useState, useEffect, useMemo, useCallback, type ComponentType, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { format, isValid as isValidDate } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Crown, Sparkles, MapPin, ArrowRight, Clock,
  ChevronLeft, ChevronRight, Flame, Mic2, Beer, Trophy, Star,
} from "lucide-react";
import { isTodaySP } from "@/lib/dateUtils";

/* ───── helpers ───── */
const toSafeDate = (d?: string | null) => {
  const parsed = new Date(d || "");
  return isValidDate(parsed) ? parsed : null;
};

const fmtDateFull = (d?: string | null) => {
  const parsed = toSafeDate(d);
  return parsed ? format(parsed, "EEE, d MMM · HH'h'mm", { locale: ptBR }) : "Data a confirmar";
};

/* ───── tipos ───── */
interface Ev {
  id: string;
  slug: string;
  title: string;
  image_url: string | null;
  date_time: string;
  venue_name: string | null;
  category: string;
  sub_category?: string | null;
  featured?: boolean;
  partner_id?: string | null;
  video_url?: string | null;
}

interface FadeSectionProps {
  className?: string;
  children: ReactNode;
}

interface WeeklySpotlightProps {
  /** Legado: um único evento (ainda suportado como fallback). */
  ev?: Ev;
  /** Pool de candidatos para o carrossel (até 8 serão escolhidos por score). */
  events?: Ev[];
  /** Conjunto de partner_ids premiados (para +25 no score e badge). */
  partnerAwardIds?: Set<string>;
  FadeSection: ComponentType<FadeSectionProps>;
}

/* ───── score / curadoria ───── */
const LAST_HERO_KEY = "roxou:lastHeroEvent";
const MAX_SLIDES = 8;
const ALLOWED_POOL = new Set([
  "festa", "show", "balada", "bar", "gastrobar", "festival", "esporte", "esportivo",
]);

interface Scored {
  ev: Ev;
  score: number;
  isToday: boolean;
  isAwarded: boolean;
}

function scoreEvents(events: Ev[], partnerAwardIds?: Set<string>): Scored[] {
  const seen = new Set<string>();
  const out: Scored[] = [];
  for (const e of events) {
    if (!e || !e.id || seen.has(e.id)) continue;
    seen.add(e.id);
    const cat = (e.category || "").toLowerCase();
    if (!ALLOWED_POOL.has(cat)) continue;
    const date = toSafeDate(e.date_time);
    const isToday = !!date && isTodaySP(date);
    const isAwarded = !!(e.partner_id && partnerAwardIds?.has(e.partner_id));
    let s = 0;
    if (isToday) s += 50;
    if (e.featured) s += 40;
    if (isAwarded) s += 25;
    if (cat === "show") s += 20;
    if (cat === "esporte" || cat === "esportivo") s += 15;
    if (e.partner_id) s += 10;
    s += Math.random() * 15;
    out.push({ ev: e, score: s, isToday, isAwarded });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

interface BadgeInfo {
  label: string;
  icon: ComponentType<{ className?: string }>;
  bg: string;
  glow: string;
}

function pickBadge(s: Scored): BadgeInfo {
  const cat = (s.ev.category || "").toLowerCase();
  if (s.isToday && (cat === "festa" || cat === "balada" || cat === "show")) {
    return { label: "🔥 Bombando hoje", icon: Flame, bg: "rgba(239,68,68,0.85)", glow: "0 0 18px rgba(239,68,68,0.7)" };
  }
  if (cat === "show") {
    return { label: "🎤 Show em destaque", icon: Mic2, bg: "rgba(168,85,247,0.85)", glow: "0 0 18px rgba(168,85,247,0.7)" };
  }
  if (cat === "bar" || cat === "gastrobar") {
    return { label: "🍻 Happy Hour", icon: Beer, bg: "rgba(245,158,11,0.85)", glow: "0 0 18px rgba(245,158,11,0.7)" };
  }
  if (cat === "esporte" || cat === "esportivo") {
    return { label: "⚽ Jogo ao vivo", icon: Trophy, bg: "rgba(34,197,94,0.85)", glow: "0 0 18px rgba(34,197,94,0.7)" };
  }
  if (s.isAwarded) {
    return { label: "🏆 Parceiro premiado", icon: Trophy, bg: "rgba(234,179,8,0.85)", glow: "0 0 18px rgba(234,179,8,0.7)" };
  }
  if (s.ev.featured) {
    return { label: "✨ Curadoria Roxou", icon: Star, bg: "rgba(124,58,237,0.85)", glow: "0 0 18px rgba(124,58,237,0.7)" };
  }
  return { label: "🆕 Acabou de entrar", icon: Sparkles, bg: "rgba(56,189,248,0.85)", glow: "0 0 18px rgba(56,189,248,0.7)" };
}

/* ═══════════════════════════════════════════════════════════════════
   WeeklySpotlight — hero editorial rotativo com até 8 slides.
═══════════════════════════════════════════════════════════════════ */
export default function WeeklySpotlight({ ev, events, partnerAwardIds, FadeSection }: WeeklySpotlightProps) {
  const AUTOPLAY_MS = 8000;

  // Último evento mostrado (não repetir como primeiro slide)
  const lastShownId = useMemo(() => {
    try { return typeof window !== "undefined" ? localStorage.getItem(LAST_HERO_KEY) : null; } catch { return null; }
  }, []);

  // Seleciona até 8 slides com base no score
  const slides = useMemo<Scored[]>(() => {
    const pool: Ev[] = (events && events.length ? events : ev ? [ev] : []) as Ev[];
    if (!pool.length) return [];
    const scored = scoreEvents(pool, partnerAwardIds);
    if (!scored.length) return [];

    // Exclui o último mostrado (a menos que seja o único disponível)
    const filtered = scored.length > 1 && lastShownId
      ? scored.filter((s) => s.ev.id !== lastShownId)
      : scored;

    return filtered.slice(0, MAX_SLIDES);
  }, [ev, events, partnerAwardIds, lastShownId]);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = slides.length;
  const current = slides[Math.min(index, total - 1)] || null;

  // Persiste o slide ativo (memória curta)
  useEffect(() => {
    if (!current) return;
    try { localStorage.setItem(LAST_HERO_KEY, current.ev.id); } catch { /* ignore */ }
  }, [current?.ev.id]);

  // Autoplay 8s
  useEffect(() => {
    if (total <= 1 || paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % total), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [total, paused]);

  // Barra de progresso reinicia a cada troca
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    setProgress(0);
    if (total <= 1 || paused) return;
    const start = Date.now();
    const t = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / AUTOPLAY_MS) * 100);
      setProgress(pct);
      if (pct >= 100) clearInterval(t);
    }, 80);
    return () => clearInterval(t);
  }, [index, total, paused]);

  // Swipe mobile
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40 || total <= 1) return;
    setIndex((i) => (dx < 0 ? (i + 1) % total : (i - 1 + total) % total));
  };

  const go = useCallback((dir: number) => {
    if (total <= 1) return;
    setIndex((i) => (i + dir + total) % total);
  }, [total]);

  if (!current) return null;
  return (
    <FadeSection className="px-4 pt-4 pb-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center neon-glow v3-pulse-glow">
            <Crown className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-primary">Curadoria Roxou</p>
            <h2 className="font-display font-black text-lg text-foreground uppercase tracking-tight leading-none">
              Destaque da semana
            </h2>
          </div>
        </div>
        {total > 1 && (
          <span className="text-[10px] font-bold text-muted-foreground tabular-nums">
            {index + 1}/{total}
          </span>
        )}
      </div>

      <div
        className="relative"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <HeroSlide key={current.ev.id} scored={current} />

        {/* Setas (desktop) */}
        {total > 1 && (
          <>
            <button
              type="button"
              aria-label="Anterior"
              onClick={(e) => { e.preventDefault(); go(-1); }}
              className="hidden md:flex absolute top-1/2 left-2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-background/60 backdrop-blur-md border border-white/20 text-foreground hover:bg-background/80 hover:scale-105 transition z-20"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              aria-label="Próximo"
              onClick={(e) => { e.preventDefault(); go(1); }}
              className="hidden md:flex absolute top-1/2 right-2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-background/60 backdrop-blur-md border border-white/20 text-foreground hover:bg-background/80 hover:scale-105 transition z-20"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Barra de progresso + dots */}
        {total > 1 && (
          <div className="mt-3 space-y-2">
            <div className="h-0.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent transition-[width] duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-center gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Ir para slide ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? "w-6 bg-primary shadow-[0_0_8px_hsl(var(--primary))]" : "w-1.5 bg-white/30 hover:bg-white/50"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </FadeSection>
  );
}

/* ───── slide individual (mantém vídeo POV / imagem) ───── */
function HeroSlide({ scored }: { scored: Scored }) {
  const { ev } = scored;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const hasVideo = !!ev.video_url && !videoError;
  const badge = pickBadge(scored);
  const BadgeIcon = badge.icon;

  useEffect(() => {
    setVideoReady(false);
    setVideoError(false);
  }, [ev.video_url]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !hasVideo) return;
    const tryPlay = () => v.play().catch(() => {});
    tryPlay();
    v.addEventListener("loadeddata", tryPlay);
    return () => v.removeEventListener("loadeddata", tryPlay);
  }, [hasVideo, ev.video_url]);

  return (
    <Link
      to={`/evento/${ev.slug}`}
      className="relative block rounded-3xl overflow-hidden v3-glass border border-primary/30 group animate-fade-in"
      style={{
        aspectRatio: "16 / 20",
        boxShadow:
          "0 0 0 1px hsl(var(--v3-neon) / 0.35), 0 0 30px hsl(var(--v3-neon) / 0.25), 0 24px 60px rgba(0,0,0,0.6)",
      }}
    >
      {ev.video_url && !videoError ? (
        <video
          ref={videoRef}
          src={ev.video_url}
          poster={ev.image_url || undefined}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          onLoadedData={() => setVideoReady(true)}
          onCanPlay={() => setVideoReady(true)}
          onError={() => { setVideoError(true); setVideoReady(false); }}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${videoReady ? "opacity-100" : "opacity-0"}`}
        />
      ) : null}
      <img
        src={ev.image_url || "/placeholder.svg"}
        alt={ev.title}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
          hasVideo && videoReady ? "opacity-0" : "opacity-100"
        } group-hover:scale-105 transition-transform`}
      />

      {hasVideo && !videoReady && (
        <div className="absolute inset-0 v3-skeleton" aria-hidden="true" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 mix-blend-overlay" />

      {/* Badge dinâmica */}
      <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
        <span
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/15"
          style={{ background: badge.bg, boxShadow: badge.glow }}
        >
          <BadgeIcon className="w-3 h-3 text-white" />
          <span className="text-[9px] font-black text-white uppercase tracking-[0.18em]">{badge.label}</span>
        </span>
        {hasVideo && videoReady && (
          <span
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full backdrop-blur-md border border-white/15"
            style={{ background: "rgba(0,0,0,0.45)" }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-70 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">POV</span>
          </span>
        )}
      </div>

      {/* Info glass */}
      <div className="absolute inset-x-3 bottom-3 rounded-2xl v3-glass-strong p-4 border border-white/10 z-10">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-primary v3-neon-text">
          {ev.category}
        </span>
        <h3 className="font-display font-black text-2xl text-foreground leading-[0.95] mt-1.5 line-clamp-2">
          {ev.title.toUpperCase()}
        </h3>
        <div className="flex items-center gap-3 mt-3 text-[11px] font-bold text-foreground/85">
          {ev.venue_name && (
            <span className="flex items-center gap-1 truncate max-w-[60%]">
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0 drop-shadow-[0_0_6px_hsl(var(--primary))]" />
              <span className="truncate">{ev.venue_name}</span>
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-accent drop-shadow-[0_0_6px_hsl(var(--accent))]" />
            <span className="capitalize">{fmtDateFull(ev.date_time)}</span>
          </span>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/70">
            Toque para explorar
          </span>
          <span
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-extrabold uppercase tracking-wider text-white"
            style={{
              background: "linear-gradient(135deg, hsl(var(--v3-neon)), hsl(var(--v3-neon-soft)))",
              boxShadow: "0 0 20px hsl(var(--v3-neon) / 0.5)",
            }}
          >
            Ver agora <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>

      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary/30 blur-3xl group-hover:scale-110 transition-transform duration-700" />
    </Link>
  );
}
