import { useMemo, useState, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Trophy, Radio, Beer, Calendar, MapPin, Flame, Sparkles, Tv, Zap, ListOrdered } from "lucide-react";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import {
  getFeaturedFootballEvents,
  groupMatchesByDate,
  sortMatchesByRelevance,
  isHighlightedMatch,
  filterRelevantMatches,
  formatMatchTime,
  isPriorityTeam,
  isSameTeam,
  isBrazilianTeam,
  mergeMatches,
  sportsMatchRowToNormalized,
  type NormalizedMatch,
  type SportsMatchRow,
} from "@/lib/theSportsDb";
import MatchCard from "@/components/jogos/MatchCard";
import MatchVenuesQuickList from "@/components/jogos/MatchVenuesQuickList";
import { useMatchMeta, type MatchMetaMap } from "@/hooks/useMatchMeta";
import ResultMatchCard from "@/components/jogos/ResultMatchCard";
import { useFootballResults, useLiveMatches } from "@/hooks/useFootballResults";
const LeagueTable = lazy(() => import("@/components/jogos/LeagueTable"));


/** Renderiza MatchCard + lista rápida de bares quando o jogo é prioritário. */
function PriorityMatchBlock({
  match,
  bars,
  meta,
}: {
  match: NormalizedMatch;
  bars: { id: string; name: string; slug: string; neighborhood?: string | null; type?: string | null }[];
  meta?: MatchMetaMap[string];
}) {
  const showVenues = isHighlightedMatch(match) && match.status !== "finished";
  const venuesCount = meta?.venuesCount ?? (showVenues ? bars.length : 0);
  return (
    <div>
      <MatchCard
        match={match}
        venuesCount={venuesCount}
        hasStream={meta?.hasStream}
        hasActiveChat={meta?.hasActiveChat}
      />
      {showVenues && <MatchVenuesQuickList bars={bars} />}
    </div>
  );
}

const POPULAR_TEAMS = [
  { label: "Corinthians", match: "corinthians", emoji: "🦅" },
  { label: "Palmeiras", match: "palmeiras", emoji: "🐷" },
  { label: "Flamengo", match: "flamengo", emoji: "🔴" },
  { label: "São Paulo", match: "são paulo", emoji: "⚪" },
  { label: "Santos", match: "santos", emoji: "⚓" },
  { label: "Brasil", match: "brasil", emoji: "🇧🇷" },
  { label: "Real Madrid", match: "real madrid", emoji: "👑" },
  { label: "Barcelona", match: "barcelona", emoji: "🔵" },
  { label: "PSG", match: "psg", emoji: "🗼" },
];

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();


type FilterKey = "hoje" | "amanha" | "semana" | "copa" | "brasil" | "internacional" | "live";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "amanha", label: "Amanhã" },
  { key: "semana", label: "Semana" },
  { key: "copa", label: "Copa" },
  { key: "brasil", label: "Brasil" },
  { key: "internacional", label: "Internacionais" },
  { key: "live", label: "Ao vivo" },
];

const todayKeySP = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());

const tomorrowKeySP = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(Date.now() + 24 * 60 * 60 * 1000));

export default function Jogos() {
  const [filter, setFilter] = useState<FilterKey>("semana");
  const [teamFilter, setTeamFilter] = useState<string | null>(null);

  const DEBUG = (import.meta as any).env?.VITE_JOGOS_DEBUG === "true";

  // 1) API direta (FEATURED_LEAGUES) — Brasileirão, Champions, La Liga, Premier, Ligue 1, Europa, FA Cup
  const { data: apiMatches = [], isLoading: loadingApi, isError } = useQuery({
    queryKey: ["jogos-public-api"],
    queryFn: getFeaturedFootballEvents,
    staleTime: 1000 * 60 * 10,
  });

  // 2) Banco (sports_matches) — Copa do Brasil, Libertadores, Sul-Americana, Série B, etc.
  //    Sincronizado via edge function premium. SEM essa fonte, jogos como
  //    Juventude x São Paulo (Copa do Brasil) NUNCA apareceriam no público.
  const { data: dbMatches = [], isLoading: loadingDb } = useQuery({
    queryKey: ["jogos-public-db"],
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<NormalizedMatch[]> => {
      const fromIso = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
      const toIso = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("sports_matches")
        .select("external_id, league_id, league_name, league_label, category, season, home_team, away_team, home_badge, away_badge, match_time, status, venue_name, youtube_url, slug, is_world_cup, priority")
        .gte("match_time", fromIso)
        .lte("match_time", toIso)
        .order("match_time", { ascending: true })
        .limit(500);
      if (error) {
        if (DEBUG) console.error("[jogos-debug] db error", error);
        return [];
      }
      return (data ?? []).map((r) => sportsMatchRowToNormalized(r as SportsMatchRow));
    },
  });

  const isLoading = loadingApi || loadingDb;

  const matches = useMemo(() => mergeMatches(apiMatches, dbMatches), [apiMatches, dbMatches]);

  const { data: bars = [] } = useQuery({
    queryKey: ["jogos-bares-prudente-sports"],
    queryFn: async () => {
      // Curadoria real: apenas parceiros com supports_sports = true
      // OU vinculados a algum jogo em sports_match_venues.
      const [{ data: flagged }, { data: linked }] = await Promise.all([
        supabase
          .from("partners")
          .select("id, name, slug, neighborhood, type, supports_sports")
          .eq("city", "Presidente Prudente")
          .eq("active", true)
          .eq("supports_sports", true)
          .limit(24),
        supabase
          .from("sports_match_venues")
          .select("venue_id, partners:venue_id(id, name, slug, neighborhood, type, city, active, supports_sports)")
          .limit(50),
      ]);
      const map = new Map<string, any>();
      (flagged ?? []).forEach((p: any) => map.set(p.id, { ...p, _matchLinked: false }));
      (linked ?? []).forEach((row: any) => {
        const p = row.partners;
        if (!p || !p.active || p.city !== "Presidente Prudente") return;
        if (map.has(p.id)) map.set(p.id, { ...map.get(p.id), _matchLinked: true });
        else map.set(p.id, { ...p, _matchLinked: true });
      });
      // Match-linked primeiro
      return Array.from(map.values()).sort((a, b) => Number(b._matchLinked) - Number(a._matchLinked)).slice(0, 12);
    },
    staleTime: 1000 * 60 * 15,
  });

  const today = todayKeySP();
  const tomorrow = tomorrowKeySP();

  const hasCopa = useMemo(() => matches.some((m) => m.is_world_cup), [matches]);

  // Base relevante: esconde jogos irrelevantes a menos que filtros específicos peçam.
  const relevantBase = useMemo(() => filterRelevantMatches(matches), [matches]);

  // Slugs visíveis na página → busca metadata real (bares, stream, chat ativo)
  const allSlugs = useMemo(() => Array.from(new Set(matches.map((m) => m.slug))), [matches]);
  const { data: metaMap = {} } = useMatchMeta(allSlugs);

  // Enriquecimento premium (views, status live, highlights) para ranking de "Mais buscados"
  type Enrich = { views: number; status: string | null; highlight: boolean };
  const { data: enrichMap = {} } = useQuery({
    queryKey: ["sports-matches-enrich", allSlugs.slice().sort().join("|")],
    enabled: allSlugs.length > 0,
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<Record<string, Enrich>> => {
      const { data } = await supabase
        .from("sports_matches")
        .select("slug, views_count, status, highlight_url")
        .in("slug", allSlugs);
      const map: Record<string, Enrich> = {};
      (data ?? []).forEach((r: any) => {
        map[r.slug] = {
          views: r.views_count ?? 0,
          status: r.status ?? null,
          highlight: !!r.highlight_url,
        };
      });
      return map;
    },
  });

  const filtered = useMemo<NormalizedMatch[]>(() => {
    let list: NormalizedMatch[] =
      filter === "copa" || filter === "brasil" || filter === "internacional"
        ? matches
        : relevantBase;

    if (filter === "hoje") list = list.filter((m) => m.raw_date === today);
    else if (filter === "amanha") list = list.filter((m) => m.raw_date === tomorrow);
    else if (filter === "semana") {
      const limit = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      list = list.filter((m) => m.match_time <= limit);
    } else if (filter === "copa") list = list.filter((m) => m.is_world_cup);
    else if (filter === "brasil") list = list.filter((m) => m.category === "brazil");
    else if (filter === "internacional") list = list.filter((m) => m.category === "international");
    else if (filter === "live") list = list.filter((m) => m.status === "live");

    if (teamFilter) {
      // Bidirecional + normalizado (reconhece SPFC, EC Juventude, etc.)
      list = list.filter((m) => isSameTeam(m.home_team, teamFilter) || isSameTeam(m.away_team, teamFilter));
    }
    return list;
  }, [matches, relevantBase, filter, today, tomorrow, teamFilter]);

  const todays = sortMatchesByRelevance(relevantBase.filter((m) => m.raw_date === today && m.status !== "finished"));

  // Bônus de prioridade quando o jogo possui bares parceiros vinculados em Prudente.
  const venuesBoost = (slug: string) => {
    const m = metaMap[slug];
    if (!m || !m.venuesCount) return 0;
    let s = 35;                          // tem bar vinculado
    if (m.venuesCount >= 2) s += 15;     // múltiplos bares
    if (m.hasStream) s += 10;            // stream oficial cadastrado
    return s;
  };

  // "HOJE TEM" — prefere jogo do dia com bares vinculados; se ninguém tiver, mantém o ranking padrão.
  const hojeTem = useMemo(() => {
    if (!todays.length) return null;
    const withBars = todays.filter((m) => (metaMap[m.slug]?.venuesCount ?? 0) > 0);
    return withBars[0] ?? todays[0];
  }, [todays, metaMap]);

  // "Mais buscados": mistura views reais + brasileiros + livescore + Copa do Brasil + highlights + bares vinculados.
  const maisBuscados = useMemo(() => {
    const limit = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const candidates = matches.filter(
      (m) => new Date(m.match_time).getTime() <= limit && m.status !== "finished" && (
        isHighlightedMatch(m) ||
        isPriorityTeam(m.home_team) || isPriorityTeam(m.away_team) ||
        /copa do brasil|libertadores|brasileir/i.test(m.league_label || "") ||
        (metaMap[m.slug]?.venuesCount ?? 0) > 0
      ),
    );
    const boost = (m: NormalizedMatch): number => {
      const e = enrichMap[m.slug];
      let s = (e?.views ?? 0) * 3;
      if (isPriorityTeam(m.home_team) || isPriorityTeam(m.away_team)) s += 40;
      if (/copa do brasil/i.test(m.league_label || "")) s += 60;
      if (/libertadores/i.test(m.league_label || "")) s += 50;
      if (/brasileir/i.test(m.league_label || "")) s += 30;
      if (e?.status === "live" || m.status === "live") s += 120;
      if (e?.highlight) s += 25;
      s += venuesBoost(m.slug);
      return s;
    };
    const sorted = [...candidates].sort((a, b) => boost(b) - boost(a));
    if (sorted.every((m) => boost(m) === boost(sorted[0]))) return sortMatchesByRelevance(candidates).slice(0, 8);
    return sorted.slice(0, 8);
  }, [matches, enrichMap, metaMap]);

  // KPI strip — números agregados
  const kpis = useMemo(() => {
    const liveCount = matches.filter((m) => m.status === "live").length;
    const barsTransmitting = Object.values(metaMap).reduce((acc, m) => acc + (m?.venuesCount ?? 0), 0);
    const activeChats = Object.values(metaMap).filter((m) => m?.hasActiveChat).length;
    return { liveCount, barsTransmitting, activeChats };
  }, [matches, metaMap]);


  // Resultados recentes (últimos 3 dias) e jogos ao vivo (vindos de sports_matches)
  const { data: recentResults = [] } = useFootballResults({ range: "last3", limit: 6 });
  const { data: liveMatches = [] } = useLiveMatches();

  const groups = groupMatchesByDate(filtered);

  const scrollToProximos = () => {
    document.getElementById("proximos")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleTeamClick = (team: string) => {
    setTeamFilter((prev) => (prev === team ? null : team));
    setFilter("semana");
    setTimeout(scrollToProximos, 80);
  };


  return (
    <div className="min-h-screen bg-background pb-24">
      <SEO
        title="Jogos de Hoje e Onde Assistir Futebol em Presidente Prudente | Roxou"
        description="Veja jogos de hoje, próximos jogos de times brasileiros, bares que transmitem futebol, placares, tabelas e transmissões oficiais em Presidente Prudente."
        canonical="https://roxou.com.br/jogos"
        keywords="jogos de hoje, futebol prudente, onde assistir futebol, brasileirão, libertadores, champions, copa do brasil, bares com futebol presidente prudente"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Onde assistir aos jogos de hoje em Presidente Prudente?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "A Roxou lista os bares e parceiros oficiais que transmitem futebol em Presidente Prudente. Veja os jogos de hoje e clique para descobrir onde assistir.",
              },
            },
            {
              "@type": "Question",
              name: "A Roxou transmite jogos pirata?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Não. Apenas indicamos bares parceiros e links oficiais cadastrados manualmente. Não promovemos transmissões irregulares.",
              },
            },
          ],
        }}
      />

      {/* HERO PREMIUM */}
      <header className="relative overflow-hidden border-b border-border/40">
        {/* Atmosfera de estádio */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/80 via-background to-yellow-900/30" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.25),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(34,197,94,0.18),transparent_60%)]" />
        {/* grid de estádio sutil */}
        <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(0deg,transparent_24%,rgba(255,255,255,0.4)_25%,rgba(255,255,255,0.4)_26%,transparent_27%,transparent_74%,rgba(255,255,255,0.4)_75%,rgba(255,255,255,0.4)_76%,transparent_77%,transparent)] bg-[length:60px_60px]" />

        <div className="relative mx-auto max-w-3xl px-4 py-8 md:py-12 text-center">
          <div className="inline-flex items-center gap-1.5 mb-4 rounded-full bg-yellow-500/15 border border-yellow-500/50 px-3 py-1.5 text-[11px] md:text-xs font-black text-yellow-300 shadow-[0_0_20px_-4px_rgba(234,179,8,0.5)]">
            <Trophy className="h-3.5 w-3.5" /> COPA NA ROXOU
          </div>
          <h1
            className="font-display font-black leading-[1.05] tracking-tight md:tracking-[-0.01em] mb-3 text-balance mx-auto max-w-[22ch]"
            style={{ fontSize: "clamp(1.5rem, 5vw, 2.75rem)" }}
          >
            <span className="block">Jogos de hoje e onde assistir</span>
            <span className="block bg-gradient-to-r from-yellow-300 via-green-300 to-primary bg-clip-text text-transparent">
              em Presidente Prudente
            </span>
          </h1>
          <p className="text-muted-foreground text-sm md:text-base mb-5 text-balance mx-auto max-w-[55ch]">
            Futebol ao vivo, bares parceiros, transmissões oficiais e próximos jogos dos times brasileiros.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => { setFilter("hoje"); scrollToProximos(); }}
              className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-bold shadow-[0_0_24px_-6px_hsl(var(--primary))] hover:scale-[1.02] transition"
            >
              <Calendar className="h-4 w-4" /> Ver jogos de hoje
            </button>
            <a
              href="#bares-esportivos"
              className="inline-flex items-center gap-2 rounded-full border border-yellow-500/50 bg-yellow-500/10 text-yellow-200 px-5 py-2.5 text-sm font-bold hover:bg-yellow-500/20 transition"
            >
              <Beer className="h-4 w-4" /> Ver bares esportivos
            </a>
          </div>
        </div>
      </header>

      {/* KPI strip */}
      {(kpis.liveCount > 0 || kpis.barsTransmitting > 0 || kpis.activeChats > 0) && (
        <div className="border-b border-border/40 bg-card/30">
          <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs md:text-sm font-bold">
            {kpis.liveCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-red-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                {kpis.liveCount} ao vivo
              </span>
            )}
            {kpis.barsTransmitting > 0 && (
              <span className="inline-flex items-center gap-1.5 text-emerald-300">
                🍻 {kpis.barsTransmitting} {kpis.barsTransmitting === 1 ? "bar transmitindo" : "bares transmitindo"}
              </span>
            )}
            {kpis.activeChats > 0 && (
              <span className="inline-flex items-center gap-1.5 text-fuchsia-300">
                💬 {kpis.activeChats} {kpis.activeChats === 1 ? "chat ativo" : "chats ativos"}
              </span>
            )}
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-10">
        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                filter === f.key
                  ? "bg-primary text-primary-foreground shadow-[0_0_18px_-6px_hsl(var(--primary))]"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* TIMES POPULARES */}
        <section aria-label="Times populares">
          <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Times populares
          </h2>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
            {POPULAR_TEAMS.map((t) => {
              const active = teamFilter === t.match;
              return (
                <button
                  key={t.match}
                  onClick={() => handleTeamClick(t.match)}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all ${
                    active
                      ? "border-yellow-500/60 bg-gradient-to-r from-yellow-500/20 to-green-500/20 text-yellow-200 shadow-[0_0_18px_-6px_rgba(234,179,8,0.7)]"
                      : "border-border/50 bg-card/50 hover:border-primary/50 hover:bg-card/70 text-foreground/80"
                  }`}
                >
                  <span>{t.emoji}</span>
                  {t.label}
                </button>
              );
            })}
            {teamFilter && (
              <button
                onClick={() => setTeamFilter(null)}
                className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground underline"
              >
                limpar
              </button>
            )}
          </div>
        </section>

        {isError ? (
          <FallbackState />
        ) : isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-card/40 animate-pulse border border-border/40" />
            ))}
          </div>
        ) : (
          <>
            {/* 🔥 HOJE TEM — destaque do dia */}
            {hojeTem && !teamFilter && (
              <section aria-label="Destaque do dia">
                <Link
                  to={`/jogo/${hojeTem.slug}`}
                  className="group relative block overflow-hidden rounded-3xl border border-yellow-500/40 bg-gradient-to-br from-emerald-950/80 via-background to-yellow-900/40 p-5 md:p-6 shadow-[0_0_45px_-12px_rgba(234,179,8,0.6)] hover:shadow-[0_0_60px_-8px_rgba(234,179,8,0.85)] hover:-translate-y-0.5 transition-all"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.18),transparent_60%)] pointer-events-none" />
                  <div className="relative flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                    <div className="inline-flex items-center gap-1.5 self-start rounded-full bg-orange-500/20 border border-orange-500/50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-orange-200 animate-glow-pulse">
                      <Zap className="h-3 w-3" /> Hoje tem
                    </div>

                    <div className="flex-1 flex items-center gap-3 md:gap-4">
                      {hojeTem.home_badge && (
                        <img src={hojeTem.home_badge} alt={hojeTem.home_team} className="h-14 w-14 md:h-20 md:w-20 object-contain drop-shadow-[0_0_12px_rgba(234,179,8,0.4)]" loading="lazy" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-display font-black text-base md:text-2xl leading-tight truncate">
                          {hojeTem.home_team}
                        </p>
                        <p className="text-yellow-300/80 font-black text-sm my-0.5">×</p>
                        <p className="font-display font-black text-base md:text-2xl leading-tight truncate">
                          {hojeTem.away_team}
                        </p>
                      </div>
                      {hojeTem.away_badge && (
                        <img src={hojeTem.away_badge} alt={hojeTem.away_team} className="h-14 w-14 md:h-20 md:w-20 object-contain drop-shadow-[0_0_12px_rgba(34,197,94,0.4)]" loading="lazy" />
                      )}
                    </div>

                    <div className="flex flex-col items-start md:items-end gap-1.5">
                      <p className="text-2xl md:text-3xl font-black text-yellow-300">
                        {formatMatchTime(hojeTem.match_time)}
                      </p>
                      <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                        {hojeTem.league_label}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300 font-semibold">
                        <MapPin className="h-3 w-3" /> Presidente Prudente
                      </span>
                      <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-1.5 text-xs font-black shadow-[0_0_18px_-6px_hsl(var(--primary))] group-hover:scale-[1.03] transition">
                        Ver onde assistir →
                      </span>
                    </div>
                  </div>
                  </Link>
                  <MatchVenuesQuickList bars={bars as any} title="Onde assistir esse jogo" />
                </section>
              )}

            {/* MAIS BUSCADOS HOJE */}
            {maisBuscados.length > 0 && (
              <section>
                <h2 className="font-display font-black text-xl mb-3 flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-400" /> Mais buscados
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">próximos 7 dias</span>
                </h2>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2 md:grid md:grid-cols-2 md:gap-3 md:overflow-visible md:mx-0 md:px-0 md:pb-0">
                  {maisBuscados.map((m) => (
                    <div key={m.external_id} className="w-[280px] shrink-0 md:w-auto">
                      <MatchCard
                        match={m}
                        compact
                        venuesCount={metaMap[m.slug]?.venuesCount}
                        hasStream={metaMap[m.slug]?.hasStream}
                        hasActiveChat={metaMap[m.slug]?.hasActiveChat}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* AO VIVO AGORA */}
            {liveMatches.length > 0 && (
              <section>
                <h2 className="font-display font-black text-xl mb-3 flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                  </span>
                  Ao vivo agora
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {liveMatches.map((m: any) => (
                    <Link
                      key={m.id}
                      to={`/jogo/${m.slug}`}
                      className="block rounded-xl border border-red-500/30 bg-gradient-to-br from-red-950/40 via-card/40 to-card/40 p-3 hover:border-red-500/60 transition shadow-[0_0_24px_-12px_rgba(239,68,68,0.6)]"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{m.league_label}</p>
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 border border-red-500/40 px-2 py-0.5 text-[9px] font-black text-red-300">
                          🔴 {m.current_minute || "AO VIVO"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                          {m.home_badge && <img src={m.home_badge} alt="" loading="lazy" className="h-6 w-6 object-contain shrink-0" />}
                          <span className="font-bold text-sm truncate">{m.home_team}</span>
                        </div>
                        <span className="font-display font-black text-lg tabular-nums">
                          {m.home_score ?? 0} <span className="text-muted-foreground">×</span> {m.away_score ?? 0}
                        </span>
                        <div className="flex-1 flex items-center gap-2 min-w-0 justify-end">
                          <span className="font-bold text-sm truncate text-right">{m.away_team}</span>
                          {m.away_badge && <img src={m.away_badge} alt="" loading="lazy" className="h-6 w-6 object-contain shrink-0" />}
                        </div>
                      </div>
                      {(() => {
                        const meta = metaMap[m.slug];
                        const v = meta?.venuesCount ?? 0;
                        const hs = meta?.hasStream;
                        const hc = meta?.hasActiveChat;
                        if (!v && !hs && !hc) return null;
                        return (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-red-500/20 text-[10px] font-bold">
                            {v > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-2 py-0.5 text-emerald-300">
                                🍻 {v} {v === 1 ? "bar" : "bares"}
                              </span>
                            )}
                            {hs && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 border border-purple-500/40 px-2 py-0.5 text-purple-200">
                                📺 Stream
                              </span>
                            )}
                            {hc && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/40 px-2 py-0.5 text-fuchsia-300">
                                💬 Chat ativo
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* RESULTADOS RECENTES */}
            {recentResults.length > 0 && (
              <section>
                <h2 className="font-display font-black text-xl mb-3 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-400" /> Resultados recentes
                  </span>
                  <Link to="/resultados" className="text-[11px] font-bold text-primary hover:underline">
                    Ver todos →
                  </Link>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {recentResults.map((r) => <ResultMatchCard key={r.slug + r.match_time} match={r} />)}
                </div>
              </section>
            )}

            {/* TABELAS DOS CAMPEONATOS */}
            <section>
              <h2 className="font-display font-black text-xl mb-3 flex items-center gap-2">
                <ListOrdered className="h-5 w-5 text-primary" /> Tabelas dos campeonatos
              </h2>
              <Suspense fallback={<div className="h-40 rounded-xl bg-card/30 animate-pulse" />}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <LeagueTable leagueSlug="brasileirao" limit={6} topZone={6} relegationZone={4} showFullLink />
                  <LeagueTable leagueSlug="libertadores" limit={6} topZone={2} showFullLink />
                  <LeagueTable leagueSlug="champions" limit={6} topZone={8} showFullLink />
                </div>
              </Suspense>
            </section>

            {/* Destaque Copa */}
            {hasCopa && filter !== "copa" && (
              <section>
                <h2 className="font-display font-black text-xl mb-3 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-400" /> Copa na Roxou
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sortMatchesByRelevance(matches.filter((m) => m.is_world_cup)).slice(0, 4).map((m) => (
                    <PriorityMatchBlock key={m.external_id} match={m} bars={bars as any} meta={metaMap[m.slug]} />
                  ))}
                </div>
              </section>
            )}

            {/* Jogos de hoje */}
            {filter !== "hoje" && todays.length > 0 && (
              <section>
                <h2 className="font-display font-black text-xl mb-3 flex items-center gap-2">
                  <Radio className="h-5 w-5 text-primary" /> Jogos de hoje
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {todays.map((m) => <PriorityMatchBlock key={m.external_id} match={m} bars={bars as any} meta={metaMap[m.slug]} />)}
                </div>
              </section>
            )}

            {/* Lista filtrada */}
            <section id="proximos">
              <h2 className="font-display font-black text-xl mb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" /> Próximos jogos
              </h2>
              {groups.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">
                  Nenhum jogo neste filtro. Tente outro período.
                </p>
              ) : (
                groups.map((g) => (
                  <div key={g.dateKey} className="mb-6">
                    <h3 className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2">
                      {g.label}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {sortMatchesByRelevance(g.matches).map((m) => <PriorityMatchBlock key={m.external_id} match={m} bars={bars as any} meta={metaMap[m.slug]} />)}
                    </div>
                  </div>
                ))
              )}
            </section>
          </>
        )}

        {/* Bares premium — APENAS curadoria real */}
        <section id="bares-esportivos">
          <h2 className="font-display font-black text-xl mb-3 flex items-center gap-2">
            <Beer className="h-5 w-5 text-primary" /> Bares que transmitem futebol em Prudente
          </h2>
          {bars.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/50 bg-card/30 p-8 text-center">
              <Tv className="h-9 w-9 text-muted-foreground/60 mx-auto mb-3" />
              <p className="font-semibold mb-1">Nenhum bar parceiro confirmou transmissão para os próximos jogos ainda.</p>
              <p className="text-sm text-muted-foreground">Novos bares esportivos serão adicionados em breve.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {bars.map((b: any) => (
                <Link
                  key={b.id}
                  to={`/local/${b.slug}`}
                  className="group rounded-2xl border border-border/50 bg-card/60 hover:border-primary/60 hover:shadow-[0_0_24px_-12px_hsl(var(--primary)/0.55)] p-4 transition-all hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-bold text-sm line-clamp-1">{b.name}</p>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-300">
                      <Tv className="h-2.5 w-2.5" /> {b._matchLinked ? "Transmissão confirmada" : "Futebol ao vivo"}
                    </span>
                  </div>
                  {b.neighborhood && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {b.neighborhood}
                    </p>
                  )}
                  {b.type && (
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{b.type}</p>
                  )}
                  <span className="mt-3 inline-block text-[11px] font-bold text-primary group-hover:underline">
                    Ver local →
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* SEO Footer */}
        <section className="border-t border-border/40 pt-8">
          <h2 className="font-display font-black text-2xl mb-3">
            Onde assistir futebol em Presidente Prudente
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-3xl">
            Na Roxou você acompanha os principais jogos de hoje, próximos jogos dos times brasileiros,
            resultados, tabelas e bares que transmitem futebol em Presidente Prudente.
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            <Link to="/resultados" className="rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition">
              Resultados recentes
            </Link>
            <Link to="/tabela/brasileirao" className="rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition">
              Tabela do Brasileirão
            </Link>
            <Link to="/tabela/libertadores" className="rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition">
              Tabela da Libertadores
            </Link>
            <Link to="/tabela/champions" className="rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition">
              Tabela da Champions
            </Link>
            <Link to="/agenda" className="rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition">
              Agenda de eventos
            </Link>
            <Link to="/indica" className="rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition">
              Bares em Prudente
            </Link>
            <a href="#bares-esportivos" className="rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition">
              Locais esportivos
            </a>
          </div>

          {/* FAQ */}
          <h3 className="font-display font-black text-lg mt-8 mb-3">Perguntas frequentes</h3>
          <div className="space-y-3 text-sm">
            <details className="rounded-lg border border-border/40 bg-card/40 p-3">
              <summary className="cursor-pointer font-semibold">Os horários estão em qual fuso?</summary>
              <p className="text-muted-foreground mt-2">Todos os horários são exibidos em Brasília (America/Sao_Paulo).</p>
            </details>
            <details className="rounded-lg border border-border/40 bg-card/40 p-3">
              <summary className="cursor-pointer font-semibold">Como sei onde assistir cada jogo?</summary>
              <p className="text-muted-foreground mt-2">Clique no card do jogo para ver bares parceiros que transmitem aquela partida em Presidente Prudente.</p>
            </details>
            <details className="rounded-lg border border-border/40 bg-card/40 p-3">
              <summary className="cursor-pointer font-semibold">A Roxou tem transmissão ao vivo?</summary>
              <p className="text-muted-foreground mt-2">Apenas quando há link oficial cadastrado pelo nosso time. Não promovemos transmissões irregulares.</p>
            </details>
          </div>
        </section>
      </main>
    </div>
  );
}

function FallbackState() {
  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 p-8 text-center">
      <Trophy className="h-10 w-10 text-primary mx-auto mb-3 opacity-60" />
      <p className="font-semibold mb-1">A agenda de jogos está sendo atualizada.</p>
      <p className="text-sm text-muted-foreground">
        Em breve você verá jogos, horários e bares transmitindo aqui.
      </p>
    </div>
  );
}
