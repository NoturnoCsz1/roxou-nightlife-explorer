import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Tv,
  Beer,
  Calendar,
  MapPin,
  ListOrdered,
  Trophy,
  ArrowRight,
  Radio,
  ExternalLink,
} from "lucide-react";
import SEO from "@/components/SEO";
import WorldCupRibbon from "@/components/season/WorldCupRibbon";
import WorldCupBadge from "@/components/season/WorldCupBadge";
import { worldCupTheme as wc } from "@/themes/worldCupTheme";
import { supabase } from "@/integrations/supabase/client";
import {
  getFeaturedFootballEvents,
  sortMatchesByRelevance,
  isBrazilPriority,
  isBrazilSelecao,
  isSerieB,
  isBrazilianTeam,
  mergeMatches,
  sportsMatchRowToNormalized,
  formatMatchTime,
  toYouTubeEmbedUrl,
  type NormalizedMatch,
  type SportsMatchRow,
} from "@/lib/theSportsDb";
import MatchCard from "@/components/jogos/MatchCard";
import ResultMatchCard from "@/components/jogos/ResultMatchCard";
import { useMatchMeta } from "@/hooks/useMatchMeta";
import { useFootballResults, useLiveMatches } from "@/hooks/useFootballResults";
import { todayKeySP } from "@/lib/dateUtils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";



/* ────────────────────────────────────────────────────────────
 * /jogos — redesign focado em "Onde assistir em Prudente"
 * Hierarquia: Hero → Hoje → Onde assistir (events) → Brasil → Bares → Tabela/Resultados
 * ──────────────────────────────────────────────────────────── */

type TransmissionRow = {
  id: string;
  slug: string;
  title: string;
  date_time: string;
  venue_name: string | null;
  address: string | null;
  image_url: string | null;
  transmission_channel: string | null;
  transmission_url: string | null;
  transmission_notes: string | null;
  sports_match_id: string | null;
  partner: { name: string; slug: string; logo_url: string | null; neighborhood: string | null } | null;
  match: {
    home_team: string;
    away_team: string;
    league_label: string | null;
    match_time: string;
    home_badge: string | null;
    away_badge: string | null;
    slug: string;
  } | null;
};

export default function Jogos() {
  const today = todayKeySP();

  // ─── Jogos: API + DB ──────────────────────────────────────
  const { data: apiMatches = [], isLoading: loadingApi, isError } = useQuery({
    queryKey: ["jogos-public-api"],
    queryFn: getFeaturedFootballEvents,
    staleTime: 1000 * 60 * 10,
  });

  const { data: dbMatches = [], isLoading: loadingDb } = useQuery({
    queryKey: ["jogos-public-db"],
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<NormalizedMatch[]> => {
      const fromIso = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
      const toIso = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("sports_matches")
        .select(
          "external_id, league_id, league_name, league_label, category, season, home_team, away_team, home_badge, away_badge, match_time, status, venue_name, youtube_url, slug, is_world_cup, priority",
        )
        .gte("match_time", fromIso)
        .lte("match_time", toIso)
        .order("match_time", { ascending: true })
        .limit(500);
      return (data ?? []).map((r) => sportsMatchRowToNormalized(r as SportsMatchRow));
    },
  });

  const isLoading = loadingApi || loadingDb;
  const matches = useMemo(() => mergeMatches(apiMatches, dbMatches), [apiMatches, dbMatches]);
  const allSlugs = useMemo(() => Array.from(new Set(matches.map((m) => m.slug))), [matches]);
  const { data: metaMap = {} } = useMatchMeta(allSlugs);

  // ─── Bares parceiros ──────────────────────────────────────
  const { data: bars = [] } = useQuery({
    queryKey: ["jogos-bares-prudente-sports"],
    staleTime: 1000 * 60 * 15,
    queryFn: async () => {
      const { data } = await supabase
        .from("partners")
        .select("id, name, slug, neighborhood, type, supports_sports, address, logo_url, whatsapp")
        .eq("city", "Presidente Prudente")
        .eq("active", true)
        .eq("supports_sports", true)
        .limit(24);
      return data ?? [];
    },
  });

  // ─── NOVO: eventos com transmissão cadastrada ────────────
  const { data: transmissions = [] } = useQuery<TransmissionRow[]>({
    queryKey: ["jogos-events-transmission"],
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const fromIso = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      const toIso = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("events")
        .select(
          "id, slug, title, date_time, venue_name, address, image_url, transmission_channel, transmission_url, transmission_notes, sports_match_id, partner:partner_id(name, slug, logo_url, neighborhood), match:sports_match_id(home_team, away_team, league_label, match_time, home_badge, away_badge, slug)",
        )
        .eq("status", "published")
        .eq("is_sports_transmission", true)
        .gte("date_time", fromIso)
        .lte("date_time", toIso)
        .order("date_time", { ascending: true })
        .limit(40);
      return (data ?? []) as any;
    },
  });

  // ─── Resultados & live ────────────────────────────────────
  const { data: recentResults = [] } = useFootballResults({ range: "last3", limit: 4 });
  const { data: liveMatches = [] } = useLiveMatches();

  const mergedLive = useMemo(() => {
    const map = new Map<string, any>();
    (liveMatches as any[]).forEach((m) => m?.slug && map.set(m.slug, m));
    matches.forEach((m) => {
      if (m.status === "live" && !map.has(m.slug)) map.set(m.slug, m);
    });
    return Array.from(map.values()).slice(0, 4);
  }, [liveMatches, matches]);

  // ─── Jogos de hoje (Brasil-first) ─────────────────────────
  const todays = useMemo(
    () =>
      sortMatchesByRelevance(
        matches.filter(
          (m) =>
            m.raw_date === today &&
            m.status !== "finished" &&
            !isSerieB(m) &&
            isBrazilPriority(m),
        ),
      ).slice(0, 6),
    [matches, today],
  );

  // ─── Próximos jogos do Brasil (7 dias) ────────────────────
  const destaquesBrasil = useMemo(() => {
    const limit = Date.now() + 7 * 24 * 60 * 60 * 1000;
    return sortMatchesByRelevance(
      matches.filter(
        (m) =>
          m.status !== "finished" &&
          new Date(m.match_time).getTime() <= limit &&
          isBrazilPriority(m) &&
          !isSerieB(m),
      ),
    ).slice(0, 6);
  }, [matches]);

  // ─── Carrossel compacto (Hoje → Brasil → próximos 7d) ─────
  const carouselMatches = useMemo(() => {
    const now = Date.now();
    const limit7d = now + 7 * 24 * 60 * 60 * 1000;
    const future = matches.filter(
      (m) => m.status !== "finished" && new Date(m.match_time).getTime() > now - 2 * 60 * 60 * 1000,
    );
    const todayList = sortMatchesByRelevance(future.filter((m) => m.raw_date === today));
    const brasilList = sortMatchesByRelevance(
      future.filter((m) => m.raw_date !== today && isBrazilPriority(m) && !isSerieB(m)),
    );
    const restList = future
      .filter((m) => new Date(m.match_time).getTime() <= limit7d)
      .sort((a, b) => new Date(a.match_time).getTime() - new Date(b.match_time).getTime());
    const seen = new Set<string>();
    const out: NormalizedMatch[] = [];
    for (const m of [...todayList, ...brasilList, ...restList]) {
      const k = m.external_id || m.slug;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(m);
      if (out.length >= 12) break;
    }
    return out;
  }, [matches, today]);


  const transmissionCount = transmissions.length;
  const liveCount = mergedLive.length;
  const barsCount = bars.length;

  // ─── SEO ─────────────────────────────────────────────────
  const seoTitle = "Onde Assistir Futebol em Presidente Prudente | Roxou";
  const seoDescription =
    "Descubra bares em Presidente Prudente que transmitem futebol ao vivo. Veja jogos de hoje, próximos jogos do Brasil e onde assistir Brasileirão, Libertadores e Copa do Mundo.";

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEO
        title={seoTitle}
        description={seoDescription}
        canonical="https://roxou.com.br/jogos"
        keywords="onde assistir futebol em prudente, bares futebol presidente prudente, jogos hoje, brasileirão, libertadores, copa do mundo, roxou jogos"
        ogType="website"
      />

      {/* ═══════════ HEADER COMPACTO ═══════════ */}
      <header className="relative border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background pointer-events-none" />
        <div className="relative mx-auto max-w-5xl px-4 pt-4 pb-3">
          <h1 className="font-display font-black text-lg md:text-2xl text-foreground leading-tight flex items-center gap-2">
            <span aria-hidden>⚽</span> Jogos na Roxou
          </h1>
          <p className="text-[12px] md:text-sm text-muted-foreground mt-0.5">
            Veja onde assistir futebol em Prudente
            {liveCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-red-400 font-bold">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                </span>
                {liveCount} ao vivo
              </span>
            )}
          </p>
        </div>

        {/* Carrossel horizontal */}
        <div className="relative mx-auto max-w-5xl pb-4">
          {isLoading ? (
            <div className="flex gap-3 overflow-x-auto px-4 scrollbar-hide snap-x snap-mandatory">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="snap-start shrink-0 w-[240px] h-[132px] rounded-2xl bg-card/40 border border-border/40 animate-pulse"
                />
              ))}
            </div>
          ) : carouselMatches.length === 0 ? (
            <div className="mx-4">
              <EmptyCard
                icon="📅"
                title="Nenhum jogo nos próximos dias"
                body="Volte em breve para conferir a próxima rodada."
              />
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto px-4 scrollbar-hide snap-x snap-mandatory">
              {carouselMatches.map((m) => (
                <CarouselMatchCard key={m.external_id || m.slug} match={m} todayKey={today} />
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 md:py-10 space-y-10 md:space-y-14">

        <Section
          id="onde-assistir"
          eyebrow="Bares transmitindo"
          title="Onde assistir em Prudente"
          subtitle="Eventos com transmissão confirmada em locais parceiros"
          icon={<Tv className="h-4 w-4" />}
          accent="emerald"
        >
          {transmissions.length === 0 ? (
            <EmptyCard
              icon="📺"
              title="Nenhuma transmissão confirmada por enquanto"
              body="Os bares parceiros ainda não publicaram transmissões para os próximos dias. Veja a lista de bares logo abaixo."
              cta={{ to: "#bares-esportivos", label: "Ver bares parceiros" }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {transmissions.map((t) => (
                <TransmissionCard key={t.id} item={t} />
              ))}
            </div>
          )}
        </Section>

        {/* ═══════════ PRÓXIMOS JOGOS DO BRASIL ═══════════ */}
        {destaquesBrasil.length > 0 && (
          <Section
            eyebrow="🇧🇷 Brasil"
            title="Próximos jogos do Brasil"
            subtitle="Seleção, Brasileirão, Copa do Brasil e Libertadores"
            icon={<Trophy className="h-4 w-4" />}
            accent="yellow"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {destaquesBrasil.map((m) => (
                <MatchCard
                  key={m.external_id || m.slug}
                  match={m}
                  venuesCount={metaMap[m.slug]?.venuesCount}
                  hasStream={metaMap[m.slug]?.hasStream}
                  hasActiveChat={metaMap[m.slug]?.hasActiveChat}
                  compact
                />
              ))}
            </div>
          </Section>
        )}

        {/* ═══════════ BARES QUE TRANSMITEM ═══════════ */}
        <Section
          id="bares-esportivos"
          eyebrow="Parceiros"
          title="Bares que transmitem futebol"
          subtitle="Locais parceiros em Presidente Prudente"
          icon={<Beer className="h-4 w-4" />}
        >
          {bars.length === 0 ? (
            <EmptyCard
              icon="🍻"
              title="Em breve, bares parceiros transmitindo aqui"
              body="Estamos cadastrando os melhores bares esportivos da cidade."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {bars.map((b: any) => (
                <BarCard key={b.id} bar={b} />
              ))}
            </div>
          )}
        </Section>

        {/* ═══════════ TABELAS & RESULTADOS (compacto) ═══════════ */}
        <Section
          eyebrow="Estatísticas"
          title="Tabelas e resultados"
          subtitle="Aprofunde-se nos campeonatos"
          icon={<ListOrdered className="h-4 w-4" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <QuickLink
              to="/tabela/brasileirao"
              icon="🏆"
              title="Tabela do Brasileirão"
              subtitle="Classificação completa Série A"
            />
            <QuickLink
              to="/tabela/libertadores"
              icon="🌎"
              title="Tabela da Libertadores"
              subtitle="Grupos e classificação"
            />
            <QuickLink
              to="/tabela/champions"
              icon="⭐"
              title="Champions League"
              subtitle="Tabela e jogos"
            />
            <QuickLink
              to="/resultados"
              icon="📊"
              title="Resultados recentes"
              subtitle="Últimos placares"
            />
          </div>

          {recentResults.length > 0 && (
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground mb-3 flex items-center gap-1.5">
                <Trophy className="h-3 w-3" /> Últimos resultados
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recentResults.slice(0, 4).map((r: any) => (
                  <ResultMatchCard key={r.id || r.slug} match={r} />
                ))}
              </div>
            </div>
          )}
        </Section>
      </main>

    </div>
  );
}

/* ═══════════════════════════════════════════════════════
 * Componentes internos
 * ═══════════════════════════════════════════════════════ */

function Section({
  id,
  eyebrow,
  title,
  subtitle,
  icon,
  children,
  accent,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  accent?: "emerald" | "yellow";
}) {
  const accentColor =
    accent === "emerald"
      ? "text-emerald-300"
      : accent === "yellow"
        ? "text-yellow-300"
        : "text-primary";
  return (
    <section id={id} className="scroll-mt-20">
      <div className="mb-5">
        {eyebrow && (
          <p
            className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] ${accentColor} mb-2`}
          >
            {icon}
            {eyebrow}
          </p>
        )}
        <h2 className="font-display font-black text-2xl md:text-3xl text-foreground leading-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function CarouselMatchCard({ match, todayKey }: { match: NormalizedMatch; todayKey: string }) {
  const dt = new Date(match.match_time);
  const tomorrow = (() => {
    const d = new Date(todayKey + "T12:00:00-03:00");
    d.setDate(d.getDate() + 1);
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(d);
  })();
  const isToday = match.raw_date === todayKey;
  const isTomorrow = match.raw_date === tomorrow;
  const badgeLabel = isToday ? "Hoje" : isTomorrow ? "Amanhã" : "Próximo";
  const badgeClass = isToday
    ? "bg-primary/20 border-primary/50 text-primary"
    : isTomorrow
      ? "bg-yellow-500/15 border-yellow-500/40 text-yellow-300"
      : "bg-secondary/60 border-border/60 text-muted-foreground";
  const dateLabel = isToday || isTomorrow ? formatMatchTime(match.match_time) : format(dt, "EEE d/MM · HH'h'mm", { locale: ptBR });

  return (
    <Link
      to={`/jogo/${match.slug}`}
      className="snap-start shrink-0 w-[240px] rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md p-3 hover:border-primary/50 hover:bg-card/80 transition-all flex flex-col gap-2"
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${badgeClass}`}>
          {badgeLabel}
        </span>
        <span className="text-[10px] font-bold text-primary tabular-nums">{dateLabel}</span>
      </div>

      <div className="flex items-center gap-2 min-w-0">
        {match.home_badge ? (
          <img src={match.home_badge} alt="" className="h-5 w-5 object-contain shrink-0" loading="lazy" />
        ) : (
          <div className="h-5 w-5 rounded-full bg-primary/10 border border-primary/30 shrink-0" />
        )}
        <span className="font-display font-bold text-[12px] truncate flex-1">{match.home_team}</span>
      </div>
      <div className="flex items-center gap-2 min-w-0">
        {match.away_badge ? (
          <img src={match.away_badge} alt="" className="h-5 w-5 object-contain shrink-0" loading="lazy" />
        ) : (
          <div className="h-5 w-5 rounded-full bg-primary/10 border border-primary/30 shrink-0" />
        )}
        <span className="font-display font-bold text-[12px] truncate flex-1">{match.away_team}</span>
      </div>

      <p className="text-[10px] text-muted-foreground truncate">{match.league_label}</p>

      <span className="mt-auto inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-2 py-1 text-[11px] font-bold">
        <Tv className="h-3 w-3" /> Onde assistir
      </span>
    </Link>
  );
}



const CHANNEL_COLORS: Record<string, string> = {
  "GE TV": "bg-green-500/15 border-green-500/40 text-green-300",
  CazéTV: "bg-blue-500/15 border-blue-500/40 text-blue-300",
  SporTV: "bg-red-500/15 border-red-500/40 text-red-300",
  Premiere: "bg-yellow-500/15 border-yellow-500/40 text-yellow-300",
  YouTube: "bg-red-600/15 border-red-600/40 text-red-300",
  "TV aberta": "bg-fuchsia-500/15 border-fuchsia-500/40 text-fuchsia-200",
};

function TransmissionCard({ item }: { item: TransmissionRow }) {
  const dt = new Date(item.date_time);
  const matchLabel = item.match
    ? `${item.match.home_team} × ${item.match.away_team}`
    : null;
  const venue = item.partner?.name || item.venue_name || "Local parceiro";
  const channelClass = item.transmission_channel
    ? CHANNEL_COLORS[item.transmission_channel] ||
      "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
    : null;
  const mapsUrl = item.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        item.address + (item.venue_name ? `, ${item.venue_name}` : ""),
      )}`
    : null;

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-card/60 to-card/40 p-4 hover:border-emerald-400/60 hover:shadow-[0_0_30px_-12px_rgba(16,185,129,0.5)] transition-all">
      {/* Match */}
      {matchLabel ? (
        <div className="flex items-center gap-2 mb-2.5">
          <Radio className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
          <p className="text-[11px] font-black uppercase tracking-wider text-emerald-300">
            Transmissão de jogo
          </p>
        </div>
      ) : (
        <p className="text-[11px] font-black uppercase tracking-wider text-emerald-300 mb-2.5">
          📺 Transmissão
        </p>
      )}

      {matchLabel && (
        <p className="font-display font-bold text-base text-foreground leading-tight mb-1">
          {matchLabel}
        </p>
      )}
      {item.match?.league_label && (
        <p className="text-[11px] text-muted-foreground mb-3">{item.match.league_label}</p>
      )}

      {/* Venue */}
      <div className="flex items-center gap-2 mb-2.5">
        {item.partner?.logo_url ? (
          <img
            src={item.partner.logo_url}
            alt={venue}
            className="h-8 w-8 rounded-lg object-cover border border-border/40 shrink-0"
          />
        ) : (
          <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
            <Beer className="h-4 w-4 text-primary" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{venue}</p>
          {item.partner?.neighborhood && (
            <p className="text-[11px] text-muted-foreground truncate">
              {item.partner.neighborhood}
            </p>
          )}
        </div>
      </div>

      {/* Channel + date */}
      <div className="flex items-center gap-2 flex-wrap text-[11px] mb-3">
        {channelClass && (
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-bold ${channelClass}`}
          >
            <Tv className="h-3 w-3" />
            {item.transmission_channel}
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {format(dt, "EEE d/MM · HH'h'mm", { locale: ptBR })}
        </span>
      </div>

      {item.transmission_notes && (
        <p className="text-[12px] text-muted-foreground italic mb-3 line-clamp-2">
          {item.transmission_notes}
        </p>
      )}

      {/* CTAs */}
      <div className="flex gap-2">
        <Link
          to={`/evento/${item.slug}`}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3 py-2 text-xs font-bold hover:opacity-90 active:scale-95 transition"
        >
          Ver evento
          <ArrowRight className="h-3 w-3" />
        </Link>
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-border/60 bg-secondary/60 hover:bg-secondary px-3 py-2 text-xs font-bold text-foreground transition"
            title="Como chegar"
          >
            <MapPin className="h-3.5 w-3.5" />
          </a>
        )}
        {item.transmission_url && (
          <a
            href={item.transmission_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-2 text-xs font-bold text-emerald-300 transition"
            title="Link da transmissão"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

function BarCard({ bar }: { bar: any }) {
  const waUrl = bar.whatsapp
    ? `https://wa.me/${String(bar.whatsapp).replace(/\D/g, "")}`
    : null;
  const mapsUrl = bar.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        bar.address + ", " + bar.name,
      )}`
    : null;
  return (
    <div className="rounded-2xl border border-border/50 bg-card/50 p-4 hover:border-primary/40 hover:bg-card/70 transition-all">
      <Link to={`/local/${bar.slug}`} className="flex items-center gap-3 mb-3 group">
        {bar.logo_url ? (
          <img
            src={bar.logo_url}
            alt={bar.name}
            className="h-12 w-12 rounded-xl object-cover border border-border/40 shrink-0"
          />
        ) : (
          <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
            <Beer className="h-5 w-5 text-primary" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-display font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
            {bar.name}
          </h3>
          {bar.neighborhood && (
            <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {bar.neighborhood}
            </p>
          )}
        </div>
      </Link>
      <div className="flex gap-2">
        {waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-3 py-1.5 text-[11px] font-bold hover:bg-emerald-500/25 transition"
          >
            WhatsApp
          </a>
        )}
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-secondary/70 hover:bg-secondary border border-border/50 text-foreground px-3 py-1.5 text-[11px] font-bold transition"
          >
            <MapPin className="h-3 w-3" />
            Como chegar
          </a>
        )}
        {!waUrl && !mapsUrl && (
          <Link
            to={`/local/${bar.slug}`}
            className="flex-1 inline-flex items-center justify-center rounded-xl bg-secondary text-foreground px-3 py-1.5 text-[11px] font-bold hover:bg-secondary/80 transition"
          >
            Ver perfil
          </Link>
        )}
      </div>
    </div>
  );
}

function QuickLink({
  to,
  icon,
  title,
  subtitle,
}: {
  to: string;
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-2xl border border-border/50 bg-card/40 hover:border-primary/50 hover:bg-card/70 p-4 transition-all"
    >
      <span className="text-2xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-display font-bold text-sm text-foreground group-hover:text-primary transition-colors">
          {title}
        </p>
        <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}

function EmptyCard({
  icon,
  title,
  body,
  cta,
}: {
  icon: string;
  title: string;
  body: string;
  cta?: { to: string; label: string };
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-8 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="font-display font-bold text-base text-foreground mb-1">{title}</p>
      <p className="text-sm text-muted-foreground mb-4 mx-auto max-w-md">{body}</p>
      {cta && (
        <a
          href={cta.to}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/40 text-primary px-4 py-1.5 text-xs font-bold hover:bg-primary/25 transition"
        >
          {cta.label}
          <ArrowRight className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

function SkeletonGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-28 rounded-2xl bg-card/40 animate-pulse border border-border/40"
        />
      ))}
    </div>
  );
}
