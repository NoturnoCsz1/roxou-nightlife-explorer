/**
 * TheSportsDB integration — base de dados de jogos.
 * Documentação: https://www.thesportsdb.com/api.php
 *
 * Para adicionar uma nova liga: inclua um objeto em FEATURED_LEAGUES com
 * `id` (idLeague da TheSportsDB), `name` (oficial), `label` (PT-BR),
 * `category` ("world_cup" | "brazil" | "international") e `priority`.
 */

const API_KEY = (import.meta as any).env?.VITE_THESPORTSDB_API_KEY || "3";
const BASE_URL = `https://www.thesportsdb.com/api/v1/json/${API_KEY}`;

const SP_OFFSET = "-03:00";

export interface LeagueConfig {
  id: string;
  name: string;
  label: string;
  category: "world_cup" | "brazil" | "international";
  priority: number;
}

export const FEATURED_LEAGUES: LeagueConfig[] = [
  { id: "4429", name: "FIFA World Cup",          label: "Copa do Mundo",     category: "world_cup",     priority: 1 },
  { id: "4351", name: "Brazilian Serie A",       label: "Brasileirão",       category: "brazil",        priority: 2 },
  { id: "4356", name: "Copa do Brasil",          label: "Copa do Brasil",    category: "brazil",        priority: 3 },
  { id: "4480", name: "Campeonato Paulista",     label: "Paulistão",         category: "brazil",        priority: 4 },
  { id: "4481", name: "Copa Libertadores",       label: "Libertadores",      category: "international", priority: 5 },
  { id: "4482", name: "UEFA Champions League",   label: "Champions League",  category: "international", priority: 6 },
  { id: "4335", name: "Spanish La Liga",         label: "La Liga",           category: "international", priority: 7 },
  { id: "4328", name: "English Premier League", label: "Premier League",    category: "international", priority: 8 },
  { id: "4334", name: "French Ligue 1",          label: "Ligue 1",           category: "international", priority: 9 },
];

export type MatchStatus = "scheduled" | "live" | "finished";

export interface NormalizedMatch {
  external_id: string;
  league_id: string;
  league_name: string;
  league_label: string;
  category: LeagueConfig["category"];
  season: string | null;
  home_team: string;
  away_team: string;
  home_badge: string | null;
  away_badge: string | null;
  match_time: string;           // ISO com offset SP
  match_time_iso: string;
  status: MatchStatus;
  venue_name: string | null;
  youtube_url: string | null;
  slug: string;
  is_world_cup: boolean;
  priority: number;
  raw_date: string;             // YYYY-MM-DD em SP
  raw_time: string;             // HH:mm em SP
}

/** Slugifica string PT-BR. */
const slugify = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Converte dateEvent (YYYY-MM-DD) e strTime (HH:mm:ss UTC) para timestamp ISO em SP. */
export function toBrazilDateTime(dateEvent?: string | null, strTime?: string | null): {
  iso: string;
  dateSP: string;
  timeSP: string;
} {
  if (!dateEvent) {
    const now = new Date();
    return { iso: now.toISOString(), dateSP: "", timeSP: "" };
  }
  const time = (strTime && strTime.length >= 5) ? strTime.slice(0, 8) : "00:00:00";
  // TheSportsDB envia em UTC (strTimestamp também disponível, mas usamos date+time).
  const utcIso = `${dateEvent}T${time}Z`;
  const d = new Date(utcIso);
  if (Number.isNaN(d.getTime())) {
    return { iso: `${dateEvent}T00:00:00${SP_OFFSET}`, dateSP: dateEvent, timeSP: "00:00" };
  }
  // Extrair partes em SP
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const g = (t: string) => parts.find(p => p.type === t)?.value || "";
  const dateSP = `${g("year")}-${g("month")}-${g("day")}`;
  const timeSP = `${g("hour")}:${g("minute")}`;
  return { iso: `${dateSP}T${timeSP}:00${SP_OFFSET}`, dateSP, timeSP };
}

export function makeMatchSlug(home: string, away: string, dateSP: string): string {
  return `${slugify(home)}-vs-${slugify(away)}-${dateSP}`.slice(0, 120);
}

export function getMatchCategory(m: { is_world_cup?: boolean; category?: string }): "copa" | "brasil" | "internacional" {
  if (m.is_world_cup || m.category === "world_cup") return "copa";
  if (m.category === "brazil") return "brasil";
  return "internacional";
}

function inferStatus(strStatus?: string | null, isoTime?: string): MatchStatus {
  const s = (strStatus || "").toLowerCase();
  if (s.includes("ft") || s.includes("finished") || s.includes("ended") || s.includes("match finished")) return "finished";
  if (s.includes("live") || s.includes("1h") || s.includes("2h") || s.includes("ht") || s.includes("in play")) return "live";
  if (isoTime) {
    const ms = new Date(isoTime).getTime();
    const now = Date.now();
    if (now > ms && now < ms + 2.5 * 60 * 60 * 1000) return "live";
    if (now >= ms + 2.5 * 60 * 60 * 1000) return "finished";
  }
  return "scheduled";
}

export function normalizeSportsDbEvent(event: any, league: LeagueConfig): NormalizedMatch | null {
  if (!event || !event.strHomeTeam || !event.strAwayTeam) return null;
  const home = String(event.strHomeTeam).trim();
  const away = String(event.strAwayTeam).trim();
  const dateEvent = event.dateEvent || event.dateEventLocal || null;
  const strTime = event.strTime || event.strTimeLocal || "00:00:00";
  if (!dateEvent) return null;
  const { iso, dateSP, timeSP } = toBrazilDateTime(dateEvent, strTime);
  const slug = makeMatchSlug(home, away, dateSP);
  return {
    external_id: String(event.idEvent),
    league_id: league.id,
    league_name: league.name,
    league_label: league.label,
    category: league.category,
    season: event.strSeason || null,
    home_team: home,
    away_team: away,
    home_badge: event.strHomeTeamBadge || event.strThumb || null,
    away_badge: event.strAwayTeamBadge || null,
    match_time: iso,
    match_time_iso: iso,
    status: inferStatus(event.strStatus, iso),
    venue_name: event.strVenue || null,
    youtube_url: event.strVideo && /youtu/.test(event.strVideo) ? event.strVideo : null,
    slug,
    is_world_cup: league.category === "world_cup",
    priority: league.priority,
    raw_date: dateSP,
    raw_time: timeSP,
  };
}

async function safeFetch(url: string, timeoutMs = 7000): Promise<any | null> {
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

/** Próximos jogos de uma liga (até 15). */
export async function getNextLeagueEvents(leagueId: string): Promise<any[]> {
  const data = await safeFetch(`${BASE_URL}/eventsnextleague.php?id=${leagueId}`);
  return data?.events ?? [];
}

/** Junta jogos das ligas configuradas, ordenados por (data asc, prioridade). */
export async function getFeaturedFootballEvents(): Promise<NormalizedMatch[]> {
  const results = await Promise.allSettled(
    FEATURED_LEAGUES.map(async (lg) => {
      const events = await getNextLeagueEvents(lg.id);
      return events.map((e) => normalizeSportsDbEvent(e, lg)).filter(Boolean) as NormalizedMatch[];
    }),
  );
  const all: NormalizedMatch[] = [];
  for (const r of results) if (r.status === "fulfilled") all.push(...r.value);
  // dedup por external_id
  const seen = new Set<string>();
  const deduped = all.filter((m) => {
    if (seen.has(m.external_id)) return false;
    seen.add(m.external_id);
    return true;
  });
  deduped.sort((a, b) => {
    const t = new Date(a.match_time).getTime() - new Date(b.match_time).getTime();
    if (t !== 0) return t;
    return a.priority - b.priority;
  });
  return deduped;
}

export interface MatchGroup {
  dateKey: string;     // YYYY-MM-DD em SP
  label: string;       // "Hoje", "Amanhã", "Sex, 14 mar"
  matches: NormalizedMatch[];
}

export function groupMatchesByDate(matches: NormalizedMatch[]): MatchGroup[] {
  const todayParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const today = todayParts; // YYYY-MM-DD

  const tomorrowDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const tomorrow = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(tomorrowDate);

  const groups = new Map<string, NormalizedMatch[]>();
  for (const m of matches) {
    if (!groups.has(m.raw_date)) groups.set(m.raw_date, []);
    groups.get(m.raw_date)!.push(m);
  }
  const sorted = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return sorted.map(([dateKey, list]) => {
    let label: string;
    if (dateKey === today) label = "Hoje";
    else if (dateKey === tomorrow) label = "Amanhã";
    else {
      const [y, mo, d] = dateKey.split("-").map(Number);
      const dt = new Date(`${dateKey}T12:00:00${SP_OFFSET}`);
      label = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "short",
      }).format(dt);
    }
    return { dateKey, label, matches: list };
  });
}

/** Helper para mostrar HH:mm em SP. */
export function formatMatchTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

/* ============================================================
 * CURADORIA / RELEVÂNCIA
 * Sistema de pontuação que prioriza jogos importantes para o
 * público brasileiro/Prudente sobre listas genéricas da API.
 * ============================================================ */

export const PRIORITY_TEAMS = [
  "Corinthians", "Palmeiras", "São Paulo", "Sao Paulo", "Santos",
  "Flamengo", "Fluminense", "Vasco", "Botafogo", "Atlético Mineiro",
  "Atletico Mineiro", "Cruzeiro", "Grêmio", "Gremio", "Internacional",
  "Brasil", "Brazil", "Seleção Brasileira", "Selecao Brasileira",
  "Argentina", "Inter Miami",
  "Barcelona", "Real Madrid", "PSG", "Paris Saint-Germain",
  "Manchester City", "Manchester United", "Liverpool", "Chelsea",
  "Arsenal", "Bayern", "Juventus", "Milan", "Inter",
];

const CLASSICS: Array<[string, string]> = [
  ["Corinthians", "Palmeiras"],
  ["São Paulo", "Santos"],
  ["Sao Paulo", "Santos"],
  ["Flamengo", "Fluminense"],
  ["Flamengo", "Vasco"],
  ["Flamengo", "Palmeiras"],
  ["Grêmio", "Internacional"],
  ["Gremio", "Internacional"],
  ["Atlético Mineiro", "Cruzeiro"],
  ["Atletico Mineiro", "Cruzeiro"],
  ["Real Madrid", "Barcelona"],
  ["Manchester City", "Liverpool"],
  ["Manchester United", "Liverpool"],
];

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function teamMatches(team: string, list: string[]): boolean {
  const t = norm(team);
  return list.some((p) => {
    const np = norm(p);
    return t === np || t.includes(np) || np.includes(t);
  });
}

export function isPriorityTeam(team: string): boolean {
  return teamMatches(team, PRIORITY_TEAMS);
}

export function isClassico(home: string, away: string): boolean {
  const h = norm(home);
  const a = norm(away);
  return CLASSICS.some(([x, y]) => {
    const nx = norm(x);
    const ny = norm(y);
    return (h.includes(nx) && a.includes(ny)) || (h.includes(ny) && a.includes(nx));
  });
}

/**
 * Score de relevância (quanto maior, mais importante).
 * - Ao vivo: +1000
 * - Copa do Mundo: +800
 * - Seleção Brasileira em campo: +700
 * - Clássico: +500
 * - Time prioritário em campo: +300 (cada lado)
 * - Champions/Libertadores: +200
 * - Brasileirão/Copa do Brasil: +120
 * - Paulistão: +80
 * - Internacional comum: +30
 */
export function getMatchRelevance(m: NormalizedMatch): number {
  let score = 0;
  if (m.status === "live") score += 1000;
  if (m.is_world_cup) score += 800;

  const seleção = isPriorityTeam("Brasil") &&
    (teamMatches(m.home_team, ["Brasil", "Brazil"]) || teamMatches(m.away_team, ["Brasil", "Brazil"]));
  if (seleção) score += 700;

  if (isClassico(m.home_team, m.away_team)) score += 500;
  if (isPriorityTeam(m.home_team)) score += 300;
  if (isPriorityTeam(m.away_team)) score += 300;

  switch (m.league_id) {
    case "4481": // Libertadores
    case "4482": // Champions
      score += 200; break;
    case "4351": // Brasileirão
    case "4356": // Copa do Brasil
      score += 120; break;
    case "4480": // Paulistão
      score += 80; break;
    case "4335": // La Liga
    case "4328": // Premier League
    case "4334": // Ligue 1
      score += 60; break;
  }

  // Penaliza jogos finalizados
  if (m.status === "finished") score -= 400;
  // Bônus leve para prioridade declarada da liga (1..9, menor = mais importante)
  score += Math.max(0, 20 - m.priority * 2);

  return score;
}

export type MatchBadge =
  | { key: "live"; label: "AO VIVO"; icon: "🔴" }
  | { key: "copa"; label: "COPA"; icon: "🏆" }
  | { key: "classico"; label: "CLÁSSICO"; icon: "⚔️" }
  | { key: "imperdivel"; label: "IMPERDÍVEL"; icon: "🔥" }
  | { key: "destaque"; label: "DESTAQUE"; icon: "⭐" };

/** Calcula badges visuais a partir do match. */
export function getMatchBadges(m: NormalizedMatch): MatchBadge[] {
  const badges: MatchBadge[] = [];
  if (m.status === "live") badges.push({ key: "live", label: "AO VIVO", icon: "🔴" });
  if (m.is_world_cup) badges.push({ key: "copa", label: "COPA", icon: "🏆" });
  if (isClassico(m.home_team, m.away_team)) badges.push({ key: "classico", label: "CLÁSSICO", icon: "⚔️" });

  const bothPriority = isPriorityTeam(m.home_team) && isPriorityTeam(m.away_team);
  if (bothPriority && !badges.find((b) => b.key === "classico")) {
    badges.push({ key: "imperdivel", label: "IMPERDÍVEL", icon: "🔥" });
  }
  if ((m.league_id === "4482" || m.league_id === "4481") && !badges.find((b) => b.key === "imperdivel")) {
    badges.push({ key: "destaque", label: "DESTAQUE", icon: "⭐" });
  }
  return badges.slice(0, 3);
}

/** Ordena jogos pela relevância (desc) mantendo desempate por data. */
export function sortMatchesByRelevance(list: NormalizedMatch[]): NormalizedMatch[] {
  return [...list].sort((a, b) => {
    const rb = getMatchRelevance(b) - getMatchRelevance(a);
    if (rb !== 0) return rb;
    return new Date(a.match_time).getTime() - new Date(b.match_time).getTime();
  });
}

/** Limite mínimo para "Mais Buscados / Imperdíveis". */
export const RELEVANCE_HIGHLIGHT_THRESHOLD = 300;

/** Limite mínimo para um jogo ser visível na página /jogos (esconde lixo da API). */
export const MINIMUM_RELEVANCE_VISIBLE = 60;

export function isHighlightedMatch(m: NormalizedMatch): boolean {
  return getMatchRelevance(m) >= RELEVANCE_HIGHLIGHT_THRESHOLD;
}

export function isVisibleMatch(m: NormalizedMatch): boolean {
  return getMatchRelevance(m) >= MINIMUM_RELEVANCE_VISIBLE;
}

/** Filtra jogos com relevância suficiente para exibição pública. */
export function filterRelevantMatches(list: NormalizedMatch[]): NormalizedMatch[] {
  return list.filter(isVisibleMatch);
}

