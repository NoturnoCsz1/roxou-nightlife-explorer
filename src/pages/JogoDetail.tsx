import { useEffect, useMemo } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Clock, MapPin, Beer, Radio, ArrowLeft, Youtube, Tv, ExternalLink } from "lucide-react";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import {
  getFeaturedFootballEvents,
  formatMatchTime,
  type NormalizedMatch,
} from "@/lib/theSportsDb";
import FootballMatchChat from "@/components/jogos/FootballMatchChat";
import { trackMatchEvent, incrementMatchView } from "@/lib/matchTracking";

interface StreamRow {
  id: string;
  stream_url: string;
  stream_type: string;
  is_official: boolean;
}

/** Converte URL do YouTube/Twitch em URL embed. Retorna null se não der. */
function toEmbedUrl(url: string, type: string): string | null {
  try {
    const u = new URL(url);
    if (type === "youtube" || u.hostname.includes("youtube") || u.hostname.includes("youtu.be")) {
      const id =
        u.hostname.includes("youtu.be") ? u.pathname.slice(1)
        : u.searchParams.get("v")
        ?? u.pathname.split("/").pop();
      if (!id) return null;
      return `https://www.youtube.com/embed/${id}`;
    }
    if (type === "twitch" || u.hostname.includes("twitch")) {
      const channel = u.pathname.replace(/^\//, "").split("/")[0];
      if (!channel) return null;
      return `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}`;
    }
    return null;
  } catch {
    return null;
  }
}

export default function JogoDetail() {
  const { slug = "" } = useParams();

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["jogos-public"],
    queryFn: getFeaturedFootballEvents,
    staleTime: 1000 * 60 * 10,
  });

  const normalizedSlug = useMemo(
    () => slug.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9-]/g, ""),
    [slug],
  );

  // 1) Match no array da API (fonte principal)
  const apiMatch = useMemo<NormalizedMatch | null>(() => {
    if (!matches.length) return null;
    const exact = matches.find((m) => m.slug === slug);
    if (exact) return exact;
    return matches.find((m) => m.slug.toLowerCase() === normalizedSlug) ?? null;
  }, [matches, slug, normalizedSlug]);

  // 2) Fallback: busca direto no banco por slug / external_id quando a API não tem
  const { data: dbFallback, isLoading: loadingDbFallback } = useQuery({
    queryKey: ["jogo-fallback", slug],
    enabled: !!slug && !apiMatch && !isLoading,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data } = await supabase
        .from("sports_matches")
        .select("slug, external_id, home_team, away_team, league_label, league_name, league_id, match_time, status, home_badge, away_badge, venue_name, youtube_url, is_world_cup, priority, category, season")
        .or(`slug.eq.${slug},external_id.eq.${slug}`)
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Se achou por external_id mas slug é outro → redireciona para slug canônico
  if (!apiMatch && dbFallback && dbFallback.slug && dbFallback.slug !== slug) {
    return <Navigate to={`/jogo/${dbFallback.slug}`} replace />;
  }

  const match: NormalizedMatch | null = apiMatch ?? (dbFallback ? {
    external_id: dbFallback.external_id ?? dbFallback.slug,
    league_id: dbFallback.league_id ?? "",
    league_name: dbFallback.league_name ?? "",
    league_label: dbFallback.league_label ?? "",
    category: (dbFallback.category as any) ?? "international",
    season: dbFallback.season ?? "",
    home_team: dbFallback.home_team,
    away_team: dbFallback.away_team,
    home_badge: dbFallback.home_badge ?? null,
    away_badge: dbFallback.away_badge ?? null,
    match_time: dbFallback.match_time,
    raw_date: (dbFallback.match_time ?? "").slice(0, 10),
    status: (dbFallback.status as any) ?? "scheduled",
    venue_name: dbFallback.venue_name ?? null,
    youtube_url: dbFallback.youtube_url ?? null,
    slug: dbFallback.slug,
    is_world_cup: !!dbFallback.is_world_cup,
    priority: dbFallback.priority ?? 5,
  } as NormalizedMatch : null);

  const { data: localData } = useQuery({
    queryKey: ["jogo-local", slug],
    queryFn: async () => {
      const { data: row } = await supabase
        .from("sports_matches")
        .select("id, youtube_url, highlight_url, home_score, away_score, round_label, status, current_minute")
        .eq("slug", slug)
        .maybeSingle();
      if (!row) return { id: null as string | null, youtube_url: null as string | null, highlight_url: null as string | null, home_score: null as number | null, away_score: null as number | null, round_label: null as string | null, status: null as string | null, current_minute: null as string | null, venues: [] as any[], streams: [] as StreamRow[] };
      const [{ data: links }, { data: streams }] = await Promise.all([
        supabase
          .from("sports_match_venues")
          .select("is_featured, notes, transmission_type, venue:partners(id, name, slug, neighborhood)")
          .eq("match_id", row.id),
        supabase
          .from("sports_match_streams")
          .select("id, stream_url, stream_type, is_official")
          .eq("match_id", row.id)
          .eq("is_active", true),
      ]);
      return { id: row.id, youtube_url: row.youtube_url ?? null, highlight_url: (row as any).highlight_url ?? null, home_score: row.home_score, away_score: row.away_score, round_label: row.round_label, status: row.status, current_minute: row.current_minute, venues: links ?? [], streams: (streams ?? []) as StreamRow[] };
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
  });

  // Tracking de view (uma vez por slug)
  useEffect(() => {
    if (!match) return;
    incrementMatchView(match.slug);
    trackMatchEvent({ matchExternalId: match.external_id, matchSlug: match.slug, action: "open" });
  }, [match?.slug, match?.external_id]);

  if (isLoading || loadingDbFallback) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando…</div>;
  }

  if (!match) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <Trophy className="h-12 w-12 text-primary/60 mb-3" />
        <h1 className="font-display font-black text-2xl mb-2">Jogo não encontrado</h1>
        <p className="text-muted-foreground text-sm mb-4">Esse confronto pode ter sido removido ou ainda não está agendado.</p>
        <Link to="/jogos" className="text-primary font-bold underline">Ver todos os jogos</Link>
      </div>
    );
  }

  const isCopa = match.is_world_cup;
  const localStatus = (localData?.status || "").toLowerCase();
  const isLive = match.status === "live" || localStatus === "live" || localStatus === "in_play";
  const isFinished = match.status === "finished" || localStatus === "finished" || localStatus === "ft";
  const homeScore = localData?.home_score;
  const awayScore = localData?.away_score;
  const hasScore = homeScore != null && awayScore != null;
  const roundLabel = localData?.round_label || null;
  const currentMinute = localData?.current_minute || null;
  const venues = (localData?.venues ?? []) as any[];
  const streams = (localData?.streams ?? []) as StreamRow[];
  const fallbackYoutube = localData?.youtube_url || match.youtube_url || null;
  const highlightUrl = localData?.highlight_url || null;
  const highlightEmbed = isFinished && highlightUrl ? toEmbedUrl(highlightUrl, "youtube") : null;
  const hasOfficialStream = streams.length > 0;

  const matchLabel = `${match.home_team} x ${match.away_team}`;
  const title = `Onde assistir ${matchLabel} hoje em Presidente Prudente | Roxou`;
  const description = `Veja horário, transmissão oficial e bares que vão transmitir ${matchLabel} pelo ${match.league_label} em Presidente Prudente. Atualizado em tempo real.`;
  const canonical = `https://roxou.com.br/jogo/${match.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SportsEvent",
        name: matchLabel,
        startDate: match.match_time,
        eventStatus: isLive
          ? "https://schema.org/EventInProgress"
          : "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/MixedEventAttendanceMode",
        location: {
          "@type": "Place",
          name: match.venue_name || "Presidente Prudente",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Presidente Prudente",
            addressRegion: "SP",
            addressCountry: "BR",
          },
        },
        competitor: [
          { "@type": "SportsTeam", name: match.home_team, ...(match.home_badge ? { logo: match.home_badge } : {}) },
          { "@type": "SportsTeam", name: match.away_team, ...(match.away_badge ? { logo: match.away_badge } : {}) },
        ],
        superEvent: { "@type": "SportsEvent", name: match.league_name },
        url: canonical,
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: `Que horas é ${matchLabel}?`,
            acceptedAnswer: { "@type": "Answer", text: `O jogo começa às ${formatMatchTime(match.match_time)} (horário de Brasília).` },
          },
          {
            "@type": "Question",
            name: `Onde assistir ${matchLabel} em Presidente Prudente?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: hasOfficialStream
                ? "Há transmissão oficial cadastrada na Roxou e bares parceiros confirmados. Veja a lista completa nesta página."
                : venues.length > 0
                  ? "Veja na Roxou os bares parceiros que confirmaram transmissão deste jogo em Presidente Prudente."
                  : "Acompanhe esta página: assim que confirmarmos bares ou transmissão oficial, eles aparecerão aqui.",
            },
          },
          {
            "@type": "Question",
            name: `Qual é o campeonato de ${matchLabel}?`,
            acceptedAnswer: { "@type": "Answer", text: `Partida válida pelo ${match.league_label}.` },
          },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEO title={title} description={description} canonical={canonical} jsonLd={jsonLd} />

      <div className={`relative overflow-hidden border-b border-border/40 ${isCopa ? "bg-gradient-to-br from-emerald-950 via-background to-yellow-900/30" : "bg-gradient-to-br from-primary/20 via-background to-accent/10"}`}>
        <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
          <Link to="/jogos" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-3.5 w-3.5" /> Todos os jogos
          </Link>

          <div className="flex items-center gap-2 mb-3">
            {isCopa && <Trophy className="h-4 w-4 text-yellow-400" />}
            <span className={`text-xs font-bold uppercase ${isCopa ? "text-yellow-300" : "text-primary"}`}>
              {match.league_label}
            </span>
            {isLive && (
              <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase text-red-400 animate-pulse">
                <Radio className="h-3 w-3" /> Ao vivo
              </span>
            )}
          </div>

          <h1 className="sr-only">Onde assistir {matchLabel} em Presidente Prudente</h1>

          <div className="grid grid-cols-3 items-center gap-3 my-6">
            <div className="flex flex-col items-center text-center">
              {match.home_badge && <img src={match.home_badge} alt={match.home_team} className="h-20 w-20 md:h-24 md:w-24 object-contain mb-2" />}
              <span className="font-bold text-sm md:text-base">{match.home_team}</span>
            </div>
            <div className="text-center">
              <p className={`text-4xl md:text-5xl font-black ${isCopa ? "text-yellow-400" : "text-primary"}`}>×</p>
              <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" /> {formatMatchTime(match.match_time)}
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              {match.away_badge && <img src={match.away_badge} alt={match.away_team} className="h-20 w-20 md:h-24 md:w-24 object-contain mb-2" />}
              <span className="font-bold text-sm md:text-base">{match.away_team}</span>
            </div>
          </div>

          {match.venue_name && (
            <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
              <MapPin className="h-3 w-3" /> {match.venue_name}
            </p>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-8">
        {/* Placar / status — só aparece quando há dados */}
        {(hasScore || isLive) && (
          <section
            aria-label="Placar"
            className={`rounded-2xl border p-4 md:p-5 ${
              isLive
                ? "border-red-500/40 bg-gradient-to-br from-red-950/40 via-card/40 to-background shadow-[0_0_30px_-12px_rgba(239,68,68,0.6)]"
                : "border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-card/40 to-background"
            }`}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider">
                {isLive ? (
                  <span className="inline-flex items-center gap-1.5 text-red-300">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                    </span>
                    AO VIVO {currentMinute && <span className="text-red-200/90">· {currentMinute}</span>}
                  </span>
                ) : isFinished ? (
                  <span className="text-emerald-300">✓ Finalizado</span>
                ) : (
                  <span className="text-muted-foreground">Placar</span>
                )}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">
                {match.league_label}
                {roundLabel && <span className="ml-1 text-foreground/70">· {roundLabel}</span>}
              </div>
            </div>
            <div className="grid grid-cols-3 items-center gap-3">
              <div className="text-right font-bold text-sm md:text-base truncate">{match.home_team}</div>
              <div className="text-center font-display font-black text-3xl md:text-4xl tabular-nums">
                {hasScore ? `${homeScore} × ${awayScore}` : "— × —"}
              </div>
              <div className="text-left font-bold text-sm md:text-base truncate">{match.away_team}</div>
            </div>
            <p className="text-[11px] text-muted-foreground text-center mt-3">
              <Clock className="h-3 w-3 inline -mt-0.5 mr-1" />
              {formatMatchTime(match.match_time)} · {new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short" }).format(new Date(match.match_time))}
            </p>
          </section>
        )}

        {/* Melhores momentos — quando jogo finalizado e há highlight */}
        {isFinished && highlightUrl && (
          <section>
            <h2 className="font-display font-black text-lg mb-3 flex items-center gap-2">
              <Youtube className="h-5 w-5 text-red-500" /> Melhores momentos
            </h2>
            <div className="rounded-2xl border border-red-500/30 bg-card/40 overflow-hidden">
              {highlightEmbed ? (
                <div className="aspect-video bg-black">
                  <iframe
                    src={highlightEmbed}
                    title={`Melhores momentos ${matchLabel}`}
                    className="w-full h-full"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-2 p-3">
                <span className="text-[11px] uppercase font-black tracking-wider text-red-300">
                  YouTube · Highlights
                </span>
                <a
                  href={highlightUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackMatchEvent({ matchExternalId: match.external_id, matchSlug: match.slug, action: "stream_click" })}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 text-xs transition"
                >
                  Abrir no YouTube <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </section>
        )}

        {/* Assista agora — só se houver transmissão oficial ou link YouTube */}
        {(hasOfficialStream || fallbackYoutube) && (
          <section>
            <h2 className="font-display font-black text-lg mb-3 flex items-center gap-2">
              <Tv className="h-5 w-5 text-emerald-400" /> Assista agora
            </h2>

            {hasOfficialStream ? (
              <div className="space-y-3">
                {streams.map((s) => {
                  const embed = toEmbedUrl(s.stream_url, s.stream_type);
                  return (
                    <div key={s.id} className="rounded-2xl border border-emerald-500/40 bg-card/40 overflow-hidden">
                      {embed && (
                        <div className="aspect-video bg-black">
                          <iframe
                            src={embed}
                            title={`Transmissão ${matchLabel}`}
                            className="w-full h-full"
                            allow="autoplay; encrypted-media; picture-in-picture"
                            allowFullScreen
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 p-3">
                        <span className="text-[11px] uppercase font-black tracking-wider text-emerald-300">
                          {s.stream_type === "twitch" ? "Twitch" : s.stream_type === "youtube" ? "YouTube" : s.stream_type} {s.is_official && "· Oficial"}
                        </span>
                        <a
                          href={s.stream_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackMatchEvent({ matchExternalId: match.external_id, matchSlug: match.slug, action: "stream_click" })}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 text-xs transition"
                        >
                          Abrir transmissão <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <a
                href={fallbackYoutube!}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackMatchEvent({ matchExternalId: match.external_id, matchSlug: match.slug, action: "stream_click" })}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 text-sm transition"
              >
                <Youtube className="h-4 w-4" /> Assistir no YouTube
              </a>
            )}
          </section>
        )}

        {/* Bares — bloco forte: "onde assistir" */}
        <section className="rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-card/60 to-background p-4 md:p-5 shadow-[0_0_30px_-12px_hsl(var(--primary)/0.6)]">
          <h2 className="font-display font-black text-lg md:text-xl mb-1 flex items-center gap-2">
            <Beer className="h-5 w-5 text-primary" /> Onde assistir em Presidente Prudente
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Bares parceiros que confirmaram transmissão de {matchLabel}.
          </p>
          {venues.length === 0 ? (
            <div className="rounded-xl border border-dashed border-primary/30 bg-background/40 p-5 text-center">
              <p className="font-bold text-sm">Nenhum local confirmou transmissão ainda</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Tem um bar? Cadastre sua transmissão na Roxou e apareça aqui para a torcida.
              </p>
              <Link
                to="/contato?assunto=cadastrar-transmissao"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground font-bold text-xs px-4 py-2 hover:bg-primary/90 transition"
              >
                Cadastrar transmissão
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {venues.map((v: any) => (
                <Link
                  key={v.venue?.id}
                  to={`/local/${v.venue?.slug}`}
                  onClick={() =>
                    trackMatchEvent({
                      matchExternalId: match.external_id,
                      matchSlug: match.slug,
                      action: "venue_click",
                      partnerId: v.venue?.id,
                    })
                  }
                  className="rounded-xl border border-border/40 bg-card/60 hover:border-primary/50 p-3 transition"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{v.venue?.name}</p>
                    {v.is_featured && (
                      <span className="text-[10px] font-bold text-yellow-300 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                        Destaque
                      </span>
                    )}
                  </div>
                  {v.venue?.neighborhood && (
                    <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {v.venue.neighborhood}
                    </p>
                  )}
                  {v.transmission_type && (
                    <p className="text-[10px] uppercase tracking-wider text-emerald-300 mt-1">
                      {v.transmission_type.replace(/_/g, " ")}
                    </p>
                  )}
                  {v.notes && <p className="text-[11px] text-muted-foreground mt-1">{v.notes}</p>}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Chat Roxou do jogo — compacto no mobile */}
        <div
          onFocus={() => trackMatchEvent({ matchExternalId: match.external_id, matchSlug: match.slug, action: "chat_open" })}
          onClick={() => trackMatchEvent({ matchExternalId: match.external_id, matchSlug: match.slug, action: "chat_open" })}
        >
          <FootballMatchChat
            matchSlug={match.slug}
            matchTitle={matchLabel}
            compact
          />
        </div>

        {/* FAQ — compacto */}
        <section className="border-t border-border/40 pt-4">
          <h2 className="font-display font-black text-base mb-2">Perguntas frequentes</h2>
          <div className="space-y-1.5 text-sm">
            <details className="rounded-lg border border-border/30 bg-card/30 px-3 py-2">
              <summary className="cursor-pointer font-semibold text-[13px]">Que horas começa?</summary>
              <p className="text-muted-foreground text-xs mt-1.5">
                {formatMatchTime(match.match_time)} (horário de Brasília).
              </p>
            </details>
            <details className="rounded-lg border border-border/30 bg-card/30 px-3 py-2">
              <summary className="cursor-pointer font-semibold text-[13px]">Onde assistir em Prudente?</summary>
              <p className="text-muted-foreground text-xs mt-1.5">
                Veja os bares parceiros acima. Sem bar confirmado? Acompanhe pelo chat ou pela transmissão oficial.
              </p>
            </details>
            <details className="rounded-lg border border-border/30 bg-card/30 px-3 py-2">
              <summary className="cursor-pointer font-semibold text-[13px]">Qual campeonato?</summary>
              <p className="text-muted-foreground text-xs mt-1.5">{match.league_label}.</p>
            </details>
          </div>
        </section>
      </main>
    </div>
  );
}
