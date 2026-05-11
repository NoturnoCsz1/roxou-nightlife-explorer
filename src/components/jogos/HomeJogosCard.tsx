import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Trophy, ChevronRight } from "lucide-react";
import { getFeaturedFootballEvents, formatMatchTime, type NormalizedMatch } from "@/lib/theSportsDb";

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
  // Preferir jogos de hoje; senão, próximos
  const todays = all.filter((m) => m.raw_date === todayKey);
  const list: NormalizedMatch[] = (todays.length ? todays : all).slice(0, 3);
  const hasCopa = list.some((m) => m.is_world_cup);

  if (isLoading) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-3">
        <div className="rounded-2xl border border-border/40 bg-card/40 h-32 animate-pulse" />
      </section>
    );
  }

  if (!list.length) return null;

  const title = hasCopa ? "🏆 Copa na Roxou" : "⚽ Jogos de Hoje na Roxou";
  const themeBorder = hasCopa
    ? "border-yellow-500/50 bg-gradient-to-br from-emerald-950/40 via-card/60 to-yellow-900/20"
    : "border-primary/30 bg-card/60";

  return (
    <section className="mx-auto max-w-3xl px-4 py-3">
      <Link
        to="/jogos"
        className={`block rounded-2xl border ${themeBorder} backdrop-blur-sm p-4 transition-all hover:scale-[1.01]`}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display font-black text-base flex items-center gap-2">
              {hasCopa && <Trophy className="h-4 w-4 text-yellow-400" />}
              {title}
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Veja os jogos, horários e bares transmitindo em Prudente.
            </p>
          </div>
          <ChevronRight className={`h-5 w-5 ${hasCopa ? "text-yellow-300" : "text-primary"}`} />
        </div>

        <div className="space-y-2">
          {list.map((m) => (
            <div
              key={m.external_id}
              className="flex items-center gap-2 text-xs bg-background/40 rounded-lg px-3 py-2"
            >
              <span className={`shrink-0 font-bold w-12 ${m.is_world_cup ? "text-yellow-300" : "text-primary"}`}>
                {formatMatchTime(m.match_time)}
              </span>
              <span className="flex-1 truncate font-semibold">
                {m.home_team} <span className="text-muted-foreground">×</span> {m.away_team}
              </span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline truncate max-w-[120px]">
                {m.league_label}
              </span>
            </div>
          ))}
        </div>

        <div className={`mt-3 text-xs font-bold ${hasCopa ? "text-yellow-300" : "text-primary"}`}>
          Ver todos os jogos →
        </div>
      </Link>
    </section>
  );
}
