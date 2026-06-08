import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatMatchTime } from "@/lib/theSportsDb";

interface Props {
  leagueId: string;
  leagueLabel: string;
  limit?: number;
}

/** Lista próximos jogos de uma liga específica via sports_matches. */
export default function NextMatchesByLeague({ leagueId, leagueLabel, limit = 8 }: Props) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["next-matches-by-league", leagueId, limit],
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const nowIso = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("sports_matches")
        .select("slug, home_team, away_team, home_badge, away_badge, match_time, round_label, league_label")
        .eq("league_id", leagueId)
        .neq("status", "finished")
        .gte("match_time", nowIso)
        .order("match_time", { ascending: true })
        .limit(limit);
      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-card/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Nenhum jogo da {leagueLabel} programado nos próximos dias.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((m: any) => (
        <Link
          key={m.slug}
          to={`/jogo/${m.slug}`}
          className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/40 p-3 hover:bg-card/70 hover:border-primary/40 transition"
        >
          <div className="flex-1 flex items-center gap-2 min-w-0">
            {m.home_badge && <img src={m.home_badge} alt="" loading="lazy" className="h-6 w-6 object-contain shrink-0" />}
            <span className="font-bold text-sm truncate">{m.home_team}</span>
          </div>
          <span className="text-muted-foreground text-sm font-bold">×</span>
          <div className="flex-1 flex items-center gap-2 min-w-0 justify-end">
            <span className="font-bold text-sm truncate text-right">{m.away_team}</span>
            {m.away_badge && <img src={m.away_badge} alt="" loading="lazy" className="h-6 w-6 object-contain shrink-0" />}
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-primary font-bold tabular-nums shrink-0">
            <Calendar className="h-3 w-3" />
            {formatMatchTime(m.match_time)}
          </span>
        </Link>
      ))}
    </div>
  );
}
