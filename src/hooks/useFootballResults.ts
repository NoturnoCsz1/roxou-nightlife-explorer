/** Hook reutilizável para buscar resultados/finalizados de sports_matches. */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ResultRow } from "@/components/jogos/ResultMatchCard";

export type ResultsRange = "today" | "yesterday" | "week" | "last3";

export function rangeWindow(range: ResultsRange): { from: string; to: string } {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  switch (range) {
    case "today": {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return { from: start.toISOString(), to: end.toISOString() };
    }
    case "yesterday": {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 1);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return { from: start.toISOString(), to: end.toISOString() };
    }
    case "week":
      return { from: new Date(now - 7 * day).toISOString(), to: new Date(now + day).toISOString() };
    case "last3":
    default:
      return { from: new Date(now - 3 * day).toISOString(), to: new Date(now).toISOString() };
  }
}

export function useFootballResults(opts: { range?: ResultsRange; leagueId?: string; limit?: number } = {}) {
  const { range = "last3", leagueId, limit = 12 } = opts;
  return useQuery({
    queryKey: ["football-results", range, leagueId ?? "all", limit],
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<ResultRow[]> => {
      const { from, to } = rangeWindow(range);
      let q = supabase
        .from("sports_matches")
        .select("slug, home_team, away_team, home_badge, away_badge, home_score, away_score, league_label, round_label, match_time, is_world_cup")
        .eq("status", "finished")
        .gte("match_time", from)
        .lte("match_time", to)
        .order("match_time", { ascending: false })
        .limit(limit);
      if (leagueId) q = q.eq("league_id", leagueId);
      const { data } = await q;
      return (data ?? []) as ResultRow[];
    },
  });
}

export function useLiveMatches() {
  return useQuery({
    queryKey: ["football-live"],
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
    queryFn: async () => {
      const { data } = await supabase
        .from("sports_matches")
        .select("id, slug, home_team, away_team, home_badge, away_badge, home_score, away_score, league_label, round_label, current_minute, match_time")
        .eq("status", "live")
        .order("match_time", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });
}
