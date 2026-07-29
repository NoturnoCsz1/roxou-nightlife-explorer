import { ReactNode } from "react";

/** Início oficial atualizado: 11/09/2026 às 19h (America/Sao_Paulo). */
export const EVENT_START_RAW = "2026-09-11T19:00:00-03:00";
export const EVENT_END_RAW = "2026-09-15T06:00:00-03:00";
export const EVENT_PERIOD_LABEL = "11 a 14 de setembro de 2026";
export const EVENT_VENUE = "Recinto de Exposições de Presidente Prudente";
export const EVENT_ADDRESS = "Rodovia Raposo Tavares, km 563 — Presidente Prudente/SP";
export const EVENT_AGE_RATING = "Maiores de 16 anos";
export const SUPPORT_PHONE_LABEL = "(18) 99126-1177";
export const SUPPORT_WHATSAPP = "https://wa.me/5518991261177";

export const MAPA_IMG = "/images/expo2026-mapa.jpg";
/** Arte oficial atualizada da programação geral (11 a 14/09). */
export const GRADE_IMG = "/expo2026/programacao/programacao-geral.jpg";
/** Comunicado oficial sobre a reestruturação da programação. */
export const COMUNICADO_IMG = "/expo2026/programacao/comunicado-oficial.jpg";
export const CAMAROTES_IMG = "/images/expo2026-camarotes.png";
export const PASSPORT_LINK =
  "https://eventou.com.br/evento/PASSAPORTE---TODOS-OS-DIAS---Expo-Prudente__3018";
/** Link genérico oficial (passaporte — todos os dias) usado nas sub-páginas. */
export const SHOWS_BUY_LINK = PASSPORT_LINK;

export interface ShowCard {
  id: string;
  date: string;
  weekday: string;
  artists: string[];
  link: string;
  /** Arte oficial do dia (imagem pública do projeto). */
  art?: string;
  /** Dia com pista de entrada gratuita. */
  freeEntry?: boolean;
  /** Selo extra (ex.: FERIADO). */
  badge?: string;
  /** Rótulo do botão de ingresso. */
  ctaLabel: string;
  /** Data ISO de início informada pela Eventou. */
  startIso: string;
}

export const SHOWS: ShowCard[] = [
  {
    id: "sex-11-09",
    date: "11/09",
    weekday: "SEXTA-FEIRA",
    artists: ["Loubet", "Pedro Henrique e Trevizan"],
    link: "https://eventou.com.br/evento/Sexta-11-09---Loubet-e-Pedro-Henrique-e-Trevisan---Expo-Prudente__3014",
    art: "/expo2026/programacao/dia-11-09.webp",
    freeEntry: true,
    ctaLabel: "Ver opções e setores",
    startIso: "2026-09-11T19:00:00-03:00",
  },
  {
    id: "sab-12-09",
    date: "12/09",
    weekday: "SÁBADO",
    artists: ["Panda", "Ícaro & Gilmar", "MC Hariel", "Hyllary Fernandes"],
    link: "https://eventou.com.br/evento/Sabado-12-09---Panda--icaro---Gilmar--Mc-Hariel-e-Hyllary-Fernandes---Expo-Prudente__3015",
    art: "/expo2026/programacao/dia-12-09.jpg",
    ctaLabel: "Comprar ingressos",
    startIso: "2026-09-12T19:00:00-03:00",
  },
  {
    id: "dom-13-09",
    date: "13/09",
    weekday: "DOMINGO",
    artists: ["Antony & Gabriel", "Pedro Sanches e Thiago"],
    link: "https://eventou.com.br/evento/Domingo-13-09--Antony---Gabriel---Pedro-Sanches-e-Thiago---Expo-Prudente__3016",
    art: "/expo2026/programacao/dia-13-09.jpg",
    freeEntry: true,
    ctaLabel: "Ver opções e setores",
    startIso: "2026-09-13T19:00:00-03:00",
  },
  {
    id: "seg-14-09",
    date: "14/09",
    weekday: "SEGUNDA-FEIRA",
    artists: ["Zezé Di Camargo & Luciano", "Mariana Fagundes", "Hyllary Fernandes"],
    link: "https://eventou.com.br/evento/Segunda-14-09---Zeze-Di-Camargo---Luciano-e-Mariana-Fagundes---Expo-Prudente__3017",
    art: "/expo2026/programacao/dia-14-09.jpg",
    badge: "FERIADO",
    ctaLabel: "Comprar ingressos",
    startIso: "2026-09-14T19:00:00-03:00",
  },
];

export const SETORES: { name: string; items: string[] }[] = [
  {
    name: "PISTA",
    items: [
      "Entrada gratuita nos dias 11 e 13 de setembro.",
      "Nos demais dias, consultar disponibilidade e condições na Eventou.",
    ],
  },
  { name: "ÁREA VIP", items: ["Consultar lotes e disponibilidade na Eventou."] },
  { name: "FRONTSTAGE OPEN", items: ["Inclui cerveja, vodka, refrigerante, água e suco."] },
  {
    name: "BOATE",
    items: [
      "Acesso somente para quem adquiriu outro setor, conforme regras da organização e disponibilidade da Eventou.",
    ],
  },
];



export const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "Quando acontece a Expo Prudente 2026?",
    a: "A Expo Prudente 2026 acontece de 11 a 14 de setembro de 2026, no Recinto de Exposições de Presidente Prudente/SP.",
  },
  {
    q: "Quais dias têm pista com entrada gratuita?",
    a: "Conforme o comunicado oficial da organização, os dias 11 e 13 de setembro têm pista com entrada gratuita.",
  },
  {
    q: "Onde comprar ingressos da Expo Prudente 2026?",
    a: "Os ingressos são vendidos e gerenciados pela plataforma Eventou. Na Roxou você encontra os links oficiais de cada dia e do passaporte.",
  },
  {
    q: "Quais artistas estão confirmados na Expo Prudente 2026?",
    a: "11/09: Loubet e Pedro Henrique e Trevizan. 12/09: Panda, Ícaro & Gilmar, MC Hariel e Hyllary Fernandes. 13/09: Antony & Gabriel e Pedro Sanches e Thiago. 14/09: Zezé Di Camargo & Luciano, Mariana Fagundes e Hyllary Fernandes.",
  },
  {
    q: "A Roxou é organizadora oficial da Expo Prudente?",
    a: "Não. A Roxou atua exclusivamente na divulgação de informações públicas. Organização, venda de ingressos, alterações, cancelamentos e reembolsos são responsabilidade dos organizadores e da plataforma Eventou.",
  },
  {
    q: "Como falar com o suporte sobre ingressos?",
    a: "O atendimento sobre pedidos, trocas e reembolsos é feito pelo suporte da Eventou: (18) 99126-1177.",
  },
];


export function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="text-center mb-6">
      <p
        className="text-xs font-bold tracking-[0.3em] mb-3 bg-clip-text text-transparent"
        style={{ backgroundImage: "linear-gradient(135deg, #FF8A00, #FFC300)" }}
      >
        {eyebrow}
      </p>
      <h2
        className="font-black uppercase leading-tight"
        style={{ fontSize: "clamp(1.5rem, 5.5vw, 2.4rem)" }}
      >
        {title}
      </h2>
    </div>
  );
}

export function GoldButton({
  href,
  onClick,
  children,
  as = "a",
}: {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  as?: "a" | "button";
}) {
  const className =
    "inline-flex items-center gap-2 px-6 py-3 rounded-full font-extrabold text-black text-sm sm:text-base shadow-[0_10px_30px_-10px_rgba(255,138,0,0.7)] hover:scale-[1.03] active:scale-[0.98] transition-transform";
  const style = { background: "linear-gradient(135deg, #FF8A00, #FFC300)" };
  if (as === "button") {
    return (
      <button type="button" onClick={onClick} className={className} style={style}>
        {children}
      </button>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={className}
      style={style}
    >
      {children}
    </a>
  );
}

export function FaqList({
  items,
  onOpen,
}: {
  items: { q: string; a: string }[];
  onOpen?: (q: string) => void;
}) {
  return (
    <div className="mt-8 space-y-3">
      {items.map((item, i) => (
        <details
          key={i}
          className="group rounded-2xl border border-white/10 bg-[#121212] hover:border-[#FF8A00]/40 transition-colors"
          onToggle={(e) => {
            if ((e.currentTarget as HTMLDetailsElement).open) onOpen?.(item.q);
          }}
        >
          <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-3">
            <span className="font-bold text-white text-sm md:text-base">{item.q}</span>
            <span className="text-[#FFC300] text-lg group-open:rotate-45 transition-transform">
              +
            </span>
          </summary>
          <p className="px-5 pb-5 text-sm text-[#B8B8B8] leading-relaxed">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
