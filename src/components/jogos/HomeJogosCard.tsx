import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Trophy, ChevronRight, Radio } from "lucide-react";
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

/** Card compacto exibido na Home. */
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
  // Apenas jogos BR-priority / Copa / Seleção — sem ligas aleatórias na Home.
  const brOnly = all.filter((m) => isBrazilPriority(m) || isCopaDoMundoMatch(m) || isBrazilSelecao(m));
  const todays = brOnly.filter((m) => m.raw_date === todayKey);
  const list: NormalizedMatch[] = sortMatchesByRelevance(todays.length ? todays : brOnly).slice(0, 3);
  const hasCopa = list.some((m) => m.is_world_cup);
  const hasLive = list.some((m) => m.status === "live");

  if (isLoading) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-3">
        <div className="rounded-2xl border border-border/40 bg-card/40 h-32 animate-pulse" />
      </section>
    );
  }

  if (!list.length) return null;

  const title = hasCopa ? "🏆 Copa na Roxou" : "⚽ Futebol na Roxou";
  const themeBorder = hasCopa
    ? "border-yellow-500/50 bg-gradient-to-br from-emerald-950/40 via-card/60 to-yellow-900/20 shadow-[0_0_30px_-12px_rgba(234,179,8,0.5)]"
    : hasLive
      ? "border-red-500/40 bg-gradient-to-br from-red-950/20 via-card/60 to-background shadow-[0_0_25px_-12px_rgba(239,68,68,0.5)]"
      : "border-primary/30 bg-card/60 hover:shadow-[0_0_24px_-12px_hsl(var(--primary)/0.5)]";

  return (
    <section className="mx-auto max-w-3xl px-4 py-3">
      <Link
        to="/jogos"
        className={`block rounded-2xl border ${themeBorder} backdrop-blur-sm p-4 transition-all hover:scale-[1.01]`}
      >
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="min-w-0">
            <h2 className="font-display font-black text-base flex items-center gap-2 flex-wrap">
              {hasCopa && <Trophy className="h-4 w-4 text-yellow-400" />}
              <span className="truncate">{title}</span>
              {hasLive && (
                <span className="inline-flex items-center gap-1 rounded-full border border-red-500/50 bg-red-500/20 px-2 py-0.5 text-[9px] font-black uppercase text-red-300 animate-pulse">
                  <Radio className="h-2.5 w-2.5" /> Ao vivo agora
                </span>
              )}
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Veja os jogos, horários e bares transmitindo em Prudente.
            </p>
          </div>
          <ChevronRight className={`h-5 w-5 shrink-0 ${hasCopa ? "text-yellow-300" : "text-primary"}`} />
        </div>

        <div className="space-y-2">
          {list.map((m) => {
            const isLive = m.status === "live";
            const priority = isPriorityTeam(m.home_team) || isPriorityTeam(m.away_team) || m.is_world_cup;
            return (
              <div
                key={m.external_id}
                className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${
                  isLive
                    ? "bg-red-500/10 ring-1 ring-red-500/30"
                    : priority
                      ? "bg-primary/5 ring-1 ring-primary/20"
                      : "bg-background/40"
                }`}
              >
                <span className={`shrink-0 font-bold w-12 ${m.is_world_cup ? "text-yellow-300" : isLive ? "text-red-300" : "text-primary"}`}>
                  {isLive ? "AO VIVO" : formatMatchTime(m.match_time)}
                </span>
                <span className="flex-1 truncate font-semibold">
                  {m.home_team} <span className="text-muted-foreground">×</span> {m.away_team}
                </span>
                <span className="text-[10px] text-muted-foreground hidden sm:inline truncate max-w-[120px]">
                  {m.league_label}
                </span>
              </div>
            );
          })}
        </div>

        <div className={`mt-3 text-xs font-bold ${hasCopa ? "text-yellow-300" : "text-primary"}`}>
          Ver todos os jogos →
        </div>
      </Link>
    </section>
  );
}
