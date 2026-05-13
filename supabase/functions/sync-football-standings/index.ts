// Sync football league standings from TheSportsDB into public.sports_league_standings.
// Idempotent upsert by (league_id, season, team_name). Runs via cron (recommended every 6h).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API_KEY = Deno.env.get("THESPORTSDB_API_KEY") || "3";
const BASE_URL = `https://www.thesportsdb.com/api/v1/json/${API_KEY}`;

interface LeagueCfg {
  id: string;
  label: string;
  slug: string;
  season?: string;
}

const LEAGUES: LeagueCfg[] = [
  { id: "4351", label: "Brasileirão",     slug: "brasileirao",  season: "2026" },
  { id: "4481", label: "Libertadores",    slug: "libertadores", season: "2026" },
  { id: "4482", label: "Champions League", slug: "champions",    season: "2025-2026" },
];

async function safeFetch(url: string, timeoutMs = 12000): Promise<any | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const stats: Record<string, number> = { upserted: 0, leagues: 0, errors: 0 };

  for (const lg of LEAGUES) {
    // Tenta a temporada configurada; se vazio, pega a current da liga
    let seasonsToTry = lg.season ? [lg.season] : [];
    if (!seasonsToTry.length) {
      const lkup = await safeFetch(`${BASE_URL}/lookupleague.php?id=${lg.id}`);
      const cur = lkup?.leagues?.[0]?.strCurrentSeason;
      if (cur) seasonsToTry = [cur];
    }

    let rows: any[] = [];
    for (const season of seasonsToTry) {
      const data = await safeFetch(`${BASE_URL}/lookuptable.php?l=${lg.id}&s=${encodeURIComponent(season)}`);
      const table: any[] = data?.table ?? [];
      if (table.length) {
        rows = table.map((t: any) => ({
          league_id: lg.id,
          league_label: lg.label,
          league_slug: lg.slug,
          season,
          position: parseInt(t.intRank ?? t.rank ?? "0", 10) || 0,
          team_id: t.idTeam ?? null,
          team_name: t.strTeam ?? "",
          team_badge: t.strTeamBadge ?? null,
          played: parseInt(t.intPlayed ?? "0", 10) || 0,
          wins: parseInt(t.intWin ?? "0", 10) || 0,
          draws: parseInt(t.intDraw ?? "0", 10) || 0,
          losses: parseInt(t.intLoss ?? "0", 10) || 0,
          goals_for: parseInt(t.intGoalsFor ?? "0", 10) || 0,
          goals_against: parseInt(t.intGoalsAgainst ?? "0", 10) || 0,
          goal_diff: parseInt(t.intGoalDifference ?? "0", 10) || 0,
          points: parseInt(t.intPoints ?? "0", 10) || 0,
          form: t.strForm ?? null,
          last_synced_at: new Date().toISOString(),
        })).filter((r) => r.team_name);
        break;
      }
    }

    if (!rows.length) continue;
    stats.leagues++;

    const { error } = await supabase
      .from("sports_league_standings")
      .upsert(rows, { onConflict: "league_id,season,team_name" });
    if (error) {
      stats.errors++;
      console.error(`[standings:${lg.slug}]`, error.message);
    } else {
      stats.upserted += rows.length;
    }
  }

  return new Response(JSON.stringify({ ok: true, stats, timestamp: new Date().toISOString() }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
