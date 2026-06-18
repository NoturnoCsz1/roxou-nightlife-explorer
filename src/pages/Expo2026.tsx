import { useEffect, useMemo, useRef, useState } from "react";
import { Ticket, MapPin, X, ZoomIn, Instagram } from "lucide-react";
import SEO from "@/components/SEO";

/* ============================================================================
 * EXPO PRUDENTE 2026 — Landing oficial de divulgação (hub Roxou → Eventou)
 *
 * A Roxou NÃO é organizadora. Esta página apenas divulga e redireciona
 * para a compra oficial via Eventou.
 * ========================================================================= */

const EVENT_START_RAW = "2026-09-10T18:00:00-03:00";

// Primary: served from /public on VPS. Fallback handled by onError.
const MAPA_IMG = "/images/expo2026-mapa.jpg";

interface ShowCard {
  id: string;
  date: string; // "10/09"
  weekday: string;
  artists: string[];
  link: string;
}

const SHOWS: ShowCard[] = [
  {
    id: "qui-10-09",
    date: "10/09",
    weekday: "QUINTA-FEIRA",
    artists: ["Leonardo"],
    link: "https://eventou.com.br/evento/Quinta-10-09---Leonardo---Expo-Prudente__3013",
  },
  {
    id: "sex-11-09",
    date: "11/09",
    weekday: "SEXTA-FEIRA",
    artists: ["Antony & Gabriel", "Loubet"],
    link: "https://eventou.com.br/evento/Sexta-11-09---Antony---Gabriel-e-Loubet---Expo-Prudente__3014",
  },
  {
    id: "sab-12-09",
    date: "12/09",
    weekday: "SÁBADO",
    artists: ["Panda", "Ícaro & Gilmar", "MC Hariel", "Pedro Sanches & Thiago"],
    link: "https://eventou.com.br/evento/Sabado-12-09---Panda--icaro---Gilmar--Mc-Hariel-e-Pedro-Sanches-e-Thiago---Expo-Prudente__3015",
  },
  {
    id: "dom-13-09",
    date: "13/09",
    weekday: "DOMINGO",
    artists: ["Zé Neto & Cristiano", "Mariana & Mateus"],
    link: "https://eventou.com.br/evento/Domingo-13-09--Ze-Neto----Cristiano-e-Mariana---Mateus---Expo-Prudente__3016",
  },
  {
    id: "seg-14-09",
    date: "14/09",
    weekday: "SEGUNDA-FEIRA",
    artists: ["Zezé Di Camargo & Luciano", "Mariana Fagundes"],
    link: "https://eventou.com.br/evento/Segunda-14-09---Zeze-Di-Camargo---Luciano-e-Mariana-Fagundes---Expo-Prudente__3017",
  },
];

const EXPERIENCIAS = [
  { icon: "🤠", label: "Rodeio Profissional" },
  { icon: "🎡", label: "Parque de Diversões" },
  { icon: "🍔", label: "Praça de Alimentação" },
  { icon: "🎶", label: "Grandes Shows" },
  { icon: "🍻", label: "Front Open Bar" },
  { icon: "👑", label: "Área VIP" },
];

const SETORES = [
  "Arquibancada",
  "Pista Arena",
  "Camarotes",
  "Área VIP",
  "Front Open Bar",
  "Palco",
  "Boate",
];

function useCountdown(targetIso: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000 * 30);
    return () => clearInterval(id);
  }, []);
  const targetMs = (() => {
    const t = new Date(targetIso).getTime();
    return Number.isFinite(t) ? t : NaN;
  })();
  if (!Number.isFinite(targetMs)) return { days: 0, hours: 0, valid: false };
  const diff = Math.max(0, targetMs - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  return { days, hours, valid: true };
}

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Expo2026() {
  const { days, hours } = useCountdown(EVENT_START);
  const [mapaOpen, setMapaOpen] = useState(false);
  const [mapaError, setMapaError] = useState(false);
  const showsRef = useRef<HTMLElement | null>(null);

  const jsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "Festival",
      name: "Expo Prudente 2026",
      startDate: "2026-09-10",
      endDate: "2026-09-14",
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: {
        "@type": "Place",
        name: "Recinto de Exposições — Presidente Prudente/SP",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Presidente Prudente",
          addressRegion: "SP",
          addressCountry: "BR",
        },
      },
      offers: SHOWS.map((s) => ({
        "@type": "Offer",
        url: s.link,
        availability: "https://schema.org/InStock",
        category: "primary",
      })),
      subEvent: SHOWS.map((s) => ({
        "@type": "MusicEvent",
        name: `${s.artists.join(", ")} — Expo Prudente 2026`,
        startDate: `2026-09-${s.date.split("/")[0]}T22:00:00-03:00`,
        url: s.link,
        location: {
          "@type": "Place",
          name: "Recinto de Exposições — Presidente Prudente/SP",
        },
      })),
    }),
    []
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden">
      <SEO
        title="Expo Prudente 2026: Ingressos Oficiais, Mapa do Evento e Programação Completa | Roxou"
        description="Confira a programação completa da Expo Prudente 2026, mapa do evento, setores e links oficiais para compra de ingressos de todos os dias de shows em Presidente Prudente."
        canonical="https://roxou.com.br/expo2026"
        keywords="expo prudente 2026, ingressos expo prudente, leonardo prudente, zé neto e cristiano prudente, zezé di camargo prudente, expo prudente programação"
        jsonLd={jsonLd}
      />

      {/* Background textura */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, #FF8A00 0px, transparent 1px), radial-gradient(circle at 80% 60%, #FFC300 0px, transparent 1px)",
          backgroundSize: "40px 40px, 60px 60px",
        }}
      />

      {/* ============== HERO ============== */}
      <section className="relative pt-10 pb-16 px-5 text-center">
        {/* Cantos curvos decorativos */}
        <CornerCurve className="absolute -top-2 -left-2 w-24 h-24 md:w-32 md:h-32" />
        <CornerCurve className="absolute -top-2 -right-2 w-24 h-24 md:w-32 md:h-32" rotate={90} />

        <div className="relative max-w-3xl mx-auto">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-widest bg-gradient-to-r from-[#FF8A00] to-[#FFC300] text-black mb-6">
            🎟️ VENDAS LIBERADAS
          </span>

          <h1
            className="font-black uppercase leading-[0.95] tracking-tight"
            style={{
              fontSize: "clamp(2.2rem, 9vw, 4.5rem)",
              textShadow: "0 0 40px rgba(255,138,0,0.35)",
            }}
          >
            <span className="block text-white">EXPO PRUDENTE</span>
            <span
              className="block bg-clip-text text-transparent"
              style={{
                backgroundImage: "linear-gradient(135deg, #FF8A00, #FFC300)",
              }}
            >
              2026
            </span>
          </h1>

          <p className="mt-6 text-lg md:text-2xl font-bold text-white">
            A MAIOR GRADE DE SHOWS JÁ DIVULGADA!
          </p>

          <p className="mt-3 text-sm md:text-base text-[#B8B8B8] tracking-wider">
            10 A 14 DE SETEMBRO · PRESIDENTE PRUDENTE/SP
          </p>

          <button
            onClick={() => scrollToId("shows")}
            className="mt-8 inline-flex items-center gap-2 px-8 py-4 rounded-full font-extrabold text-black text-base md:text-lg shadow-[0_10px_40px_-10px_rgba(255,138,0,0.7)] hover:scale-[1.03] active:scale-[0.98] transition-transform"
            style={{
              background: "linear-gradient(135deg, #FF8A00, #FFC300)",
            }}
          >
            <Ticket className="w-5 h-5" />
            COMPRAR INGRESSOS
          </button>

          {/* Countdown */}
          <div className="mt-10 inline-flex items-center gap-3 px-5 py-3 rounded-2xl border border-white/10 bg-[#121212]/70 backdrop-blur">
            <span className="text-2xl">⏳</span>
            <p className="text-sm md:text-base text-white">
              Faltam{" "}
              <span className="font-black text-[#FFC300] text-lg">
                {days}
              </span>{" "}
              dias
              {days < 30 && hours > 0 && (
                <>
                  {" "}
                  e{" "}
                  <span className="font-black text-[#FFC300]">{hours}h</span>
                </>
              )}{" "}
              para a Expo Prudente 2026
            </p>
          </div>
        </div>
      </section>

      {/* ============== MAPA DO EVENTO ============== */}
      <section className="px-5 py-12 max-w-5xl mx-auto">
        <SectionTitle eyebrow="MAPA DO EVENTO" title="Conheça os setores" />
        <p className="text-center text-[#B8B8B8] -mt-4 mb-8 text-sm">
          Toque na imagem para ampliar
        </p>

        <button
          onClick={() => !mapaError && setMapaOpen(true)}
          className="group block w-full rounded-3xl overflow-hidden border border-white/10 bg-[#121212] relative aspect-[4/3] md:aspect-[16/9]"
        >
          {!mapaError ? (
            <>
              <img
                src={MAPA_IMG}
                alt="Mapa oficial dos setores da Expo Prudente 2026"
                className="absolute inset-0 w-full h-full object-contain bg-black"
                loading="lazy"
                onError={() => setMapaError(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-5">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur text-sm">
                  <ZoomIn className="w-4 h-4" /> Ampliar mapa
                </span>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <MapPin className="w-10 h-10 text-[#FF8A00]" />
              <p className="text-[#B8B8B8] text-sm max-w-xs">
                Mapa oficial em breve. Consulte a Eventou e o Instagram
                @expoprudente2026oficial para detalhes dos setores.
              </p>
            </div>
          )}
        </button>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {SETORES.map((s) => (
            <span
              key={s}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#121212] border border-white/10 text-[#FFC300]"
            >
              • {s}
            </span>
          ))}
        </div>
      </section>

      {/* ============== PROGRAMAÇÃO ============== */}
      <section id="shows" ref={showsRef} className="px-5 py-12 max-w-5xl mx-auto">
        <SectionTitle
          eyebrow="PROGRAMAÇÃO OFICIAL"
          title="Todos os dias de shows"
        />

        <div className="grid gap-5 md:grid-cols-2 mt-8">
          {SHOWS.map((show) => (
            <ShowCard key={show.id} show={show} />
          ))}
        </div>
      </section>

      {/* ============== EXPERIÊNCIAS ============== */}
      <section className="px-5 py-12 max-w-5xl mx-auto">
        <SectionTitle
          eyebrow="EXPO COMPLETA"
          title="Experiências da Expo"
        />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
          {EXPERIENCIAS.map((exp) => (
            <div
              key={exp.label}
              className="rounded-2xl p-5 bg-[#121212] border border-white/10 hover:border-[#FF8A00]/40 transition-colors text-center"
            >
              <div className="text-4xl mb-2">{exp.icon}</div>
              <p className="text-sm font-bold text-white">{exp.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============== CTA FINAL ============== */}
      <section className="px-5 py-16 max-w-3xl mx-auto text-center">
        <h2
          className="font-black uppercase leading-tight"
          style={{ fontSize: "clamp(1.6rem, 6vw, 2.6rem)" }}
        >
          GARANTA SEU INGRESSO
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage: "linear-gradient(135deg, #FF8A00, #FFC300)",
            }}
          >
            ANTES QUE ESGOTE!
          </span>
        </h2>
        <p className="mt-4 text-[#B8B8B8]">
          Escolha sua data favorita e compre pelo site oficial da Eventou.
        </p>
        <button
          onClick={() => scrollToId("shows")}
          className="mt-8 inline-flex items-center gap-2 px-8 py-4 rounded-full font-extrabold text-black text-base md:text-lg shadow-[0_10px_40px_-10px_rgba(255,138,0,0.7)] hover:scale-[1.03] active:scale-[0.98] transition-transform"
          style={{ background: "linear-gradient(135deg, #FF8A00, #FFC300)" }}
        >
          🎟️ COMPRAR INGRESSOS
        </button>
      </section>

      {/* ============== AVISO LEGAL ============== */}
      <footer className="px-5 py-12 border-t border-white/5 bg-black/40">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <a
            href="https://instagram.com/expoprudente2026oficial"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#FFC300] hover:text-[#FF8A00]"
          >
            <Instagram className="w-4 h-4" />
            @expoprudente2026oficial
          </a>
          <p className="text-xs text-[#B8B8B8] leading-relaxed">
            A Roxou atua exclusivamente como página de divulgação e
            redirecionamento para compra de ingressos oficiais. Informações
            sobre setores, valores, horários e programação oficial devem ser
            consultadas nos canais oficiais da organização e na plataforma
            Eventou.
          </p>
        </div>
      </footer>

      {/* ============== MODAL MAPA ============== */}
      {mapaOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setMapaOpen(false)}
        >
          <button
            onClick={() => setMapaOpen(false)}
            className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
            aria-label="Fechar mapa"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={MAPA_IMG}
            alt="Mapa oficial dos setores da Expo Prudente 2026"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * Subcomponentes
 * ========================================================================= */

function SectionTitle({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
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

function ShowCard({ show }: { show: ShowCard }) {
  return (
    <article className="group relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-[#121212] to-[#0a0a0a] p-6 hover:border-[#FF8A00]/50 transition-all hover:-translate-y-1 hover:shadow-[0_20px_60px_-20px_rgba(255,138,0,0.5)]">
      {/* Glow */}
      <div
        className="absolute -top-20 -right-20 w-48 h-48 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"
        style={{ background: "radial-gradient(circle, #FF8A00, transparent)" }}
      />

      <div className="relative flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-bold tracking-widest text-[#FFC300]">
            {show.weekday}
          </p>
          <p
            className="font-black mt-1"
            style={{ fontSize: "clamp(1.6rem, 5vw, 2rem)" }}
          >
            {show.date}
          </p>
        </div>
        <div className="text-3xl">🎟️</div>
      </div>

      <ul className="relative space-y-1.5 mb-6">
        {show.artists.map((a) => (
          <li key={a} className="text-base md:text-lg font-bold flex items-center gap-2">
            <span className="text-[#FF8A00]">🎤</span>
            <span>{a}</span>
          </li>
        ))}
      </ul>

      <a
        href={show.link}
        target="_blank"
        rel="noopener noreferrer"
        className="relative inline-flex w-full items-center justify-center gap-2 px-5 py-3 rounded-full font-extrabold text-black text-sm shadow-[0_8px_30px_-10px_rgba(255,138,0,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-transform"
        style={{ background: "linear-gradient(135deg, #FF8A00, #FFC300)" }}
      >
        <Ticket className="w-4 h-4" />
        COMPRAR INGRESSOS
      </a>
    </article>
  );
}

function CornerCurve({
  className,
  rotate = 0,
}: {
  className?: string;
  rotate?: number;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden
    >
      <defs>
        <linearGradient id={`cg-${rotate}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#FF8A00" />
          <stop offset="100%" stopColor="#FFC300" />
        </linearGradient>
      </defs>
      <path
        d="M0,0 L40,0 Q0,0 0,40 Z"
        fill={`url(#cg-${rotate})`}
        opacity="0.85"
      />
    </svg>
  );
}
