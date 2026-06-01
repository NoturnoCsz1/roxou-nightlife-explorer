import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, Radio } from "lucide-react";
import {
  getFeaturedFootballEvents,
  formatMatchTime,
  sortMatchesByRelevance,
  isPriorityTeam,
  isBrazilPriority,
  isBrazilSelecao,
  isCopaDoMundoMatch,
  type NormalizedMatch,
} from "@/lib/theSportsDb";

/** Card compacto exibido na Home — headless (container/header ficam em V3Home). */
export default function HomeJogosCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["jogos-home-card"],
    queryFn: getFeaturedFootballEvents,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  });

  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());

  const all = data ?? [];
  const brOnly = all.filter((m) => isBrazilPriority(m) || isCopaDoMundoMatch(m) || isBrazilSelecao(m));
  const todays = brOnly.filter((m) => m.raw_date === todayKey);
  const list: NormalizedMatch[] = sortMatchesByRelevance(todays.length ? todays : brOnly).slice(0, 5);

  if (isLoading) {
    return (
      <div className="px-4 pb-4 space-y-1.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
        ))}
      </div>
    );
  }

  if (!list.length) return null;

  return (
    <div className="px-3 pb-4 space-y-1.5">
      {list.map((m) => {
        const isLive = m.status === "live";
        const isBrasil = isBrazilSelecao(m);
        const isCopa = m.is_world_cup;
        const isPriority = isPriorityTeam(m.home_team) || isPriorityTeam(m.away_team);

        return (
          <Link
            key={m.external_id}
            to={`/jogo/${m.slug}`}
            className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all active:scale-[0.98] group"
            style={{
              background: isBrasil
                ? "linear-gradient(135deg, rgba(22,163,74,0.18), rgba(202,138,4,0.08))"
                : isCopa
                  ? "rgba(202,138,4,0.1)"
                  : isLive
                    ? "rgba(239,68,68,0.1)"
                    : isPriority
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(255,255,255,0.03)",
              border: isBrasil
                ? "1px solid rgba(74,222,128,0.28)"
                : isCopa
                  ? "1px solid rgba(234,179,8,0.22)"
                  : isLive
                    ? "1px solid rgba(239,68,68,0.4)"
                    : "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Horário pill */}
            <span
              className="shrink-0 rounded-xl px-2.5 py-1.5 text-[11px] font-black tabular-nums leading-none text-center min-w-[52px]"
              style={{
                background: isLive
                  ? "rgba(239,68,68,0.2)"
                  : isBrasil
                    ? "rgba(22,163,74,0.22)"
                    : isCopa
                      ? "rgba(202,138,4,0.2)"
                      : "rgba(255,255,255,0.07)",
                color: isLive
                  ? "rgb(252,165,165)"
                  : isBrasil
                    ? "rgb(134,239,172)"
                    : isCopa
                      ? "rgb(234,179,8)"
                      : "rgb(180,180,220)",
                border: isLive ? "1px solid rgba(239,68,68,0.4)" : "none",
              }}
            >
              {isLive ? (
                <span className="flex items-center justify-center gap-0.5">
                  <Radio className="w-2.5 h-2.5" />
                  VIVO
                </span>
              ) : (
                formatMatchTime(m.match_time)
              )}
            </span>

            {/* Times + campeonato */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                {m.home_badge && (
                  <img
                    src={m.home_badge}
                    alt=""
                    loading="lazy"
                    className="w-4 h-4 object-contain shrink-0 opacity-90"
                  />
                )}
                <span className="text-[12px] font-bold text-white/90 group-hover:text-white transition-colors truncate">
                  {m.home_team}
                </span>
                <span className="text-white/30 shrink-0 text-[10px] font-black">×</span>
                <span className="text-[12px] font-bold text-white/90 group-hover:text-white transition-colors truncate">
                  {m.away_team}
                </span>
                {m.away_badge && (
                  <img
                    src={m.away_badge}
                    alt=""
                    loading="lazy"
                    className="w-4 h-4 object-contain shrink-0 opacity-90"
                  />
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-[10px] text-white/35 truncate max-w-[130px]">
                  {m.league_label}
                </span>
                {isBrasil && (
                  <span
                    className="shrink-0 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider"
                    style={{
                      background: "rgba(22,163,74,0.2)",
                      border: "1px solid rgba(74,222,128,0.4)",
                      color: "rgb(134,239,172)",
                    }}
                  >
                    🇧🇷 Brasil
                  </span>
                )}
                {isCopa && !isBrasil && (
                  <span
                    className="shrink-0 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider"
                    style={{
                      background: "rgba(202,138,4,0.15)",
                      border: "1px solid rgba(234,179,8,0.35)",
                      color: "rgb(234,179,8)",
                    }}
                  >
                    🏆 Copa
                  </span>
                )}
              </div>
            </div>

            {/* Seta */}
            <ArrowRight
              className="shrink-0 w-3.5 h-3.5 opacity-30 group-hover:opacity-70 transition-opacity"
              style={{ color: isBrasil ? "rgb(134,239,172)" : isCopa ? "rgb(234,179,8)" : "white" }}
            />
          </Link>
        );
      })}

      {/* CTA Ver todos */}
      <Link
        to="/jogos"
        className="flex items-center justify-center gap-2 mt-2 py-2.5 rounded-2xl font-bold text-[12px] transition-all active:scale-[0.98] hover:brightness-110"
        style={{
          background: "rgba(202,138,4,0.1)",
          border: "1px solid rgba(234,179,8,0.28)",
          color: "rgb(234,179,8)",
        }}
      >
        Ver todos os jogos <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
