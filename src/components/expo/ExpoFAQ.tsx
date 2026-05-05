import { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface FAQItem {
  q: string;
  a: string;
}

export const DEFAULT_EXPO_FAQ: FAQItem[] = [
  {
    q: "Quando começa a Expo Prudente 2026?",
    a: "A Expo Prudente 2026 acontece entre 10 e 14 de setembro de 2026 em Presidente Prudente, no Recinto de Exposições Jacob Tosello. As datas oficiais e a programação completa de shows estão sendo atualizadas aqui na ROXOU.",
  },
  {
    q: "Onde acontece a Expo Prudente?",
    a: "A Expo Prudente é realizada no Recinto de Exposições Jacob Tosello, em Presidente Prudente (SP), o maior espaço de eventos do Oeste Paulista, com estrutura de arena de shows, rodeio, praça gastronômica e parque de exposições.",
  },
  {
    q: "Quais shows já foram confirmados na Expo Prudente 2026?",
    a: "As atrações confirmadas são divulgadas em tempo real na seção 'Atrações confirmadas' desta página. A ROXOU publica cada anúncio oficial assim que liberado pela organização.",
  },
  {
    q: "Como comprar ingressos para a Expo Prudente 2026?",
    a: "Os links oficiais de venda de ingressos serão disponibilizados aqui em /expo2026/ingressos assim que abrirem. Acompanhe pela ROXOU para garantir a sua entrada antes do lote esgotar.",
  },
  {
    q: "Tem como ir de carona para a Expo?",
    a: "Sim. A ROXOU oferece o sistema 'Como você vai?' que conecta passageiros e motoristas para todos os dias da Expo Prudente, ajudando você a economizar e curtir com segurança.",
  },
  {
    q: "O que fazer em Presidente Prudente além da Expo?",
    a: "Além da Expo Prudente 2026, a ROXOU lista todos os eventos, baladas, bares e shows em Presidente Prudente. Veja a agenda completa em roxou.com.br.",
  },
];

export default function ExpoFAQ({ items = DEFAULT_EXPO_FAQ }: { items?: FAQItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="px-4 mx-auto max-w-6xl mt-16">
      <div className="mb-5">
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-orange-300">
          Perguntas frequentes
        </span>
        <h2 className="font-display text-2xl sm:text-4xl font-black mt-2">
          Sobre a <span className="text-orange-400">Expo Prudente 2026</span>
        </h2>
      </div>
      <div className="space-y-2">
        {items.map((it, i) => {
          const isOpen = open === i;
          return (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden"
            >
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-3 text-left px-5 py-4 hover:bg-white/[0.03] transition"
                aria-expanded={isOpen}
              >
                <span className="font-bold text-sm sm:text-base">{it.q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180 text-orange-400" : "text-muted-foreground"}`}
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{it.a}</div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function faqJsonLd(items: FAQItem[] = DEFAULT_EXPO_FAQ) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}
