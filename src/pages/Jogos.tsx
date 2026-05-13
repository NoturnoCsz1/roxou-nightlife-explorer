import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Trophy, Radio, Beer, Calendar, MapPin, Flame, Sparkles, Tv, Zap } from "lucide-react";
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
  type NormalizedMatch,
} from "@/lib/theSportsDb";
import MatchCard from "@/components/jogos/MatchCard";
import MatchVenuesQuickList from "@/components/jogos/MatchVenuesQuickList";
import { useMatchMeta, type MatchMetaMap } from "@/hooks/useMatchMeta";


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

  const { data: matches = [], isLoading, isError } = useQuery({
    queryKey: ["jogos-public"],
    queryFn: getFeaturedFootballEvents,
    staleTime: 1000 * 60 * 10,
  });

  const { data: bars = [] } = useQuery({
    queryKey: ["jogos-bares-prudente"],
    queryFn: async () => {
      const { data } = await supabase
        .from("partners")
        .select("id, name, slug, neighborhood, type")
        .eq("city", "Presidente Prudente")
        .in("type", ["bar", "restaurante", "boteco", "pub"])
        .limit(12);
      return data ?? [];
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

  // Views agregados (vindos de sports_matches) para "Mais buscados"
  const { data: viewsMap = {} } = useQuery({
    queryKey: ["sports-matches-views", allSlugs.slice().sort().join("|")],
    enabled: allSlugs.length > 0,
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<Record<string, number>> => {
      const { data } = await supabase
        .from("sports_matches")
        .select("slug, views_count")
        .in("slug", allSlugs);
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: any) => { map[r.slug] = r.views_count ?? 0; });
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
      const t = norm(teamFilter);
      list = list.filter((m) => norm(m.home_team).includes(t) || norm(m.away_team).includes(t));
    }
    return list;
  }, [matches, relevantBase, filter, today, tomorrow, teamFilter]);

  const todays = sortMatchesByRelevance(relevantBase.filter((m) => m.raw_date === today && m.status !== "finished"));

  // "HOJE TEM" — jogo mais relevante do dia
  const hojeTem = useMemo(() => todays[0] ?? null, [todays]);

  // "Mais buscados": ordena por views reais quando existir; fallback p/ relevância.
  const maisBuscados = useMemo(() => {
    const limit = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const candidates = matches.filter(
      (m) => isHighlightedMatch(m) && new Date(m.match_time).getTime() <= limit && m.status !== "finished",
    );
    const totalViews = candidates.reduce((s, m) => s + (viewsMap[m.slug] ?? 0), 0);
    const sorted = totalViews > 0
      ? [...candidates].sort((a, b) => (viewsMap[b.slug] ?? 0) - (viewsMap[a.slug] ?? 0))
      : sortMatchesByRelevance(candidates);
    return sorted.slice(0, 8);
  }, [matches, viewsMap]);

  // KPI strip — números agregados
  const kpis = useMemo(() => {
    const liveCount = matches.filter((m) => m.status === "live").length;
    const barsTransmitting = Object.values(metaMap).reduce((acc, m) => acc + (m?.venuesCount ?? 0), 0);
    const activeChats = Object.values(metaMap).filter((m) => m?.hasActiveChat).length;
    return { liveCount, barsTransmitting, activeChats };
  }, [matches, metaMap]);


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
        title="Jogos de hoje em Presidente Prudente | Roxou"
        description="Confira jogos de hoje, Copa do Mundo, Brasileirão, Copa do Brasil, Libertadores, Champions League e bares transmitindo futebol em Presidente Prudente."
        canonical="https://roxou.com.br/jogos"
        keywords="jogos hoje, copa do mundo, brasileirão, bares futebol prudente, presidente prudente"
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

        <div className="relative mx-auto max-w-6xl px-4 py-10 md:py-16 grid md:grid-cols-[1.15fr_1fr] gap-6 md:gap-10 items-center">
          {/* Texto */}
          <div className="order-2 md:order-1 max-w-[34ch] md:max-w-[28ch]">
            <div className="inline-flex items-center gap-1.5 mb-4 rounded-full bg-yellow-500/15 border border-yellow-500/50 px-3 py-1.5 text-[11px] md:text-xs font-black text-yellow-300 shadow-[0_0_20px_-4px_rgba(234,179,8,0.5)]">
              <Trophy className="h-3.5 w-3.5" /> COPA NA ROXOU
            </div>
            <h1
              className="font-display font-black leading-[0.95] tracking-tight md:tracking-[-0.01em] mb-3 text-balance"
              style={{ fontSize: "clamp(1.75rem, 6.2vw, 3.25rem)", wordBreak: "keep-all", hyphens: "none" }}
            >
              <span className="block">JOGOS, TRANSMISSÕES E</span>
              <span className="block bg-gradient-to-r from-yellow-300 via-green-300 to-primary bg-clip-text text-transparent">
                BARES PARA ASSISTIR
              </span>
              <span className="block">FUTEBOL EM PRUDENTE</span>
            </h1>
            <p className="text-muted-foreground text-sm md:text-base mb-5 text-balance">
              Veja os principais jogos do dia, bares transmitindo e acompanhe a emoção da Copa, Brasileirão,
              Libertadores e Champions na Roxou.
            </p>
            <div className="flex flex-wrap gap-2">
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

          {/* Visual cinematográfico — estádio Champions/Copa, sem IA genérica */}
          <div className="order-1 md:order-2 relative mx-auto md:mx-0 w-full max-w-[420px]">
            <div className="relative aspect-[4/3] md:aspect-[5/4] w-full rounded-3xl overflow-hidden ring-1 ring-yellow-500/30 shadow-[0_0_60px_-12px_rgba(234,179,8,0.55)]">
              {/* Camada base — gramado + iluminação de estádio */}
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-900 via-emerald-950 to-background" />
              {/* Spotlights superiores */}
              <div className="absolute -top-10 left-1/4 h-40 w-40 rounded-full bg-yellow-300/40 blur-3xl animate-glow-pulse" />
              <div className="absolute -top-10 right-1/4 h-40 w-40 rounded-full bg-green-300/30 blur-3xl animate-glow-pulse" />
              {/* Fumaça verde/amarela */}
              <div className="absolute bottom-0 left-0 h-1/2 w-2/3 bg-[radial-gradient(ellipse_at_bottom_left,rgba(234,179,8,0.45),transparent_70%)]" />
              <div className="absolute bottom-0 right-0 h-1/2 w-2/3 bg-[radial-gradient(ellipse_at_bottom_right,rgba(34,197,94,0.45),transparent_70%)]" />
              {/* Linhas de campo */}
              <div className="absolute inset-x-0 bottom-0 h-1/2 [perspective:600px]">
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0 2px, transparent 2px 60px), repeating-linear-gradient(0deg, rgba(255,255,255,0.10) 0 1px, transparent 1px 30px)",
                    transform: "rotateX(55deg) translateY(20%)",
                    transformOrigin: "bottom",
                  }}
                />
              </div>
              {/* Bandeira BR estilizada (losango central) */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative animate-aura-float">
                  <div className="absolute -inset-6 rounded-full bg-gradient-to-br from-yellow-400/40 via-green-500/30 to-primary/40 blur-2xl animate-glow-pulse" />
                  <div className="relative h-24 w-24 md:h-28 md:w-28 rotate-45 rounded-md bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.6)] flex items-center justify-center">
                    <div className="h-12 w-12 md:h-14 md:w-14 -rotate-45 rounded-full bg-emerald-700 ring-4 ring-emerald-900/50 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-yellow-300" />
                    </div>
                  </div>
                </div>
              </div>
              {/* Partículas */}
              <div className="absolute inset-0 opacity-60 mix-blend-screen bg-[radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.12)_1px,transparent_2px),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.10)_1px,transparent_2px),radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.08)_1px,transparent_2px)] bg-[length:120px_120px,180px_180px,90px_90px]" />
              {/* Vinheta + label */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-background/70 backdrop-blur px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-yellow-300 border border-yellow-500/40">
                <Sparkles className="h-3 w-3" /> Roxou Sports
              </span>
            </div>
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
                  {todays.map((m) => <PriorityMatchBlock key={m.external_id} match={m} bars={bars as any} />)}
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
                      {sortMatchesByRelevance(g.matches).map((m) => <PriorityMatchBlock key={m.external_id} match={m} bars={bars as any} />)}
                    </div>
                  </div>
                ))
              )}
            </section>
          </>
        )}

        {/* Bares premium */}
        <section id="bares-esportivos">
          <h2 className="font-display font-black text-xl mb-3 flex items-center gap-2">
            <Beer className="h-5 w-5 text-primary" /> Bares que transmitem futebol em Prudente
          </h2>
          {bars.length === 0 ? (
            <p className="text-muted-foreground text-sm">Em breve adicionaremos parceiros para você assistir os jogos.</p>
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
                      <Tv className="h-2.5 w-2.5" /> Transmite
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
            A Roxou reúne bares, pubs e restaurantes que transmitem os principais jogos de futebol em Presidente Prudente.
            Veja onde assistir Brasileirão, Copa do Brasil, Libertadores, Champions League, Copa do Mundo e jogos da
            Seleção Brasileira com a melhor curadoria local.
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            <Link to="/agenda" className="rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition">
              Ver agenda de eventos
            </Link>
            <Link to="/indica" className="rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition">
              Ver bares em Prudente
            </Link>
            <button
              onClick={() => { setFilter("hoje"); document.getElementById("proximos")?.scrollIntoView({ behavior: "smooth" }); }}
              className="rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition"
            >
              Ver jogos de hoje
            </button>
            <a href="#bares-esportivos" className="rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition">
              Ver locais esportivos
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
