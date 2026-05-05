import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, Star, Ticket } from "lucide-react";
import SEO from "@/components/SEO";
import ExpoFAQ, { faqJsonLd } from "@/components/expo/ExpoFAQ";

const DAYS = [
  { d: "Quinta · 10 SET", t: "Abertura oficial · Show de abertura" },
  { d: "Sexta · 11 SET", t: "Sertanejo nacional · Rodeio profissional" },
  { d: "Sábado · 12 SET", t: "Noite mais aguardada · Mega show" },
  { d: "Domingo · 13 SET", t: "Pagode + arena gastronômica" },
  { d: "Segunda · 14 SET", t: "Encerramento + premiação rodeio" },
];

const ExpoProgramacao = () => {
  return (
    <div className="min-h-screen bg-[#0a0612] text-foreground">
      <SEO
        title="Programação Expo Prudente 2026 — Dias e Atrações | ROXOU"
        description="Programação completa da Expo Prudente 2026 em Presidente Prudente: dia a dia, shows, rodeio e horários. Cobertura oficial ROXOU."
        canonical="https://roxou.com.br/expo2026/programacao"
        keywords="programação expo prudente 2026, agenda expo prudente, dias da expo prudente, eventos em presidente prudente"
        jsonLd={faqJsonLd()}
      />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0612]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 h-14">
          <Link to="/expo2026" className="inline-flex items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="h-4 w-4" /> Expo Prudente 2026
          </Link>
          <Link to="/" className="text-xs text-primary font-bold">● ROXOU</Link>
        </div>
      </header>

      <section className="px-4 mx-auto max-w-4xl pt-12 pb-10">
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-orange-300">
          Cronograma oficial
        </span>
        <h1 className="font-display text-3xl sm:text-5xl font-black leading-tight mt-2">
          Programação da <span className="text-orange-400">Expo Prudente 2026</span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-white/70 leading-relaxed">
          Confira a <strong>programação completa da Expo Prudente 2026</strong> dia a dia. A maior
          festa de <strong>Presidente Prudente</strong> reúne shows nacionais, rodeio profissional,
          praça gastronômica e atrações para toda a família entre 10 e 14 de setembro de 2026, no
          Recinto de Exposições Jacob Tosello.
        </p>
        <p className="mt-3 text-sm text-white/60 leading-relaxed">
          A ROXOU é a fonte oficial da agenda de <strong>eventos em Presidente Prudente</strong>.
          Aqui você acompanha a programação atualizada da Expo, cada nova atração confirmada, os
          horários dos shows e como organizar a sua semana de Expo sem perder nada.
        </p>

        <div className="mt-8 space-y-3">
          {DAYS.map((d) => (
            <div
              key={d.d}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 flex items-center gap-4"
            >
              <Calendar className="h-5 w-5 text-orange-400 shrink-0" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-orange-300">
                  {d.d}
                </div>
                <div className="font-bold mt-0.5">{d.t}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/expo2026/shows"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-bold text-sm text-black bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 shadow-[0_0_30px_-5px_rgba(251,146,60,0.7)]"
          >
            <Star className="h-4 w-4 fill-black" /> Ver shows confirmados
          </Link>
          <Link
            to="/expo2026/ingressos"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-sm border border-white/15 hover:border-orange-400/50 transition"
          >
            <Ticket className="h-4 w-4" /> Ingressos
          </Link>
        </div>
      </section>

      <ExpoFAQ />

      <footer className="mt-16 border-t border-white/10 py-8 text-center text-xs text-muted-foreground">
        <Link to="/expo2026" className="text-orange-300 font-bold">← Voltar para Expo Prudente 2026</Link>
      </footer>
    </div>
  );
};

export default ExpoProgramacao;
