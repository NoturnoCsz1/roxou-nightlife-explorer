import { Link } from "react-router-dom";
import { Trophy, ArrowLeft, Sparkles, MapPin } from "lucide-react";
import SEO from "@/components/SEO";
import { useAwardsByType, formatAwardPeriod, type AwardWithPartner } from "@/hooks/usePartnerAwards";

const AWARD_TYPE = "melhor_bar_mes";
const PAGE_TITLE = "Melhor Bar do Mês | Roxou";
const PAGE_DESC = "Conheça o Melhor Bar do Mês eleito pela curadoria Roxou — o destaque da cena noturna em Presidente Prudente.";
const CANONICAL = "https://roxou.com.br/bar-do-mes";

const CRITERIOS = [
  { icon: "🎯", title: "Curadoria editorial", desc: "Time Roxou avalia eventos, presença, atendimento e identidade musical do bar." },
  { icon: "📊", title: "Engajamento real", desc: "Visualizações, salvamentos e interações na plataforma durante o mês." },
  { icon: "🎤", title: "Programação consistente", desc: "Bares com agenda forte, atrações relevantes e identidade clara." },
  { icon: "💜", title: "Voz da comunidade", desc: "Sinais do público, comentários, presença confirmada e reposts." },
];

function HistoryCard({ award }: { award: AwardWithPartner }) {
  const period = formatAwardPeriod(award.month, award.year);
  return (
    <Link
      to={award.partner ? `/local/${award.partner.slug}` : "#"}
      className="group flex items-center gap-3 rounded-2xl border border-border/40 bg-card/50 p-3 transition hover:border-primary/40 hover:bg-card/80"
    >
      {award.partner?.logo_url ? (
        <img
          src={award.partner.logo_url}
          alt={award.partner.name}
          className="w-14 h-14 rounded-xl object-cover border border-white/10"
        />
      ) : (
        <div className="w-14 h-14 rounded-xl bg-primary/15 flex items-center justify-center text-xl font-display font-bold text-primary">
          {award.partner?.name?.[0] || "?"}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{period}</p>
        <p className="font-display font-bold text-base text-foreground truncate">
          {award.partner?.name || "Parceiro removido"}
        </p>
        {award.partner?.city && (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {award.partner.city}
          </p>
        )}
      </div>
      <Trophy className="w-5 h-5 text-amber-400 group-hover:scale-110 transition" />
    </Link>
  );
}

const BarDoMes = () => {
  const { awards, loading } = useAwardsByType(AWARD_TYPE);
  const champion = awards[0];
  const history = awards.slice(1);

  const jsonLd = awards.length
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Melhor Bar do Mês — Roxou",
        url: CANONICAL,
        itemListElement: awards.map((a, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          item: {
            "@type": "LocalBusiness",
            name: a.partner?.name || a.title,
            url: a.partner ? `https://roxou.com.br/local/${a.partner.slug}` : CANONICAL,
            description: a.description || `${a.title} — ${formatAwardPeriod(a.month, a.year)}`,
          },
        })),
      }
    : undefined;

  return (
    <>
      <SEO title={PAGE_TITLE} description={PAGE_DESC} canonical={CANONICAL} jsonLd={jsonLd} />

      <div className="min-h-screen bg-background pb-24">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-white/10 bg-black/70 backdrop-blur-xl">
          <div className="mx-auto max-w-3xl flex items-center gap-3 px-4 h-12">
            <Link to="/" aria-label="Voltar" className="text-muted-foreground hover:text-foreground transition">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="font-display font-extrabold text-sm tracking-tight">Melhor Bar do Mês</h1>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 pt-6 space-y-10">
          {/* Champion */}
          <section className="relative overflow-hidden rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-500/15 via-primary/10 to-accent/15 p-6 shadow-[0_30px_80px_-30px_hsl(var(--primary)/0.6)]">
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-amber-400/10 blur-3xl" />
            <div className="relative">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                <Trophy className="w-3 h-3" />
                Campeão Atual
              </div>

              {loading ? (
                <p className="mt-6 text-sm text-muted-foreground">Carregando o trono…</p>
              ) : champion ? (
                <>
                  <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-amber-300/80">
                    {formatAwardPeriod(champion.month, champion.year)}
                  </p>
                  <h2 className="mt-1 font-display font-black text-3xl sm:text-4xl text-foreground leading-tight">
                    {champion.partner?.name || champion.title}
                  </h2>
                  <p className="text-sm font-semibold text-amber-300 mt-1">{champion.title}</p>
                  {champion.description && (
                    <p className="mt-4 text-[14px] text-foreground/85 leading-relaxed max-w-2xl">
                      {champion.description}
                    </p>
                  )}
                  {(champion.image_url || champion.partner?.logo_url) && (
                    <img
                      src={champion.image_url || champion.partner?.logo_url || ""}
                      alt={champion.partner?.name || champion.title}
                      className="mt-5 w-32 h-32 rounded-2xl object-cover border-2 border-amber-400/40 shadow-[0_20px_50px_-15px_hsl(var(--primary)/0.7)]"
                    />
                  )}
                  {champion.partner && (
                    <Link
                      to={`/local/${champion.partner.slug}`}
                      className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-black hover:bg-amber-300 transition shadow-[0_10px_30px_-8px_rgba(251,191,36,0.6)]"
                    >
                      Ver parceiro
                      <Sparkles className="w-4 h-4" />
                    </Link>
                  )}
                </>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Ainda não temos um campeão deste mês. Volte em breve.
                </p>
              )}
            </div>
          </section>

          {/* History */}
          <section>
            <h2 className="font-display font-extrabold text-xl text-foreground mb-3">Histórico</h2>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : history.length > 0 ? (
              <div className="space-y-2">
                {history.map((a) => (
                  <HistoryCard key={a.id} award={a} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Ainda sem histórico publicado.</p>
            )}
          </section>

          {/* Critérios */}
          <section className="rounded-3xl border border-border/40 bg-card/40 p-5">
            <h2 className="font-display font-extrabold text-xl text-foreground">Critérios Roxou</h2>
            <p className="text-[12px] text-muted-foreground mt-1">
              Como escolhemos o Melhor Bar do Mês:
            </p>
            <ul className="mt-4 grid sm:grid-cols-2 gap-3">
              {CRITERIOS.map((c) => (
                <li key={c.title} className="rounded-2xl border border-border/40 bg-background/40 p-3">
                  <p className="text-2xl">{c.icon}</p>
                  <p className="mt-1 font-bold text-sm text-foreground">{c.title}</p>
                  <p className="text-[12px] text-muted-foreground leading-relaxed mt-0.5">{c.desc}</p>
                </li>
              ))}
            </ul>
          </section>
        </main>
      </div>
    </>
  );
};

export default BarDoMes;
