import { ReactNode } from "react";

export const EVENT_START_RAW = "2026-09-10T19:00:00-03:00";
export const MAPA_IMG = "/images/expo2026-mapa.jpg";
/** Arte oficial atualizada da programação geral (11 a 14/09). */
export const GRADE_IMG = "/expo2026/programacao/programacao-geral.jpg";
/** Comunicado oficial sobre a reestruturação da programação. */
export const COMUNICADO_IMG = "/expo2026/programacao/comunicado-oficial.jpg";
export const CAMAROTES_IMG = "/images/expo2026-camarotes.png";
export const SHOWS_BUY_LINK =
  "https://eventou.com.br/evento/Quinta-10-09---Leonardo---Expo-Prudente__3013";
export const PASSPORT_LINK =
  "https://eventou.com.br/evento/PASSAPORTE---TODOS-OS-DIAS---Expo-Prudente__3018";

export interface ShowCard {
  id: string;
  date: string;
  weekday: string;
  artists: string[];
  link: string;
  /** Arte oficial do dia (imagem pública do projeto). */
  art?: string;
  /** Dia com portões abertos (sem venda de ingresso). */
  freeEntry?: boolean;
}

export const SHOWS: ShowCard[] = [
  {
    id: "sex-11-09",
    date: "11/09",
    weekday: "SEXTA-FEIRA",
    artists: ["Loubet", "Pedro Henrique & Trevisan"],
    link: "",
    art: "/expo2026/programacao/dia-11-09.webp",
    freeEntry: true,
  },
  {
    id: "sab-12-09",
    date: "12/09",
    weekday: "SÁBADO",
    artists: ["Panda", "Ícaro & Gilmar", "MC Hariel", "Hyllary Fernandes"],
    link: "https://eventou.com.br/evento/Sabado-12-09---Panda--icaro---Gilmar--Mc-Hariel-e-Pedro-Sanches-e-Thiago---Expo-Prudente__3015",
    art: "/expo2026/programacao/dia-12-09.jpg",
  },
  {
    id: "dom-13-09",
    date: "13/09",
    weekday: "DOMINGO",
    artists: ["Antony & Gabriel", "Pedro Sanchez & Thiago"],
    link: "",
    art: "/expo2026/programacao/dia-13-09.jpg",
    freeEntry: true,
  },
  {
    id: "seg-14-09",
    date: "14/09",
    weekday: "SEGUNDA-FEIRA",
    artists: ["Zezé Di Camargo & Luciano", "Mariana Fagundes", "Hyllary Fernandes"],
    link: "https://eventou.com.br/evento/Segunda-14-09---Zeze-Di-Camargo---Luciano-e-Mariana-Fagundes---Expo-Prudente__3017",
    art: "/expo2026/programacao/dia-14-09.jpg",
  },
];


export const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "Quando acontece a Expo Prudente 2026?",
    a: "A Expo Prudente 2026 acontece de 11 a 14 de setembro, em Presidente Prudente/SP, conforme a programação oficial atualizada.",
  },
  {
    q: "Onde comprar ingressos da Expo Prudente 2026?",
    a: "Os ingressos podem ser acessados pelos links oficiais disponibilizados nos cards de cada show na página da Roxou, direcionando para a plataforma de venda responsável. Os dias 11/09 e 13/09 são de portões abertos.",
  },
  {
    q: "Quais artistas estão confirmados na Expo Prudente 2026?",
    a: "Conforme a programação oficial atualizada: 11/09 Loubet e Pedro Henrique & Trevisan (portões abertos); 12/09 Panda, Ícaro & Gilmar, MC Hariel e Hyllary Fernandes; 13/09 Antony & Gabriel e Pedro Sanchez & Thiago (portões abertos); 14/09 Zezé Di Camargo & Luciano, Mariana Fagundes e Hyllary Fernandes.",
  },

  {
    q: "Onde fica o mapa dos setores da Expo Prudente 2026?",
    a: "O mapa dos setores está disponível em /expo2026/mapa, com visualização ampliada, zoom e setores como Arquibancada, Pista Arena, Camarotes, Área VIP, Front Open Bar, Palco e Boate.",
  },
  {
    q: "A Roxou é organizadora oficial da Expo Prudente?",
    a: "Não. A Roxou atua como portal de divulgação e curadoria de informações públicas sobre eventos, ingressos, programação e agenda regional.",
  },
  {
    q: "Os camarotes da Expo Prudente 2026 já estão disponíveis?",
    a: "Sim. A organização oficial divulgou o mapa de camarotes com 120 espaços numerados. Informações de venda pelo WhatsApp oficial: (18) 99108-6855.",
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
