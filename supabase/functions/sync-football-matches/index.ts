// Sync football matches from TheSportsDB into public.sports_matches
// Estratégia (free key "3" é severamente limitada):
//  1) eventsnextleague.php / eventspastleague.php para ligas whitelisted
//  2) eventsday.php?d=YYYY-MM-DD&s=Soccer para os próximos 7 dias (pega Copa do Brasil,
//     Libertadores, Sul-Americana etc. mesmo sem saber o ID exato)
//  3) Normalização forte do nome da liga (strLeague vindo da API → canonical)
//  4) Force-include de qualquer partida com time brasileiro
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API_KEY = Deno.env.get("THESPORTSDB_API_KEY") || "3";
const IS_PREMIUM = API_KEY !== "3" && API_KEY.length > 0;
const BASE_URL = `https://www.thesportsdb.com/api/v1/json/${API_KEY}`;
// V2 endpoints (premium): autorização via header X-API-KEY, sem key na URL.
const V2_BASE = `https://www.thesportsdb.com/api/v2/json`;
const V2_HEADERS: Record<string, string> = IS_PREMIUM ? { "X-API-KEY": API_KEY } : {};
const SP_OFFSET = "-03:00";
const DAYS_AHEAD = 7;

type Category = "world_cup" | "brazil" | "international" | "other";

interface LeagueConfig {
  id: string;
  label: string;
  category: Category;
  priority: number;
}

// IDs verificados via lookupleague.php (free key "3" — alguns IDs antigos estavam errados).
const FEATURED_LEAGUES: LeagueConfig[] = [
  { id: "4429", label: "Copa do Mundo",     category: "world_cup",     priority: 1 },
  { id: "4351", label: "Brasileirão",       category: "brazil",        priority: 2 },
  { id: "4480", label: "Champions League",  category: "international", priority: 4 }, // 4480 = UEFA Champions League
  { id: "4481", label: "Europa League",     category: "international", priority: 6 }, // 4481 = UEFA Europa League
  { id: "4482", label: "FA Cup",            category: "international", priority: 9 }, // 4482 = FA Cup
  { id: "4335", label: "La Liga",           category: "international", priority: 7 },
  { id: "4328", label: "Premier League",    category: "international", priority: 8 },
  { id: "4334", label: "Ligue 1",           category: "international", priority: 9 },
];

// Normalização: trecho do strLeague (vindo da API, lowercase) → { label, category, priority }
const LEAGUE_NORMALIZATION: Array<{ match: RegExp; label: string; category: Category; priority: number }> = [
  // Ordem importa: regras mais específicas vêm primeiro.
  { match: /world cup|copa do mundo|fifa world/i,                  label: "Copa do Mundo",     category: "world_cup",     priority: 1 },
  { match: /italian serie a|serie a italian/i,                     label: "Serie A (ITA)",      category: "international", priority: 8 },
  { match: /brazil(ian)? serie b|brasileir[aã]o s[eé]rie b/i,      label: "Brasileirão Série B",category: "brazil",        priority: 3 },
  { match: /brazil(ian)? serie a|brasileir[aã]o/i,                 label: "Brasileirão",        category: "brazil",        priority: 2 },
  { match: /copa do brasil|brazil(ian)? cup|copa betano/i,         label: "Copa do Brasil",     category: "brazil",        priority: 3 },
  { match: /libertadores/i,                                        label: "Libertadores",       category: "international", priority: 4 },
  { match: /sudamericana|sul[- ]americana/i,                       label: "Sul-Americana",      category: "international", priority: 5 },
  { match: /paulista|paulist[aã]o/i,                               label: "Paulistão",          category: "brazil",        priority: 4 },
  { match: /carioca/i,                                             label: "Carioca",            category: "brazil",        priority: 6 },
  { match: /campeonato mineiro|mineiro/i,                          label: "Mineiro",            category: "brazil",        priority: 6 },
  { match: /uefa champions|champions league/i,                     label: "Champions League",   category: "international", priority: 4 },
  { match: /europa league|uefa europa/i,                           label: "Europa League",      category: "international", priority: 6 },
  { match: /spanish la liga|la liga/i,                             label: "La Liga",            category: "international", priority: 7 },
  { match: /english premier league|premier league/i,               label: "Premier League",     category: "international", priority: 8 },
  { match: /french ligue 1|ligue 1/i,                              label: "Ligue 1",            category: "international", priority: 9 },
  { match: /bundesliga/i,                                          label: "Bundesliga",         category: "international", priority: 8 },
  { match: /fa cup/i,                                              label: "FA Cup",             category: "international", priority: 9 },
];

const BRAZILIAN_TEAMS = [
  "corinthians","palmeiras","flamengo","sao paulo","são paulo","santos","vasco","botafogo",
  "fluminense","gremio","grêmio","internacional","cruzeiro","atletico mineiro","atlético mineiro",
  "fortaleza","bahia","ceara","ceará","sport","vitoria","vitória","athletico","atletico paranaense",
  "atlético paranaense","coritiba","bragantino","red bull bragantino","mirassol","goias","goiás",
  "juventude","chapecoense","ponte preta","guarani","novorizontino","operario","operário",
  "remo","paysandu","jacuipense","csa","crb","nautico","náutico","abc","sampaio correa",
  "brusque","londrina","villa nova","tombense","brasil","seleção brasileira","selecao brasileira",
];

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function isBrazilianTeam(team: string): boolean {
  const t = norm(team);
  return BRAZILIAN_TEAMS.some((p) => t === p || t.includes(p) || p.includes(t));
}

function normalizeLeague(rawName: string | null | undefined, fallback?: LeagueConfig): { label: string; category: Category; priority: number } {
  const s = (rawName || "").trim();
  for (const rule of LEAGUE_NORMALIZATION) {
    if (rule.match.test(s)) return { label: rule.label, category: rule.category, priority: rule.priority };
  }
  if (fallback) return { label: fallback.label, category: fallback.category, priority: fallback.priority };
  return { label: s || "Internacional", category: "other", priority: 99 };
}

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

function nextDates(n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(d);
    out.push(parts);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const stats: Record<string, number> = {
    fetched: 0, upserted: 0, errors: 0, skipped_non_soccer: 0,
    br_force_included: 0, dropped_irrelevant: 0,
  };
  const debugLeagues = new Map<string, number>();

  // Coleta eventos: ligas whitelisted + eventsday para próximos N dias
  const allEvents: Array<{ ev: any; fallback?: LeagueConfig }> = [];

  // 1) Whitelist: traz next + past de cada liga conhecida
  for (const lg of FEATURED_LEAGUES) {
    const [nextData, pastData] = await Promise.all([
      safeFetch(`${BASE_URL}/eventsnextleague.php?id=${lg.id}`),
      safeFetch(`${BASE_URL}/eventspastleague.php?id=${lg.id}`),
    ]);
    const events: any[] = [...(nextData?.events ?? []), ...(pastData?.events ?? [])];
    for (const ev of events) allEvents.push({ ev, fallback: lg });
  }

  // 2) eventsday por dia para os próximos N dias (pega Copa do Brasil, Libertadores etc.)
  for (const day of nextDates(DAYS_AHEAD)) {
    const data = await safeFetch(`${BASE_URL}/eventsday.php?d=${day}&s=Soccer`);
    const events: any[] = data?.events ?? [];
    for (const ev of events) allEvents.push({ ev });
  }

  stats.fetched = allEvents.length;

  // Dedup por idEvent
  const seen = new Set<string>();
  const queue: Array<{ ev: any; fallback?: LeagueConfig }> = [];
  for (const it of allEvents) {
    const id = String(it.ev?.idEvent || "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    queue.push(it);
  }

  for (const { ev, fallback } of queue) {
    try {
      if (!ev?.idEvent || !ev?.strHomeTeam || !ev?.strAwayTeam || !ev?.dateEvent) continue;
      if (ev.strSport && String(ev.strSport).toLowerCase() !== "soccer") {
        stats.skipped_non_soccer++; continue;
      }
      const home = String(ev.strHomeTeam).trim();
      const away = String(ev.strAwayTeam).trim();
      const { iso, dateSP } = toBrazilDateTime(ev.dateEvent, ev.strTime || ev.strTimeLocal);
      const slug = `${slugify(home)}-vs-${slugify(away)}-${dateSP}`.slice(0, 120);

      // Normalização da liga: confia no strLeague vindo da API
      const norm_ = normalizeLeague(ev.strLeague, fallback);
      const isBR = isBrazilianTeam(home) || isBrazilianTeam(away);

      // Filtro: aceita se for liga conhecida (category != "other") OU se envolver time brasileiro
      if (norm_.category === "other" && !isBR) {
        stats.dropped_irrelevant++;
        continue;
      }
      if (isBR) stats.br_force_included++;

      // Debug agregado por liga
      const k = `${ev.strLeague || "?"} → ${norm_.label}`;
      debugLeagues.set(k, (debugLeagues.get(k) || 0) + 1);

      const status = inferStatus(ev.strStatus, iso);
      const homeScoreRaw = ev.intHomeScore;
      const awayScoreRaw = ev.intAwayScore;
      const home_score = homeScoreRaw !== null && homeScoreRaw !== undefined && homeScoreRaw !== ""
        ? parseInt(String(homeScoreRaw), 10) : null;
      const away_score = awayScoreRaw !== null && awayScoreRaw !== undefined && awayScoreRaw !== ""
        ? parseInt(String(awayScoreRaw), 10) : null;
      const round_label = ev.intRound ? `Rodada ${ev.intRound}` : (ev.strStage || null);

      const row = {
        external_id: String(ev.idEvent),
        slug,
        home_team: home,
        away_team: away,
        home_badge: ev.strHomeTeamBadge || ev.strThumb || null,
        away_badge: ev.strAwayTeamBadge || null,
        match_time: iso,
        league_id: ev.idLeague || fallback?.id || null,
        league_label: norm_.label,
        league_name: ev.strLeague || norm_.label,
        category: norm_.category === "other" ? "international" : norm_.category,
        season: ev.strSeason || null,
        venue_name: ev.strVenue || null,
        youtube_url: ev.strVideo && /youtu/.test(ev.strVideo) ? ev.strVideo : null,
        status,
        home_score: Number.isFinite(home_score as number) ? home_score : null,
        away_score: Number.isFinite(away_score as number) ? away_score : null,
        round_label,
        current_minute: status === "live" ? (ev.strProgress || ev.strStatus || null) : null,
        finished_at: status === "finished" ? new Date().toISOString() : null,
        is_world_cup: norm_.category === "world_cup",
        priority: norm_.priority,
        last_synced_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("sports_matches")
        .upsert(row, { onConflict: "external_id" });
      if (error) { stats.errors++; console.error("upsert error", error.message, slug); }
      else stats.upserted++;
    } catch (e) {
      stats.errors++;
      console.error("row error", e);
    }
  }

  // Logs detalhados por liga (debug)
  console.log("[sync-football-matches] stats:", JSON.stringify(stats));
  const leaguesObj: Record<string, number> = {};
  for (const [k, v] of debugLeagues.entries()) leaguesObj[k] = v;
  console.log("[sync-football-matches] leagues:", JSON.stringify(leaguesObj));

  return new Response(JSON.stringify({ ok: true, stats, leagues: leaguesObj }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
