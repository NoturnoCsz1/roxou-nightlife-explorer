// Sync football matches from TheSportsDB into public.sports_matches
// Runs via cron (every 6h). Idempotent upsert on external_id.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API_KEY = Deno.env.get("THESPORTSDB_API_KEY") || "3";
const BASE_URL = `https://www.thesportsdb.com/api/v1/json/${API_KEY}`;
const SP_OFFSET = "-03:00";

interface LeagueConfig {
  id: string;
  label: string;
  category: "world_cup" | "brazil" | "international";
  priority: number;
}

const FEATURED_LEAGUES: LeagueConfig[] = [
  { id: "4429", label: "Copa do Mundo",    category: "world_cup",     priority: 1 },
  { id: "4351", label: "Brasileirão",      category: "brazil",        priority: 2 },
  { id: "4356", label: "Copa do Brasil",   category: "brazil",        priority: 3 },
  { id: "4480", label: "Paulistão",        category: "brazil",        priority: 4 },
  { id: "4481", label: "Libertadores",     category: "international", priority: 5 },
  { id: "4482", label: "Champions League", category: "international", priority: 6 },
  { id: "4335", label: "La Liga",          category: "international", priority: 7 },
  { id: "4328", label: "Premier League",   category: "international", priority: 8 },
  { id: "4334", label: "Ligue 1",          category: "international", priority: 9 },
];

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function toBrazilDateTime(dateEvent: string, strTime?: string | null) {
  const time = (strTime && strTime.length >= 5) ? strTime.slice(0, 8) : "00:00:00";
  const utcIso = `${dateEvent}T${time}Z`;
  const d = new Date(utcIso);
  if (isNaN(d.getTime())) return { iso: `${dateEvent}T00:00:00${SP_OFFSET}`, dateSP: dateEvent };
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const g = (t: string) => parts.find(p => p.type === t)?.value || "";
  const dateSP = `${g("year")}-${g("month")}-${g("day")}`;
  return { iso: `${dateSP}T${g("hour")}:${g("minute")}:00${SP_OFFSET}`, dateSP };
}

function inferStatus(strStatus?: string | null, isoTime?: string): string {
  const s = (strStatus || "").toLowerCase();
  if (s.includes("ft") || s.includes("finished") || s.includes("ended")) return "finished";
  if (s.includes("live") || s.includes("1h") || s.includes("2h") || s.includes("ht") || s.includes("in play")) return "live";
  if (isoTime) {
    const ms = new Date(isoTime).getTime();
    const now = Date.now();
    if (now > ms && now < ms + 2.5 * 60 * 60 * 1000) return "live";
    if (now >= ms + 2.5 * 60 * 60 * 1000) return "finished";
  }
  return "scheduled";
}

async function safeFetch(url: string, timeoutMs = 10000): Promise<any | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const stats: Record<string, number> = { fetched: 0, upserted: 0, errors: 0 };

  for (const lg of FEATURED_LEAGUES) {
    const data = await safeFetch(`${BASE_URL}/eventsnextleague.php?id=${lg.id}`);
    const events: any[] = data?.events ?? [];
    stats.fetched += events.length;

    for (const ev of events) {
      try {
        if (!ev?.idEvent || !ev?.strHomeTeam || !ev?.strAwayTeam || !ev?.dateEvent) continue;
        const home = String(ev.strHomeTeam).trim();
        const away = String(ev.strAwayTeam).trim();
        const { iso, dateSP } = toBrazilDateTime(ev.dateEvent, ev.strTime || ev.strTimeLocal);
        const slug = `${slugify(home)}-vs-${slugify(away)}-${dateSP}`.slice(0, 120);

        const row = {
          external_id: String(ev.idEvent),
          slug,
          home_team: home,
          away_team: away,
          home_badge: ev.strHomeTeamBadge || ev.strThumb || null,
          away_badge: ev.strAwayTeamBadge || null,
          match_time: iso,
          league_id: lg.id,
          league_label: lg.label,
          league_name: lg.label,
          category: lg.category,
          season: ev.strSeason || null,
          venue_name: ev.strVenue || null,
          youtube_url: ev.strVideo && /youtu/.test(ev.strVideo) ? ev.strVideo : null,
          status: inferStatus(ev.strStatus, iso),
          is_world_cup: lg.category === "world_cup",
          priority: lg.priority,
          last_synced_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from("sports_matches")
          .upsert(row, { onConflict: "external_id" });
        if (error) { stats.errors++; console.error(error); }
        else stats.upserted++;
      } catch (e) {
        stats.errors++;
        console.error("row error", e);
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, stats }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
