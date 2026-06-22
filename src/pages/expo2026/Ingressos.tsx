import { useEffect } from "react";
import SEO from "@/components/SEO";
import { ExpoLayout } from "@/components/expo/ExpoLayout";
import { SectionTitle, GoldButton, SHOWS_BUY_LINK, PASSPORT_LINK } from "@/components/expo/ExpoShared";
import CamarotesSection from "@/components/expo/CamarotesSection";
import { trackExpoEvent } from "@/lib/expoAnalytics";

const SETORES_INFO = [
  {
    key: "vip",
    icon: "👑",
    title: "Área VIP",
    desc: "Setor exclusivo com acesso facilitado, estrutura premium e ambiente reservado próximo ao palco.",
  },
  {
    key: "front",
    icon: "🍻",
    title: "Front Stage (Open Bar)",
    desc: "Área frontal premium com bebidas inclusas (open bar) e a melhor experiência colada ao palco.",
  },
  {
    key: "camarote",
    icon: "🏛️",
    title: "Camarotes",
    desc: "120 espaços privativos elevados, com vista privilegiada, serviço dedicado e venda oficial.",
  },
  {
    key: "pista",
    icon: "🎶",
    title: "Pista",
    desc: "Área em pé próxima ao palco — a maior energia do público e o setor mais democrático do evento.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": "https://roxou.com.br/expo2026/ingressos#page",
      url: "https://roxou.com.br/expo2026/ingressos",
      name: "Ingressos Expo Prudente 2026 — VIP, Front Stage, Camarotes e Pista",
      description:
        "Ingressos oficiais da Expo Prudente 2026: Área VIP, Front Stage (Open Bar), Camarotes e Pista.",
      offers: {
        "@type": "Offer",
        name: "Passaporte — Todos os Dias — Expo Prudente 2026",
        url: PASSPORT_LINK,
        availability: "https://schema.org/InStock",
        category: "primary",
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: "https://roxou.com.br/" },
        { "@type": "ListItem", position: 2, name: "Expo Prudente 2026", item: "https://roxou.com.br/expo2026" },
        { "@type": "ListItem", position: 3, name: "Ingressos", item: "https://roxou.com.br/expo2026/ingressos" },
      ],
    },
  ],
};

export default function ExpoIngressos() {
  useEffect(() => {
    trackExpoEvent("expo_view", { page: "ingressos" }, { once: true, onceKey: "expo_view_ingressos" });
    trackExpoEvent("expo_passaporte_view", { page: "ingressos" }, { once: true, onceKey: "expo_passaporte_view_ingressos" });
  }, []);

  return (
    <ExpoLayout>
      <SEO
        title="Ingressos Expo Prudente 2026 | VIP, Front Stage, Camarotes e Pista"
        description="Ingressos oficiais da Expo Prudente 2026: Área VIP, Front Stage Open Bar, Camarotes numerados e Pista. Compra oficial via Eventou."
        canonical="https://roxou.com.br/expo2026/ingressos"
        ogImage="https://roxou.com.br/images/expo2026-grade-oficial.webp"
        jsonLd={jsonLd}
      />

      <section className="px-5 pt-10 pb-6 text-center max-w-3xl mx-auto">
        <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-widest bg-gradient-to-r from-[#FF8A00] to-[#FFC300] text-black mb-5">
          🎫 INGRESSOS OFICIAIS
        </span>
        <h1
          className="font-black uppercase leading-[0.95] tracking-tight"
          style={{ fontSize: "clamp(2rem, 8vw, 3.6rem)" }}
        >
          Ingressos <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg,#FF8A00,#FFC300)" }}>Expo Prudente 2026</span>
        </h1>
        <p className="mt-4 text-[#B8B8B8] text-sm md:text-base">
          Escolha o setor ideal para você: VIP, Front Stage, Camarotes ou Pista.
        </p>
      </section>

      {/* ===== PASSAPORTE TODOS OS DIAS — card premium ===== */}
      <section className="px-5 pb-2 max-w-3xl mx-auto">
        <article
          className="relative overflow-hidden rounded-3xl border border-[#FFC300]/40 p-6 md:p-7"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,138,0,0.18) 0%, rgba(255,195,0,0.10) 50%, rgba(10,10,10,0.95) 100%)",
            boxShadow: "0 20px 60px -20px rgba(255,138,0,0.45)",
          }}
        >
          <div
            className="absolute -top-20 -right-20 w-48 h-48 rounded-full blur-3xl opacity-40"
            style={{ background: "radial-gradient(circle, #FFC300, transparent)" }}
            aria-hidden
          />
          <div className="relative">
            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-widest bg-black/60 text-[#FFC300] border border-[#FFC300]/40 mb-3">
              ✨ NOVIDADE OFICIAL
            </span>
            <h2
              className="font-black uppercase leading-tight text-white"
              style={{ fontSize: "clamp(1.5rem, 6vw, 2.2rem)" }}
            >
              Passaporte —{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(135deg,#FF8A00,#FFC300)" }}
              >
                Todos os Dias
              </span>
            </h2>
            <p className="mt-3 text-sm md:text-base text-[#D8D8D8] leading-relaxed">
              Garanta acesso para todos os dias da Expo Prudente 2026 em uma única opção de ingresso.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["10 a 14 de setembro", "Todos os dias", "Link Eventou", "Programação completa"].map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold text-[#FFC300] bg-[#FFC300]/10 border border-[#FFC300]/25"
                >
                  {chip}
                </span>
              ))}
            </div>
            <a
              href={PASSPORT_LINK}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                trackExpoEvent("expo_passaporte_click", { source: "ingressos_page" });
                trackExpoEvent("expo_passaporte_eventou_click", { source: "ingressos_page" });
              }}
              className="mt-6 inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-extrabold text-black text-sm md:text-base shadow-[0_10px_40px_-10px_rgba(255,138,0,0.7)] hover:scale-[1.03] active:scale-[0.98] transition-transform"
              style={{ background: "linear-gradient(135deg, #FF8A00, #FFC300)" }}
            >
              🎟️ Comprar Passaporte
            </a>
          </div>
        </article>
      </section>

      <section className="px-5 py-8 max-w-5xl mx-auto">
        <SectionTitle eyebrow="ESCOLHA SEU SETOR" title="Setores disponíveis" />
        <div className="grid gap-3 md:grid-cols-2 mt-6">
          {SETORES_INFO.map((s) => (
            <article
              key={s.key}
              className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#121212] to-[#0a0a0a] p-5 hover:border-[#FF8A00]/50 transition-colors"
            >
              <div className="text-3xl mb-2">{s.icon}</div>
              <h3 className="font-extrabold text-white text-lg">{s.title}</h3>
              <p className="mt-1.5 text-sm text-[#B8B8B8] leading-relaxed">{s.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <CamarotesSection />

      <section className="px-5 py-12 text-center max-w-3xl mx-auto">
        <GoldButton
          href={SHOWS_BUY_LINK}
          onClick={() => trackExpoEvent("expo_eventou_click", { source: "ingressos_page" })}
        >
          🎟️ Comprar Ingressos
        </GoldButton>
      </section>
    </ExpoLayout>
  );
}
