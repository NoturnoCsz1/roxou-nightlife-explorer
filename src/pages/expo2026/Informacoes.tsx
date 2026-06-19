import { useEffect } from "react";
import SEO from "@/components/SEO";
import { ExpoLayout } from "@/components/expo/ExpoLayout";
import { SectionTitle, FaqList, FAQ_ITEMS } from "@/components/expo/ExpoShared";
import { trackExpoEvent } from "@/lib/expoAnalytics";

const BLOCOS = [
  {
    icon: "🕒",
    title: "Horários",
    desc: "Abertura dos portões a partir do final da tarde, com início dos shows à noite. Confira a programação oficial diariamente, pois os horários podem variar conforme o dia.",
  },
  {
    icon: "🅿️",
    title: "Estacionamento",
    desc: "O recinto conta com áreas oficiais de estacionamento. Recomendamos chegar com antecedência, especialmente nos dias de maior público (sábado e domingo).",
  },
  {
    icon: "🍔",
    title: "Praça de Alimentação",
    desc: "Variedade de food trucks, lanchonetes e barracas com pratos típicos, lanches, doces e bebidas durante todos os dias do evento.",
  },
  {
    icon: "🎡",
    title: "Parque de Diversões",
    desc: "Brinquedos, atrações e diversão para toda a família dentro do recinto da Expo Prudente 2026.",
  },
  {
    icon: "🚪",
    title: "Portões",
    desc: "Portões organizados por setor. Tenha o ingresso (físico ou digital) e documento oficial com foto sempre em mãos.",
  },
  {
    icon: "ℹ️",
    title: "Informações Gerais",
    desc: "Em caso de dúvidas, consulte os canais oficiais @expoprudente2026oficial. A Roxou atua apenas como portal de divulgação.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": "https://roxou.com.br/expo2026/informacoes#page",
      url: "https://roxou.com.br/expo2026/informacoes",
      name: "Informações Expo Prudente 2026 — Horários, Estacionamento e Estrutura",
      description: "Informações práticas da Expo Prudente 2026: horários, estacionamento, praça de alimentação, parque, portões e dicas.",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: "https://roxou.com.br/" },
        { "@type": "ListItem", position: 2, name: "Expo Prudente 2026", item: "https://roxou.com.br/expo2026" },
        { "@type": "ListItem", position: 3, name: "Informações", item: "https://roxou.com.br/expo2026/informacoes" },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ_ITEMS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function ExpoInformacoes() {
  useEffect(() => {
    trackExpoEvent("expo_view", { page: "informacoes" }, { once: true, onceKey: "expo_view_info" });
  }, []);

  return (
    <ExpoLayout>
      <SEO
        title="Informações Expo Prudente 2026 | Horários, Estacionamento e Estrutura"
        description="Tudo sobre a Expo Prudente 2026: horários dos shows, estacionamento, praça de alimentação, parque de diversões, portões e dicas práticas."
        canonical="https://roxou.com.br/expo2026/informacoes"
        ogImage="https://roxou.com.br/images/expo2026-grade-oficial.webp"
        jsonLd={jsonLd}
      />

      <section className="px-5 pt-10 pb-6 text-center max-w-3xl mx-auto">
        <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-widest bg-gradient-to-r from-[#FF8A00] to-[#FFC300] text-black mb-5">
          ℹ️ INFORMAÇÕES OFICIAIS
        </span>
        <h1 className="font-black uppercase leading-[0.95]" style={{ fontSize: "clamp(2rem, 8vw, 3.6rem)" }}>
          Informações Expo Prudente 2026
        </h1>
        <p className="mt-4 text-[#B8B8B8]">Tudo o que você precisa saber antes de ir ao evento.</p>
      </section>

      <section className="px-5 py-8 max-w-5xl mx-auto">
        <SectionTitle eyebrow="ESTRUTURA E HORÁRIOS" title="O que você precisa saber" />
        <div className="grid gap-3 md:grid-cols-2 mt-6">
          {BLOCOS.map((b) => (
            <article key={b.title} className="rounded-2xl border border-white/10 bg-[#121212] p-5 hover:border-[#FF8A00]/40 transition-colors">
              <div className="text-3xl mb-2">{b.icon}</div>
              <h3 className="font-extrabold text-white">{b.title}</h3>
              <p className="mt-1.5 text-sm text-[#B8B8B8] leading-relaxed">{b.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-5 py-8 max-w-3xl mx-auto">
        <SectionTitle eyebrow="PERGUNTAS FREQUENTES" title="Tudo sobre a Expo Prudente 2026" />
        <FaqList items={FAQ_ITEMS} onOpen={(q) => trackExpoEvent("expo_faq_open", { page: "informacoes", question: q })} />
      </section>
    </ExpoLayout>
  );
}
