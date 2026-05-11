import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Trophy, Radio, Beer, Calendar, MapPin } from "lucide-react";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import {
  getFeaturedFootballEvents,
  groupMatchesByDate,
  type NormalizedMatch,
} from "@/lib/theSportsDb";
import MatchCard from "@/components/jogos/MatchCard";

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

  const filtered = useMemo<NormalizedMatch[]>(() => {
    let list = matches;
    if (filter === "hoje") list = list.filter((m) => m.raw_date === today);
    else if (filter === "amanha") list = list.filter((m) => m.raw_date === tomorrow);
    else if (filter === "semana") {
      const limit = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      list = list.filter((m) => m.match_time <= limit);
    } else if (filter === "copa") list = list.filter((m) => m.is_world_cup);
    else if (filter === "brasil") list = list.filter((m) => m.category === "brazil");
    else if (filter === "internacional") list = list.filter((m) => m.category === "international");
    else if (filter === "live") list = list.filter((m) => m.status === "live");
    return list;
  }, [matches, filter, today, tomorrow]);

  const todays = matches.filter((m) => m.raw_date === today);
  const groups = groupMatchesByDate(filtered);

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

      {/* HERO */}
      <header className="relative overflow-hidden border-b border-border/40">
        <div className={`absolute inset-0 ${hasCopa ? "bg-gradient-to-br from-emerald-950 via-background to-yellow-900/30" : "bg-gradient-to-br from-primary/20 via-background to-accent/10"}`} />
        <div className="relative mx-auto max-w-5xl px-4 py-10 md:py-14">
          {hasCopa && (
            <div className="inline-flex items-center gap-1.5 mb-3 rounded-full bg-yellow-500/20 border border-yellow-500/40 px-3 py-1 text-xs font-bold text-yellow-300">
              <Trophy className="h-3.5 w-3.5" /> Copa na Roxou
            </div>
          )}
          <h1 className="font-display font-black text-3xl md:text-5xl leading-tight">
            Jogos na Roxou
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm md:text-base">
            Veja os jogos de hoje, próximos confrontos e bares transmitindo futebol em Presidente Prudente.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-8">
        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                filter === f.key
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

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
            {/* Destaque Copa */}
            {hasCopa && filter !== "copa" && (
              <section>
                <h2 className="font-display font-black text-xl mb-3 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-400" /> Copa na Roxou
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {matches.filter((m) => m.is_world_cup).slice(0, 4).map((m) => (
                    <MatchCard key={m.external_id} match={m} />
                  ))}
                </div>
              </section>
            )}

            {/* Jogos de hoje */}
            {filter !== "hoje" && todays.length > 0 && (
              <section>
                <h2 className="font-display font-black text-xl mb-3 flex items-center gap-2">
                  <Radio className="h-5 w-5 text-primary" /> Jogos de Hoje
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {todays.map((m) => <MatchCard key={m.external_id} match={m} />)}
                </div>
              </section>
            )}

            {/* Lista filtrada */}
            <section>
              <h2 className="font-display font-black text-xl mb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" /> Próximos Jogos
              </h2>
              {groups.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">
                  Nenhum jogo neste filtro. Tente outro período.
                </p>
              ) : (
                groups.map((g) => (
                  <div key={g.dateKey} className="mb-5">
                    <h3 className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2">
                      {g.label}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {g.matches.map((m) => <MatchCard key={m.external_id} match={m} />)}
                    </div>
                  </div>
                ))
              )}
            </section>
          </>
        )}

        {/* Bares transmitindo */}
        <section>
          <h2 className="font-display font-black text-xl mb-3 flex items-center gap-2">
            <Beer className="h-5 w-5 text-primary" /> Bares que transmitem futebol em Prudente
          </h2>
          {bars.length === 0 ? (
            <p className="text-muted-foreground text-sm">Em breve adicionaremos parceiros para você assistir os jogos.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {bars.map((b: any) => (
                <Link
                  key={b.id}
                  to={`/local/${b.slug}`}
                  className="rounded-xl border border-border/40 bg-card/60 hover:border-primary/50 p-3 transition"
                >
                  <p className="font-semibold text-sm line-clamp-1">{b.name}</p>
                  {b.neighborhood && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" /> {b.neighborhood}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* FAQ */}
        <section className="border-t border-border/40 pt-6">
          <h2 className="font-display font-black text-xl mb-3">Perguntas frequentes</h2>
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
