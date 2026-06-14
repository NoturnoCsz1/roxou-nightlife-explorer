import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Trophy, ArrowRight, Beer, MapPin, Calendar } from "lucide-react";
import SEO from "@/components/SEO";
import MatchCard from "@/components/jogos/MatchCard";
import { supabase } from "@/integrations/supabase/client";
import {
  sportsMatchRowToNormalized,
  isBrazilNationalTeam,
  isCopaDoMundoMatch,
  formatMatchTime,
  type NormalizedMatch,
  type SportsMatchRow,
} from "@/lib/theSportsDb";
import { todayKeySP } from "@/lib/dateUtils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CopaDoMundo2026() {
  const today = todayKeySP();

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["copa-2026-matches"],
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<NormalizedMatch[]> => {
      const fromIso = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
      const toIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("sports_matches")
        .select(
          "external_id, league_id, league_name, league_label, category, season, home_team, away_team, home_badge, away_badge, match_time, status, venue_name, youtube_url, slug, is_world_cup, priority",
        )
        .gte("match_time", fromIso)
        .lte("match_time", toIso)
        .order("match_time", { ascending: true })
        .limit(300);
      return (data ?? []).map((r) => sportsMatchRowToNormalized(r as SportsMatchRow));
    },
  });

  const { data: bars = [] } = useQuery({
    queryKey: ["copa-2026-bars"],
    staleTime: 1000 * 60 * 15,
    queryFn: async () => {
      const { data } = await supabase
        .from("partners")
        .select("id, name, slug, neighborhood, logo_url")
        .eq("city", "Presidente Prudente")
        .eq("active", true)
        .eq("supports_sports", true)
        .limit(12);
      return data ?? [];
    },
  });

  const nextBrasil = useMemo(() => {
    const now = Date.now();
    return matches.find((m) => {
      if (!isCopaDoMundoMatch(m)) return false;
      const isSelecao =
        isBrazilNationalTeam(m.home_team) || isBrazilNationalTeam(m.away_team);
      if (!isSelecao) return false;
      if (m.status === "finished") return false;
      return new Date(m.match_time).getTime() > now - 2 * 60 * 60 * 1000;
    });
  }, [matches]);

  const jogosHoje = useMemo(
    () =>
      matches
        .filter((m) => isCopaDoMundoMatch(m) && m.raw_date === today && m.status !== "finished")
        .slice(0, 10),
    [matches, today],
  );

  const adversario = nextBrasil
    ? isBrazilNationalTeam(nextBrasil.home_team)
      ? nextBrasil.away_team
      : nextBrasil.home_team
    : null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEO
        title="Copa do Mundo 2026 em Presidente Prudente | Roxou"
        description="Jogos da Copa, partidas do Brasil e onde assistir em Presidente Prudente."
        canonical="https://roxou.com.br/copa-do-mundo-2026"
        keywords="copa do mundo 2026, brasil, onde assistir copa em prudente, jogos do brasil"
      />

      {/* HERO */}
      <header className="relative overflow-hidden border-b border-border/40">
        <div
          aria-hidden
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--primary)/0.35) 0%, #009B3A55 55%, #FFDF0044 100%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-4 py-8 md:py-12">
          <span className="inline-flex items-center gap-1 rounded-full border border-[#FFDF00]/40 bg-[#FFDF00]/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#FFDF00]">
            🇧🇷 Copa do Mundo 2026
          </span>
          <h1 className="mt-3 font-display font-black text-2xl md:text-4xl leading-tight">
            Copa do Mundo 2026 na Roxou
          </h1>
          <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-2xl">
            Acompanhe os jogos da Seleção Brasileira, todas as partidas da Copa e descubra
            onde assistir em Presidente Prudente.
          </p>

          {/* Próximo jogo do Brasil */}
          <div className="mt-6 rounded-2xl border border-[#FFDF00]/30 bg-card/60 backdrop-blur p-4 md:p-5">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#FFDF00]">
              <Trophy className="h-3.5 w-3.5" /> Próximo jogo do Brasil
            </div>
            {isLoading ? (
              <div className="mt-3 h-16 bg-muted/20 rounded-lg animate-pulse" />
            ) : nextBrasil ? (
              <Link
                to={`/jogo/${nextBrasil.slug}`}
                className="mt-3 flex flex-wrap items-center justify-between gap-3 group"
              >
                <div className="min-w-0">
                  <p className="text-lg md:text-xl font-black break-words">
                    Brasil <span className="text-muted-foreground">×</span> {adversario}
                  </p>
                  <p className="mt-1 text-xs md:text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(nextBrasil.match_time), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    <span>·</span>
                    <span>{formatMatchTime(nextBrasil.match_time)}</span>
                  </p>
                </div>
                <span className="text-xs font-bold text-primary group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                  Ver detalhes <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Em breve divulgaremos os próximos jogos da Seleção na Copa 2026.
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-10">
        {/* JOGOS DE HOJE */}
        <section>
          <div className="mb-3">
            <h2 className="font-display font-black text-xl md:text-2xl">Jogos de hoje</h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              Até 10 partidas em destaque
            </p>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-44 rounded-2xl bg-card/40 border border-border/40 animate-pulse" />
              ))}
            </div>
          ) : jogosHoje.length === 0 ? (
            <div className="rounded-2xl border border-border/40 bg-card/40 p-6 text-center text-sm text-muted-foreground">
              Nenhum jogo agendado para hoje. Veja todos os jogos na página{" "}
              <Link to="/jogos" className="text-primary font-semibold underline">
                /jogos
              </Link>
              .
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {jogosHoje.map((m) => (
                <MatchCard key={m.external_id || m.slug} match={m} compact />
              ))}
            </div>
          )}
        </section>

        {/* ONDE ASSISTIR */}
        <section>
          <div className="mb-3">
            <h2 className="font-display font-black text-xl md:text-2xl flex items-center gap-2">
              <Beer className="h-5 w-5 text-emerald-400" /> Onde assistir
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              Bares parceiros que transmitem futebol em Presidente Prudente
            </p>
          </div>
          {bars.length === 0 ? (
            <div className="rounded-2xl border border-border/40 bg-card/40 p-6 text-center text-sm text-muted-foreground">
              Em breve novos bares parceiros transmitindo a Copa.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {bars.map((b: any) => (
                <Link
                  key={b.id}
                  to={`/local/${b.slug}`}
                  className="group rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-4 hover:border-emerald-400/60 hover:shadow-[0_0_24px_-12px_rgba(16,185,129,0.6)] transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {b.logo_url ? (
                      <img src={b.logo_url} alt={b.name} className="h-12 w-12 rounded-full object-cover shrink-0" loading="lazy" />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-muted/30 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-sm break-words line-clamp-2">{b.name}</p>
                      {b.neighborhood && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" /> {b.neighborhood}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* CTA */}
        <section className="text-center">
          <Link
            to="/jogos"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-black uppercase tracking-wider text-primary-foreground hover:bg-primary/90 transition-colors shadow-[0_0_30px_-8px_hsl(var(--primary)/0.7)]"
          >
            Ver todos os jogos <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>
    </div>
  );
}
