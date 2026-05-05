import { Link } from "react-router-dom";
import { ArrowLeft, Ticket, Star, Calendar, ShieldCheck } from "lucide-react";
import SEO from "@/components/SEO";
import ExpoFAQ, { faqJsonLd } from "@/components/expo/ExpoFAQ";

const ExpoIngressos = () => {
  return (
    <div className="min-h-screen bg-[#0a0612] text-foreground">
      <SEO
        title="Ingressos Expo Prudente 2026 — Onde Comprar | ROXOU"
        description="Onde comprar ingressos da Expo Prudente 2026 em Presidente Prudente. Lotes, valores e link oficial atualizados pela ROXOU."
        canonical="https://roxou.com.br/expo2026/ingressos"
        keywords="ingressos expo prudente 2026, comprar ingresso expo prudente, valores expo prudente, expo prudente lote"
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
          Compra oficial
        </span>
        <h1 className="font-display text-3xl sm:text-5xl font-black leading-tight mt-2">
          Ingressos para a <span className="text-orange-400">Expo Prudente 2026</span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-white/70 leading-relaxed">
          Saiba como comprar <strong>ingressos da Expo Prudente 2026</strong> em Presidente Prudente.
          A ROXOU centraliza os links oficiais de venda, lotes promocionais e valores assim que a
          organização libera. Garanta o seu antes do esgotamento.
        </p>
        <p className="mt-3 text-sm text-white/60 leading-relaxed">
          A Expo é o maior evento do calendário de <strong>shows em Presidente Prudente</strong> e
          os ingressos costumam esgotar rápido. Salve esta página, ative o aviso pelo Instagram da
          ROXOU e seja o primeiro a saber quando o lote 1 abrir.
        </p>

        <div className="mt-8 grid sm:grid-cols-3 gap-3 text-sm">
          <div className="rounded-2xl border border-orange-400/20 bg-white/5 p-4">
            <Ticket className="h-5 w-5 text-orange-400 mb-2" />
            <div className="font-bold">Lote 1</div>
            <div className="text-muted-foreground">10/09/2026</div>
          </div>
          <div className="rounded-2xl border border-orange-400/20 bg-white/5 p-4">
            <Calendar className="h-5 w-5 text-orange-400 mb-2" />
            <div className="font-bold">Datas</div>
            <div className="text-muted-foreground">10 a 14 SET 2026</div>
          </div>
          <div className="rounded-2xl border border-orange-400/20 bg-white/5 p-4">
            <ShieldCheck className="h-5 w-5 text-orange-400 mb-2" />
            <div className="font-bold">Compra segura</div>
            <div className="text-muted-foreground">Apenas links oficiais</div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/expo2026"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-bold text-sm text-black bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 shadow-[0_0_30px_-5px_rgba(251,146,60,0.7)]"
          >
            <Star className="h-4 w-4 fill-black" /> Acessar Expo 2026
          </Link>
          <Link
            to="/expo2026/programacao"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-sm border border-white/15 hover:border-orange-400/50 transition"
          >
            <Calendar className="h-4 w-4" /> Programação
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

export default ExpoIngressos;
