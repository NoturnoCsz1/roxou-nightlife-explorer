import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Trophy, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface LeagueTableProps {
  /** league_slug em sports_league_standings (brasileirao | libertadores | champions) */
  leagueSlug: string;
  /** Quantos times mostrar (default: todos). Use 6 para preview compacto. */
  limit?: number;
  /** Mostrar header com nome da liga */
  showHeader?: boolean;
  /** Faixa de top que recebe destaque verde (G4, G6 etc) */
  topZone?: number;
  /** Faixa de baixo que recebe destaque vermelho (rebaixamento) */
  relegationZone?: number;
  /** Mostrar link "ver tabela completa" */
  showFullLink?: boolean;
  /** Conteúdo renderizado quando standings está vazio (ex: Libertadores sem dados) */
  emptyFallback?: React.ReactNode;
}

interface StandingRow {
  position: number;
  team_name: string;
  team_badge: string | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  points: number;
  form: string | null;
  league_label: string;
}

function LeagueTableInner({
  leagueSlug,
  limit,
  showHeader = true,
  topZone = 4,
  relegationZone = 0,
  showFullLink = false,
  emptyFallback,
}: LeagueTableProps) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["league-standings", leagueSlug, limit ?? "all"],
    staleTime: 1000 * 60 * 30,
    queryFn: async (): Promise<StandingRow[]> => {
      const q = supabase
        .from("sports_league_standings")
        .select("position, team_name, team_badge, played, wins, draws, losses, goals_for, goals_against, goal_diff, points, form, league_label")
        .eq("league_slug", leagueSlug)
        .order("position", { ascending: true });
      const { data } = limit ? await q.limit(limit) : await q;
      return (data ?? []) as StandingRow[];
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/40 bg-card/30 p-6 animate-pulse">
        <div className="h-4 w-32 bg-muted/40 rounded mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 bg-muted/30 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!rows.length) return emptyFallback ? <>{emptyFallback}</> : null;

  const total = rows.length;

  return (
    <section className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
      {showHeader && (
        <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/40 bg-gradient-to-r from-yellow-500/10 to-transparent">
          <h2 className="font-display font-black text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-400" />
            {rows[0]?.league_label ?? "Tabela"}
          </h2>
          {showFullLink && (
            <Link
              to={`/tabela/${leagueSlug}`}
              className="text-[11px] font-bold text-primary hover:underline"
            >
              Ver tabela completa →
            </Link>
          )}
        </header>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase text-muted-foreground border-b border-border/30">
              <th className="text-left px-2 py-2 w-8">#</th>
              <th className="text-left px-2 py-2">Time</th>
              <th className="text-center px-2 py-2 w-10">PG</th>
              <th className="text-center px-2 py-2 w-10">J</th>
              <th className="hidden sm:table-cell text-center px-2 py-2 w-10">V</th>
              <th className="hidden sm:table-cell text-center px-2 py-2 w-10">E</th>
              <th className="hidden sm:table-cell text-center px-2 py-2 w-10">D</th>
              <th className="hidden md:table-cell text-center px-2 py-2 w-10">GP</th>
              <th className="hidden md:table-cell text-center px-2 py-2 w-10">GC</th>
              <th className="text-center px-2 py-2 w-10">SG</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const inTop = r.position <= topZone;
              const isLeader = r.position === 1;
              const inRelegation = relegationZone > 0 && r.position > total - relegationZone;
              return (
                <tr
                  key={r.position + r.team_name}
                  className={`border-b border-border/20 last:border-0 hover:bg-card/60 transition ${
                    isLeader ? "bg-yellow-500/5" : ""
                  }`}
                >
                  <td className="px-2 py-2">
                    <span
                      className={`inline-flex items-center justify-center h-6 w-6 rounded text-[11px] font-black ${
                        isLeader
                          ? "bg-yellow-500/20 text-yellow-300 ring-1 ring-yellow-500/40"
                          : inTop
                          ? "bg-emerald-500/15 text-emerald-300"
                          : inRelegation
                          ? "bg-red-500/15 text-red-300"
                          : "text-muted-foreground"
                      }`}
                    >
                      {r.position}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {r.team_badge ? (
                        <img
                          src={r.team_badge}
                          alt=""
                          loading="lazy"
                          className="h-5 w-5 object-contain shrink-0"
                        />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-muted/40 shrink-0" />
                      )}
                      <span className="font-bold truncate">{r.team_name}</span>
                    </div>
                  </td>
                  <td className="text-center px-2 py-2 font-black">{r.points}</td>
                  <td className="text-center px-2 py-2 text-muted-foreground">{r.played}</td>
                  <td className="hidden sm:table-cell text-center px-2 py-2 text-emerald-300">{r.wins}</td>
                  <td className="hidden sm:table-cell text-center px-2 py-2 text-muted-foreground">{r.draws}</td>
                  <td className="hidden sm:table-cell text-center px-2 py-2 text-red-300">{r.losses}</td>
                  <td className="hidden md:table-cell text-center px-2 py-2 text-muted-foreground">{r.goals_for}</td>
                  <td className="hidden md:table-cell text-center px-2 py-2 text-muted-foreground">{r.goals_against}</td>
                  <td className={`text-center px-2 py-2 font-bold ${r.goal_diff > 0 ? "text-emerald-300" : r.goal_diff < 0 ? "text-red-300" : "text-muted-foreground"}`}>
                    {r.goal_diff > 0 ? `+${r.goal_diff}` : r.goal_diff}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(topZone > 0 || relegationZone > 0) && (
        <footer className="flex flex-wrap items-center gap-3 px-4 py-2 border-t border-border/30 text-[10px] text-muted-foreground">
          {topZone > 0 && (
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Classificação
            </span>
          )}
          {relegationZone > 0 && (
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-400" /> Rebaixamento
            </span>
          )}
        </footer>
      )}
    </section>
  );
}

export const LeagueTable = memo(LeagueTableInner);
export default LeagueTable;
