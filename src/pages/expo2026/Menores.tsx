import { useEffect } from "react";
import SEO from "@/components/SEO";
import { ExpoLayout } from "@/components/expo/ExpoLayout";
import { SectionTitle, FaqList } from "@/components/expo/ExpoShared";
import { trackExpoEvent } from "@/lib/expoAnalytics";

const REGRAS = [
  "Menores de 12 anos: entrada permitida apenas acompanhados dos pais ou responsáveis legais (com documento).",
  "Adolescentes de 13 a 17 anos: podem entrar desacompanhados desde que apresentem autorização legal por escrito assinada pelos pais ou responsáveis.",
  "Apresentação obrigatória de documento oficial com foto na portaria.",
  "Setores com bebida alcoólica (Área VIP, Front Stage, Camarotes): o consumo é permitido somente para maiores de 18 anos.",
  "A organização poderá restringir o acesso a determinados setores conforme política do evento.",
];

const DOCUMENTOS = [
  "RG ou Documento oficial com foto do menor",
  "RG ou Documento oficial com foto do responsável (acompanhando)",
  "Termo de autorização assinado (para adolescentes desacompanhados)",
  "Certidão de nascimento (se aplicável)",
];

const FAQ = [
  { q: "Crianças pagam ingresso?", a: "A política de meia-entrada e gratuidade para menores deve ser consultada nos canais oficiais do evento e na plataforma de venda (Eventou)." },
  { q: "Onde consigo o modelo de autorização?", a: "O modelo oficial de autorização para menores costuma ser disponibilizado pela organização do evento. Procure os canais oficiais @expoprudente2026oficial." },
  { q: "Menor pode entrar em Camarote?", a: "A entrada em camarote depende da política definida pelo titular da reserva e pela organização. Recomendamos confirmar antes da compra." },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": "https://roxou.com.br/expo2026/menores#page",
      url: "https://roxou.com.br/expo2026/menores",
      name: "Menores na Expo Prudente 2026 — Regras e Autorizações",
      description: "Regras oficiais de entrada de menores na Expo Prudente 2026, documentos necessários e autorizações.",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: "https://roxou.com.br/" },
        { "@type": "ListItem", position: 2, name: "Expo Prudente 2026", item: "https://roxou.com.br/expo2026" },
        { "@type": "ListItem", position: 3, name: "Menores", item: "https://roxou.com.br/expo2026/menores" },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function ExpoMenores() {
  useEffect(() => {
    trackExpoEvent("expo_view", { page: "menores" }, { once: true, onceKey: "expo_view_menores" });
  }, []);

  return (
    <ExpoLayout>
      <SEO
        title="Menores na Expo Prudente 2026 | Regras e Autorizações"
        description="Regras oficiais de entrada de menores na Expo Prudente 2026: idades, documentos, autorizações e FAQ completo."
        canonical="https://roxou.com.br/expo2026/menores"
        ogImage="https://roxou.com.br/images/expo2026-grade-oficial.webp"
        jsonLd={jsonLd}
      />

      <section className="px-5 pt-10 pb-6 text-center max-w-3xl mx-auto">
        <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-widest bg-gradient-to-r from-[#FF8A00] to-[#FFC300] text-black mb-5">
          👨‍👩‍👧 ENTRADA DE MENORES
        </span>
        <h1 className="font-black uppercase leading-[0.95]" style={{ fontSize: "clamp(2rem, 8vw, 3.6rem)" }}>
          Menores na Expo Prudente 2026
        </h1>
        <p className="mt-4 text-[#B8B8B8]">Confira as regras oficiais, documentos e autorizações necessárias.</p>
      </section>

      <section className="px-5 py-8 max-w-3xl mx-auto">
        <SectionTitle eyebrow="REGRAS OFICIAIS" title="O que diz a organização" />
        <ul className="mt-6 space-y-3">
          {REGRAS.map((r, i) => (
            <li key={i} className="flex gap-3 rounded-2xl border border-white/10 bg-[#121212] p-4">
              <span className="text-[#FFC300] font-black">•</span>
              <span className="text-sm text-[#D4D4D4] leading-relaxed">{r}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="px-5 py-8 max-w-3xl mx-auto">
        <SectionTitle eyebrow="DOCUMENTOS" title="O que levar" />
        <ul className="mt-6 grid gap-2.5">
          {DOCUMENTOS.map((d) => (
            <li key={d} className="rounded-xl border border-white/10 bg-[#0f0f0f] px-4 py-3 text-sm text-[#D4D4D4]">
              📄 {d}
            </li>
          ))}
        </ul>
      </section>

      <section className="px-5 py-8 max-w-3xl mx-auto">
        <SectionTitle eyebrow="PERGUNTAS FREQUENTES" title="Dúvidas comuns" />
        <FaqList items={FAQ} onOpen={(q) => trackExpoEvent("expo_faq_open", { page: "menores", question: q })} />
      </section>

      <section className="px-5 py-12 max-w-3xl mx-auto text-center">
        <p className="text-xs text-[#888] leading-relaxed">
          As regras finais são definidas pela organização oficial da Expo Prudente 2026. Em caso de dúvidas, consulte os canais oficiais antes de comparecer ao evento.
        </p>
      </section>
    </ExpoLayout>
  );
}
