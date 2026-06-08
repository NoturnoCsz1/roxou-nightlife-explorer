import { useParams, Navigate, Link } from "react-router-dom";
import { ArrowLeft, Trophy, Calendar } from "lucide-react";
import SEO from "@/components/SEO";
import LeagueTable from "@/components/jogos/LeagueTable";
import NextMatchesByLeague from "@/components/jogos/NextMatchesByLeague";

interface LeagueMeta {
  slug: string;
  label: string;
  longLabel: string;
  topZone: number;
  relegationZone: number;
  description: string;
  /** league_id em sports_matches (para fallback de próximos jogos) */
  leagueId?: string;
  faq: { q: string; a: string }[];
}

const LEAGUES: Record<string, LeagueMeta> = {
  brasileirao: {
    slug: "brasileirao",
    label: "Brasileirão",
    longLabel: "Brasileirão Série A",
    topZone: 6,
    relegationZone: 4,
    description: "Tabela atualizada do Brasileirão Série A: classificação, pontos, jogos, vitórias, saldo de gols e zona de classificação. Veja onde assistir cada rodada nos bares parceiros da Roxou em Presidente Prudente.",
    faq: [
      { q: "Quem está liderando o Brasileirão?", a: "A Roxou atualiza a tabela do Brasileirão diariamente com pontos, jogos e saldo de gols dos 20 clubes da Série A." },
      { q: "Onde assistir aos jogos do Brasileirão em Presidente Prudente?", a: "Confira na Roxou os bares e parceiros oficiais que transmitem os jogos do Brasileirão na cidade." },
    ],
  },
  libertadores: {
    slug: "libertadores",
    label: "Libertadores",
    longLabel: "CONMEBOL Libertadores",
    topZone: 2,
    relegationZone: 0,
    leagueId: "4481",
    description: "Classificação completa da Copa Libertadores da América: grupos, pontos e jogos. A Roxou também indica onde assistir os jogos da Liberta em Presidente Prudente.",
    faq: [
      { q: "Quais clubes brasileiros estão na Libertadores?", a: "Acompanhe na Roxou a classificação completa da Libertadores e veja os clubes brasileiros em cada grupo." },
      { q: "Onde assistir Libertadores em Presidente Prudente?", a: "Veja a lista de bares parceiros que transmitem os jogos da Libertadores na cidade." },
    ],
  },
  champions: {
    slug: "champions",
    label: "Champions",
    longLabel: "UEFA Champions League",
    topZone: 8,
    relegationZone: 0,
    leagueId: "4480",
    description: "Tabela da UEFA Champions League: pontos, jogos e classificação dos principais clubes da Europa. Encontre os bares em Presidente Prudente que transmitem a Champions na Roxou.",
    faq: [
      { q: "Como funciona o novo formato da Champions?", a: "A fase de liga reúne todos os times em uma tabela única — os 8 primeiros vão direto às oitavas. Confira a tabela atualizada na Roxou." },
      { q: "Onde assistir Champions League em Presidente Prudente?", a: "A Roxou lista os bares e parceiros que exibem os jogos da Champions na cidade." },
    ],
  },
};

export default function TabelaCampeonato() {
  const { slug = "" } = useParams();
  const meta = LEAGUES[slug];

  if (!meta) return <Navigate to="/jogos" replace />;

  const canonical = `https://roxou.com.br/tabela/${meta.slug}`;
  const title = `Tabela ${meta.longLabel} | Classificação atualizada | Roxou`;

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEO
        title={title}
        description={meta.description}
        canonical={canonical}
        keywords={`tabela ${meta.label.toLowerCase()}, classificação ${meta.label.toLowerCase()}, pontos ${meta.label.toLowerCase()}, presidente prudente`}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: meta.faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }}
      />

      <header className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/70 via-background to-yellow-900/20" />
        <div className="relative mx-auto max-w-5xl px-4 py-8 md:py-10">
          <Link to="/jogos" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
            <ArrowLeft className="h-3 w-3" /> Voltar para Jogos
          </Link>
          <h1 className="font-display font-black text-2xl md:text-4xl flex items-center gap-2">
            <Trophy className="h-6 w-6 md:h-8 md:w-8 text-yellow-400" />
            {meta.longLabel}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-2xl">{meta.description}</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        <LeagueTable
          leagueSlug={meta.slug}
          showHeader={false}
          topZone={meta.topZone}
          relegationZone={meta.relegationZone}
          emptyFallback={
            <section className="rounded-xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 via-card/40 to-card/30 p-5 space-y-4">
              <div>
                <p className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300 mb-1">
                  <Trophy className="h-3 w-3" /> Tabela
                </p>
                <h2 className="font-display font-black text-lg">Classificação indisponível no momento</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Estamos aguardando a próxima atualização oficial. Enquanto isso, veja os próximos jogos da {meta.longLabel}.
                </p>
              </div>
              {meta.leagueId && (
                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" /> Próximos jogos
                  </h3>
                  <NextMatchesByLeague leagueId={meta.leagueId} leagueLabel={meta.longLabel} limit={8} />
                </div>
              )}
            </section>
          }
        />

        {/* SEO local */}
        <section className="rounded-xl border border-border/40 bg-card/30 p-4 md:p-5">
          <h2 className="font-display font-black text-lg mb-2">Onde assistir {meta.longLabel} em Presidente Prudente</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A Roxou conecta torcedores aos bares e parceiros oficiais que transmitem {meta.longLabel} em Presidente Prudente.
            Veja os jogos da rodada, escolha o melhor lugar para assistir com a galera e participe do chat ao vivo.
          </p>
          <Link
            to="/jogos"
            className="inline-flex items-center gap-2 mt-3 rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-bold hover:scale-[1.02] transition"
          >
            <Calendar className="h-3.5 w-3.5" /> Ver jogos da rodada
          </Link>
        </section>

        {/* FAQ visual */}
        <section className="rounded-xl border border-border/40 bg-card/30 p-4 md:p-5">
          <h2 className="font-display font-black text-lg mb-3">Perguntas frequentes</h2>
          <ul className="space-y-3">
            {meta.faq.map((f) => (
              <li key={f.q}>
                <p className="text-sm font-bold">{f.q}</p>
                <p className="text-xs text-muted-foreground mt-1">{f.a}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
