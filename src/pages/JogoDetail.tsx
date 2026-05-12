import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Clock, MapPin, Beer, Radio, ArrowLeft, Youtube } from "lucide-react";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import {
  getFeaturedFootballEvents,
  formatMatchTime,
  type NormalizedMatch,
} from "@/lib/theSportsDb";
import FootballMatchChat from "@/components/jogos/FootballMatchChat";

export default function JogoDetail() {
  const { slug = "" } = useParams();

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["jogos-public"],
    queryFn: getFeaturedFootballEvents,
    staleTime: 1000 * 60 * 10,
  });

  const match = useMemo<NormalizedMatch | null>(
    () => matches.find((m) => m.slug === slug) ?? null,
    [matches, slug],
  );

  // Tentar buscar registro local + bares vinculados (se existir o jogo salvo)
  const { data: localData } = useQuery({
    queryKey: ["jogo-local", slug],
    queryFn: async () => {
      const { data: row } = await supabase
        .from("sports_matches")
        .select("id, youtube_url")
        .eq("slug", slug)
        .maybeSingle();
      if (!row) return { youtube_url: null as string | null, venues: [] as any[] };
      const { data: links } = await supabase
        .from("sports_match_venues")
        .select("is_featured, notes, venue:partners(id, name, slug, neighborhood)")
        .eq("match_id", row.id);
      return { youtube_url: row.youtube_url ?? null, venues: links ?? [] };
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
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
  const isLive = match.status === "live";
  const youtube = localData?.youtube_url || match.youtube_url || null;
  const venues = (localData?.venues ?? []) as any[];

  const title = `Onde assistir ${match.home_team} x ${match.away_team} em Presidente Prudente | Roxou`;
  const description = `Veja horário, campeonato, transmissão oficial e bares que irão transmitir ${match.home_team} x ${match.away_team} em Presidente Prudente.`;

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEO
        title={title}
        description={description}
        canonical={`https://roxou.com.br/jogo/${match.slug}`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          name: `${match.home_team} x ${match.away_team}`,
          startDate: match.match_time,
          eventStatus: isLive ? "https://schema.org/EventScheduled" : "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          location: {
            "@type": "Place",
            name: match.venue_name || "Presidente Prudente",
            address: "Presidente Prudente, SP, Brasil",
          },
          competitor: [
            { "@type": "SportsTeam", name: match.home_team },
            { "@type": "SportsTeam", name: match.away_team },
          ],
          superEvent: { "@type": "SportsEvent", name: match.league_name },
        }}
      />

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
        {/* Transmissão oficial */}
        {youtube && (
          <section>
            <h2 className="font-display font-black text-lg mb-3 flex items-center gap-2">
              <Youtube className="h-5 w-5 text-red-500" /> Transmissão oficial
            </h2>
            <a
              href={youtube}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 text-sm transition"
            >
              <Youtube className="h-4 w-4" /> Assistir no YouTube
            </a>
          </section>
        )}

        {/* Bares */}
        <section>
          <h2 className="font-display font-black text-lg mb-3 flex items-center gap-2">
            <Beer className="h-5 w-5 text-primary" /> Bares transmitindo em Prudente
          </h2>
          {venues.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Ainda não temos bares confirmados para esse jogo. Em breve indicaremos onde assistir.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {venues.map((v: any) => (
                <Link
                  key={v.venue?.id}
                  to={`/local/${v.venue?.slug}`}
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
                  {v.notes && <p className="text-[11px] text-muted-foreground mt-1">{v.notes}</p>}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Chat Roxou do jogo */}
        <FootballMatchChat
          matchSlug={match.slug}
          matchTitle={`${match.home_team} x ${match.away_team}`}
        />


        {/* FAQ */}
        <section className="border-t border-border/40 pt-6">
          <h2 className="font-display font-black text-lg mb-3">Perguntas frequentes</h2>
          <div className="space-y-3 text-sm">
            <details className="rounded-lg border border-border/40 bg-card/40 p-3">
              <summary className="cursor-pointer font-semibold">Que horas é {match.home_team} x {match.away_team}?</summary>
              <p className="text-muted-foreground mt-2">
                O jogo está marcado para {formatMatchTime(match.match_time)} (horário de Brasília).
              </p>
            </details>
            <details className="rounded-lg border border-border/40 bg-card/40 p-3">
              <summary className="cursor-pointer font-semibold">Onde posso assistir em Presidente Prudente?</summary>
              <p className="text-muted-foreground mt-2">
                Confira a lista de bares parceiros acima. Caso ainda não esteja confirmado, volte mais perto do horário.
              </p>
            </details>
          </div>
        </section>
      </main>
    </div>
  );
}
