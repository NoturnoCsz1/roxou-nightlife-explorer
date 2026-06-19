import { useEffect } from "react";
import SEO from "@/components/SEO";
import { ExpoLayout } from "@/components/expo/ExpoLayout";
import { SectionTitle, GoldButton, FaqList, SHOWS_BUY_LINK } from "@/components/expo/ExpoShared";
import { trackExpoEvent } from "@/lib/expoAnalytics";

const BENEFICIOS = [
  { icon: "🍻", title: "Open Bar", desc: "Bebidas inclusas durante toda a noite, com atendimento dedicado." },
  { icon: "🎤", title: "Frente do Palco", desc: "Proximidade total com os artistas — vista privilegiada." },
  { icon: "✨", title: "Ambientação Premium", desc: "Decoração diferenciada, iluminação e estrutura exclusiva." },
  { icon: "🚪", title: "Acesso Facilitado", desc: "Entrada exclusiva, fluxo controlado e fila reduzida." },
];

const FRONT_FAQ = [
  { q: "O que está incluso no Front Stage?", a: "O Front Stage Open Bar inclui bebidas alcoólicas e não alcoólicas selecionadas, acesso a área premium em frente ao palco e estrutura diferenciada." },
  { q: "Onde fica a área Front Stage?", a: "O Front Stage fica posicionado na frente do palco principal, oferecendo a melhor visibilidade dos shows." },
  { q: "É necessário levar documento?", a: "Sim. Apresentação de documento oficial com foto é obrigatória na entrada para todos os setores." },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": "https://roxou.com.br/expo2026/front-stage#page",
      url: "https://roxou.com.br/expo2026/front-stage",
      name: "Front Stage Open Bar — Expo Prudente 2026",
      description: "Front Stage Open Bar da Expo Prudente 2026: o setor premium em frente ao palco principal.",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: "https://roxou.com.br/" },
        { "@type": "ListItem", position: 2, name: "Expo Prudente 2026", item: "https://roxou.com.br/expo2026" },
        { "@type": "ListItem", position: 3, name: "Front Stage", item: "https://roxou.com.br/expo2026/front-stage" },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: FRONT_FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function ExpoFrontStage() {
  useEffect(() => {
    trackExpoEvent("expo_view", { page: "front-stage" }, { once: true, onceKey: "expo_view_front" });
  }, []);

  return (
    <ExpoLayout>
      <SEO
        title="Front Stage Expo Prudente 2026 | Open Bar Premium"
        description="Front Stage Open Bar Expo Prudente 2026: setor premium em frente ao palco com bebidas inclusas e estrutura exclusiva."
        canonical="https://roxou.com.br/expo2026/front-stage"
        ogImage="https://roxou.com.br/images/expo2026-grade-oficial.webp"
        jsonLd={jsonLd}
      />

      <section className="px-5 pt-10 pb-6 text-center max-w-3xl mx-auto">
        <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-widest bg-gradient-to-r from-[#FF8A00] to-[#FFC300] text-black mb-5">
          🍺 FRONT STAGE OPEN BAR
        </span>
        <h1
          className="font-black uppercase leading-[0.95] tracking-tight"
          style={{ fontSize: "clamp(2rem, 8vw, 3.6rem)" }}
        >
          A experiência <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg,#FF8A00,#FFC300)" }}>mais próxima do palco</span>
        </h1>
        <p className="mt-4 text-[#B8B8B8]">
          Open bar, ambientação premium e a melhor visão dos shows da Expo Prudente 2026.
        </p>
      </section>

      <section className="px-5 py-8 max-w-5xl mx-auto">
        <SectionTitle eyebrow="O QUE É" title="Front Stage Open Bar" />
        <p className="max-w-3xl mx-auto text-center text-[#D4D4D4] leading-relaxed">
          O Front Stage é o setor premium em frente ao palco principal, com open bar incluso e ambientação exclusiva. Pensado para quem quer viver a Expo Prudente 2026 com o máximo de conforto, proximidade dos artistas e atendimento diferenciado.
        </p>
      </section>

      <section className="px-5 py-8 max-w-5xl mx-auto">
        <SectionTitle eyebrow="VANTAGENS" title="Benefícios do Front Stage" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          {BENEFICIOS.map((b) => (
            <div key={b.title} className="rounded-2xl p-4 bg-[#121212] border border-white/10 hover:border-[#FF8A00]/40 transition-colors text-center">
              <div className="text-3xl mb-2">{b.icon}</div>
              <p className="text-sm font-extrabold text-white">{b.title}</p>
              <p className="mt-1 text-xs text-[#B8B8B8] leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 py-8 max-w-3xl mx-auto">
        <SectionTitle eyebrow="LOCALIZAÇÃO" title="Onde fica" />
        <p className="text-center text-[#D4D4D4]">
          O Front Stage fica posicionado em frente ao palco principal do Recinto de Exposições de Presidente Prudente/SP. Confira o mapa completo em{" "}
          <a href="/expo2026/mapa" className="text-[#FFC300] underline">/expo2026/mapa</a>.
        </p>
      </section>

      <section className="px-5 py-8 max-w-3xl mx-auto">
        <SectionTitle eyebrow="PERGUNTAS FREQUENTES" title="Front Stage" />
        <FaqList items={FRONT_FAQ} onOpen={(q) => trackExpoEvent("expo_faq_open", { page: "front-stage", question: q })} />
      </section>

      <section className="px-5 py-12 text-center">
        <GoldButton href={SHOWS_BUY_LINK} onClick={() => trackExpoEvent("expo_eventou_click", { source: "front_stage_page" })}>
          🎟️ Comprar Front Stage
        </GoldButton>
      </section>
    </ExpoLayout>
  );
}
