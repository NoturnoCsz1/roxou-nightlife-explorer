import { Link } from "react-router-dom";
import { ArrowLeft, Music, Star, Calendar, MapPin } from "lucide-react";
import SEO from "@/components/SEO";
import ExpoFAQ, { faqJsonLd } from "@/components/expo/ExpoFAQ";

const ExpoShows = () => {
  return (
    <div className="min-h-screen bg-[#0a0612] text-foreground">
      <SEO
        title="Shows da Expo Prudente 2026 — Atrações confirmadas | ROXOU"
        description="Confira todos os shows confirmados da Expo Prudente 2026 em Presidente Prudente. Sertanejo, rodeio, line-up oficial e datas. Atualizado em tempo real pela ROXOU."
        canonical="https://roxou.com.br/expo2026/shows"
        keywords="shows expo prudente 2026, atrações expo prudente, shows em presidente prudente, expo prudente line-up"
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
        <div className="inline-flex items-center gap-2 mb-3">
          <Music className="h-4 w-4 text-orange-400" />
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-orange-300">
            Line-up oficial
          </span>
        </div>
        <h1 className="font-display text-3xl sm:text-5xl font-black leading-tight">
          Shows da <span className="text-orange-400">Expo Prudente 2026</span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-white/70 leading-relaxed">
          Veja todos os shows confirmados da <strong>Expo Prudente 2026</strong>, a maior festa de
          Presidente Prudente e do Oeste Paulista. A ROXOU acompanha cada anúncio oficial e atualiza
          a lista de atrações em tempo real, com sertanejo, pagode, rodeio e os principais nomes do
          Brasil.
        </p>
        <p className="mt-3 text-sm text-white/60 leading-relaxed">
          A Expo é o evento mais aguardado do calendário de <strong>shows em Presidente Prudente</strong>.
          Aqui você encontra a programação dos shows, datas, horários e o palco de cada atração
          assim que a organização libera. Compartilhe a página com os amigos e garanta o seu lugar.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/expo2026#atracoes"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-bold text-sm text-black bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 shadow-[0_0_30px_-5px_rgba(251,146,60,0.7)] hover:scale-105 transition"
          >
            <Star className="h-4 w-4 fill-black" /> Ver shows confirmados
          </Link>
          <Link
            to="/expo2026/programacao"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-sm border border-white/15 text-white hover:border-orange-400/50 transition"
          >
            <Calendar className="h-4 w-4" /> Programação completa
          </Link>
        </div>

        <div className="mt-10 grid sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl border border-orange-400/20 bg-white/5 p-4">
            <Calendar className="h-5 w-5 text-orange-400 mb-2" />
            <div className="font-bold">Quando</div>
            <div className="text-muted-foreground">10 a 14 de setembro de 2026</div>
          </div>
          <div className="rounded-2xl border border-orange-400/20 bg-white/5 p-4">
            <MapPin className="h-5 w-5 text-orange-400 mb-2" />
            <div className="font-bold">Onde</div>
            <div className="text-muted-foreground">
              Recinto de Exposições Jacob Tosello — Presidente Prudente, SP
            </div>
          </div>
        </div>
      </section>

      <ExpoFAQ />

      <footer className="mt-16 border-t border-white/10 py-8 text-center text-xs text-muted-foreground">
        <Link to="/expo2026" className="text-orange-300 font-bold">← Voltar para Expo Prudente 2026</Link>
      </footer>
    </div>
  );
};

export default ExpoShows;
