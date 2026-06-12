import { useRef, useState, useEffect, type ComponentType, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { isValid as isValidDate } from "date-fns";
import { Crown, Sparkles, MapPin, ArrowRight, Clock } from "lucide-react";
import { useScrollFadeIn } from "@/hooks/useScrollFadeIn";

/* ───── helpers (copiados de V3Home.tsx, puras) ───── */
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
  video_url?: string | null;
}

interface FadeSectionProps {
  className?: string;
  children: ReactNode;
}

interface WeeklySpotlightProps {
  ev: Ev;
  FadeSection: ComponentType<FadeSectionProps>;
}

/**
 * WeeklySpotlight — destaque da semana com vídeo POV ou imagem animada.
 */
export default function WeeklySpotlight({ ev, FadeSection }: WeeklySpotlightProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const hasVideo = !!ev.video_url && !videoError;

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
    <FadeSection className="px-4 pt-4 pb-2">
      {/* Section header — agency authority */}
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
      </div>

      <Link
        to={`/evento/${ev.slug}`}
        className="relative block rounded-3xl overflow-hidden v3-glass border border-primary/30 group"
        style={{
          aspectRatio: "16 / 20",
          boxShadow:
            "0 0 0 1px hsl(var(--v3-neon) / 0.35), 0 0 30px hsl(var(--v3-neon) / 0.25), 0 24px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Background — video POV or animated image */}
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

        {/* Skeleton shimmer enquanto o vídeo POV ainda não está pronto */}
        {hasVideo && !videoReady && (
          <div className="absolute inset-0 v3-skeleton" aria-hidden="true" />
        )}

        {/* Cinematic overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 mix-blend-overlay" />

        {/* Top — POV badge (somente se vídeo realmente carregou) */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/15"
            style={{ background: "rgba(0,0,0,0.45)" }}
          >
            {hasVideo && videoReady ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-70 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">POV ao vivo</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Imperdível</span>
              </>
            )}
          </span>
        </div>

        {/* Bottom — glass info card */}
        <div className="absolute inset-x-3 bottom-3 rounded-2xl v3-glass-strong p-4 border border-white/10">
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
                background:
                  "linear-gradient(135deg, hsl(var(--v3-neon)), hsl(var(--v3-neon-soft)))",
                boxShadow: "0 0 20px hsl(var(--v3-neon) / 0.5)",
              }}
            >
              Ver agora <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Animated corner glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary/30 blur-3xl group-hover:scale-110 transition-transform duration-700" />
      </Link>
    </FadeSection>
  );
}
