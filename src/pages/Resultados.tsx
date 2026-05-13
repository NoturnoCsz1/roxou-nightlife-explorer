import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trophy } from "lucide-react";
import SEO from "@/components/SEO";
import ResultMatchCard from "@/components/jogos/ResultMatchCard";
import { useFootballResults, type ResultsRange } from "@/hooks/useFootballResults";

const FILTERS: { key: ResultsRange; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "yesterday", label: "Ontem" },
  { key: "week", label: "Semana" },
];

const LEAGUE_FILTERS: { key: string; label: string }[] = [
  { key: "", label: "Todos" },
  { key: "4351", label: "Brasileirão" },
  { key: "4356", label: "Copa do Brasil" },
  { key: "4481", label: "Libertadores" },
  { key: "4482", label: "Champions" },
];

export default function Resultados() {
  const [range, setRange] = useState<ResultsRange>("today");
  const [leagueId, setLeagueId] = useState<string>("");

  const { data: results = [], isLoading } = useFootballResults({
    range,
    leagueId: leagueId || undefined,
    limit: 60,
  });

  const grouped = useMemo(() => {
    const m = new Map<string, typeof results>();
    for (const r of results) {
      const key = r.league_label ?? "Outros";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(r);
    }
    return Array.from(m.entries());
  }, [results]);

  const title =
    range === "today"
      ? "Resultados dos jogos de hoje | Roxou"
      : range === "yesterday"
      ? "Resultados dos jogos de ontem | Roxou"
      : "Resultados da semana | Roxou";

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEO
        title={title}
        description="Confira os resultados dos jogos de hoje, ontem e da semana: Brasileirão, Libertadores, Champions League e Copa do Brasil. Roxou."
        canonical="https://roxou.com.br/resultados"
        keywords="resultados jogos hoje, brasileirão resultados, champions league resultados, presidente prudente"
      />

      <header className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/70 via-background to-yellow-900/20" />
        <div className="relative mx-auto max-w-5xl px-4 py-8">
          <Link to="/jogos" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
            <ArrowLeft className="h-3 w-3" /> Voltar para Jogos
          </Link>
          <h1 className="font-display font-black text-2xl md:text-3xl flex items-center gap-2">
            <Trophy className="h-7 w-7 text-yellow-400" /> Resultados
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Placar final dos jogos finalizados.</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setRange(f.key)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                  range === f.key
                    ? "bg-primary text-primary-foreground shadow-[0_0_18px_-6px_hsl(var(--primary))]"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
            {LEAGUE_FILTERS.map((f) => (
              <button
                key={f.key || "all"}
                onClick={() => setLeagueId(f.key)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
                  leagueId === f.key
                    ? "bg-yellow-500/20 text-yellow-200 border border-yellow-500/40"
                    : "bg-card/40 text-muted-foreground border border-border/40 hover:bg-card/60"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-card/30 animate-pulse" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/40 p-10 text-center text-muted-foreground">
            <Trophy className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm">Nenhum resultado encontrado para esse período.</p>
          </div>
        ) : (
          grouped.map(([league, items]) => (
            <section key={league} className="space-y-2">
              <h2 className="text-xs uppercase tracking-wider font-bold text-muted-foreground">{league}</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {items.map((r) => (
                  <ResultMatchCard key={r.slug + r.match_time} match={r} />
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
