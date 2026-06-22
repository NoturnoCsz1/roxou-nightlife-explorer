import { useMemo, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Ticket, Flame, Baby, Map, Info } from "lucide-react";
import { trackExpoEvent } from "@/lib/expoAnalytics";
import { EVENT_START_RAW, SHOWS } from "@/components/expo/ExpoShared";

const EXPO_LINKS = [
  { to: "/expo2026/ingressos", label: "Ingressos", icon: Ticket, event: "expo_home_ingressos_click" },
  { to: "/expo2026/front-stage", label: "Front Stage", icon: Flame, event: "expo_home_frontstage_click" },
  { to: "/expo2026/menores", label: "Menores", icon: Baby, event: "expo_home_menores_click" },
  { to: "/expo2026/mapa", label: "Mapa", icon: Map, event: "expo_home_mapa_click" },
  { to: "/expo2026/informacoes", label: "Informações", icon: Info, event: "expo_home_info_click" },
] as const;

function useCountdown(target: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const total = Math.max(0, new Date(target).getTime() - now);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((total % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds, total };
}

export default function ExpoHighlightCard() {
  const { days, hours, minutes, seconds } = useCountdown(EVENT_START_RAW);

  const headlineArtists = useMemo(() => {
    const all = SHOWS.flatMap((s) => s.artists);
    return all.slice(0, 3);
  }, []);

  return (
    <div className="px-4 pt-4">
      <Link
        to="/expo2026"
        onClick={() => trackExpoEvent("expo_home_card_click", { from: "home" })}
        className="group relative block overflow-hidden rounded-2xl border border-[#FFC300]/30 bg-card/60 backdrop-blur-sm p-4 transition-all hover:-translate-y-0.5 hover:border-[#FFC300]/70 hover:shadow-[0_0_30px_-8px_rgba(255,195,0,0.45)]"
      >
        {/* faixa dourada no topo */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ background: "linear-gradient(90deg, #FF8A00 0%, #FFC300 100%)" }}
        />
        {/* glow roxo Roxou no canto */}
        <span
          aria-hidden
          className="absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl opacity-30"
          style={{ background: "hsl(var(--primary))" }}
        />

        <div className="relative flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-[#FFC300]/40 bg-[#FFC300]/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider"
                  style={{ color: "#FFC300" }}
                >
                  <span aria-hidden>🎡</span> Expo Prudente 2026
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary">
                  <Ticket className="h-2.5 w-2.5" /> Hot site
                </span>
              </div>

              <p className="mt-2 font-display font-black text-lg md:text-xl leading-tight break-words">
                🎡 EXPO PRUDENTE 2026
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                <Calendar className="h-3 w-3" />
                10 a 14 de Setembro de 2026
              </p>

              {headlineArtists.length > 0 && (
                <p className="mt-2 text-[11px] text-foreground/90 line-clamp-2">
                  <span className="text-muted-foreground">Destaques:</span>{" "}
                  {headlineArtists.join(", ")}
                </p>
              )}
            </div>

            <span
              className="shrink-0 self-center inline-flex items-center gap-1 rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-wider text-black shadow-[0_0_20px_-8px_rgba(255,195,0,0.7)] group-hover:translate-x-0.5 transition-transform"
              style={{ background: "linear-gradient(135deg, #FF8A00, #FFC300)" }}
            >
              Ver Expo <ArrowRight className="h-3 w-3" />
            </span>
          </div>

          {/* Contador regressivo */}
          <div
            className="grid grid-cols-4 gap-2 rounded-xl border border-[#FFC300]/20 bg-black/30 p-2.5 text-center"
          >
            {[
              { value: days, label: "dias" },
              { value: hours, label: "hrs" },
              { value: minutes, label: "min" },
              { value: seconds, label: "seg" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center">
                <span
                  className="font-display font-black text-lg md:text-xl tabular-nums leading-none"
                  style={{ color: "#FFC300" }}
                >
                  {String(item.value).padStart(2, "0")}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          {/* Chips de navegação */}
          <div className="flex flex-wrap gap-2">
            {EXPO_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={(e) => {
                    e.stopPropagation();
                    trackExpoEvent(item.event, { from: "home" });
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-[#FFC300]/30 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-bold text-foreground/90 hover:border-[#FFC300]/60 hover:bg-[#FFC300]/10 transition-colors"
                >
                  <Icon className="h-3 w-3" style={{ color: "#FFC300" }} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </Link>
    </div>
  );
}
