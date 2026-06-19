import { useEffect, useMemo, useRef, useState } from "react";
import {
  Ticket,
  MapPin,
  X,
  ZoomIn,
  RotateCcw,
  Instagram,
  Plus,
  Minus,
} from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import SEO from "@/components/SEO";
import { trackExpoEvent, createDebouncedTracker } from "@/lib/expoAnalytics";

const debouncedZoomTrack = createDebouncedTracker(500);

/* ============================================================================
 * EXPO PRUDENTE 2026 — Landing oficial de divulgação (hub Roxou → Eventou)
 *
 * A Roxou NÃO é organizadora. Esta página apenas divulga e redireciona
 * para a compra oficial via Eventou.
 * ========================================================================= */

const EVENT_START_RAW = "2026-09-10T18:00:00-03:00";
const MAPA_IMG = "/images/expo2026-mapa.jpg";

interface ShowCard {
  id: string;
  date: string;
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

/**
 * Setores com coordenadas relativas (0..1) sobre a imagem do mapa.
 * Os valores são aproximados — ajustam o foco do zoom programático.
 */
interface Setor {
  label: string;
  description: string;
  tip: string;
  /** Posição relativa no mapa (cx, cy em 0..1) usada para centralizar o zoom. */
  cx: number;
  cy: number;
}

const SETORES: Setor[] = [
  {
    label: "Arquibancada",
    description: "Espaço coberto com assentos numerados em estrutura elevada.",
    tip: "Ideal para conforto e visão ampla do palco, com lugar marcado.",
    cx: 0.18,
    cy: 0.55,
  },
  {
    label: "Pista Arena",
    description: "Área em pé próxima ao palco, com a maior energia do público.",
    tip: "Posicione-se perto da grade frontal para curtir os shows de pertinho.",
    cx: 0.5,
    cy: 0.6,
  },
  {
    label: "Camarotes",
    description: "Espaços privativos elevados, com vista privilegiada e serviços diferenciados.",
    tip: "Setor premium nas laterais — vista 360° do palco principal.",
    cx: 0.82,
    cy: 0.5,
  },
  {
    label: "Área VIP",
    description: "Setor exclusivo com acesso facilitado e estrutura premium.",
    tip: "Ambiente reservado próximo ao palco, com fluxo controlado.",
    cx: 0.68,
    cy: 0.45,
  },
  {
    label: "Front Open Bar",
    description: "Área frontal com bebidas inclusas (open bar) e ambientação especial.",
    tip: "Proximidade total com os artistas e atendimento dedicado.",
    cx: 0.45,
    cy: 0.38,
  },
  {
    label: "Palco",
    description: "Palco principal onde acontecem todos os grandes shows nacionais.",
    tip: "Centro do mapa — referência para localizar os demais setores.",
    cx: 0.5,
    cy: 0.22,
  },
  {
    label: "Boate",
    description: "Ambiente fechado e climatizado para after parties com DJs.",
    tip: "Funciona após os shows do palco principal — pista de dança.",
    cx: 0.88,
    cy: 0.78,
  },
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
  const { days, hours, valid: countdownValid } = useCountdown(EVENT_START_RAW);
  const [mapaOpen, setMapaOpen] = useState(false);
  const [mapaError, setMapaError] = useState(false);
  const [activeSector, setActiveSector] = useState<number | null>(null);
  const [showFloatingCta, setShowFloatingCta] = useState(false);
  const programacaoRef = useRef<HTMLElement | null>(null);
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);

  // expo_view (once)
  useEffect(() => {
    trackExpoEvent("expo_view", {}, { once: true });
  }, []);

  // Scroll: floating CTA + scroll depth (50% / 90%)
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setShowFloatingCta(y > 600);
      const docH = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1,
      );
      const pct = (y / docH) * 100;
      if (pct >= 50) trackExpoEvent("expo_scroll_50", { pct: Math.round(pct) }, { once: true });
      if (pct >= 90) trackExpoEvent("expo_scroll_90", { pct: Math.round(pct) }, { once: true });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Observa o título "PROGRAMAÇÃO OFICIAL" para disparar expo_programacao_view
  useEffect(() => {
    if (!programacaoRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            trackExpoEvent("expo_programacao_view", {}, { once: true });
            obs.disconnect();
          }
        });
      },
      { threshold: 0.4 },
    );
    obs.observe(programacaoRef.current);
    return () => obs.disconnect();
  }, []);

  // Bloqueia scroll quando o modal abre
  useEffect(() => {
    if (!mapaOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMapaOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mapaOpen]);

  const openMapa = () => {
    if (mapaError) return;
    setMapaOpen(true);
    trackExpoEvent("expo_map_open", { activeSector: activeSector ?? null });
  };

  const handleSectorClick = (i: number) => {
    const setor = SETORES[i];
    setActiveSector((prev) => (prev === i ? null : i));
    trackExpoEvent("expo_sector_click", { sector: setor.label });
    // Se modal aberto, centraliza zoom no setor; senão, abre modal já focado
    if (mapaOpen) {
      focusSectorInZoom(i);
    } else {
      setMapaOpen(true);
      trackExpoEvent("expo_map_open", { sector: setor.label, source: "chip" });
      setTimeout(() => focusSectorInZoom(i), 250);
    }
  };

  const focusSectorInZoom = (i: number) => {
    const setor = SETORES[i];
    const ref = transformRef.current;
    if (!ref) return;
    // setTransform(x, y, scale) — desloca para que (cx, cy) fique no centro
    const scale = 2.4;
    const wrapper =
      (ref as any).instance?.wrapperComponent ??
      (ref as any).instance?.wrapperRef;
    const w = wrapper?.clientWidth ?? window.innerWidth;
    const h = wrapper?.clientHeight ?? window.innerHeight;
    const x = w / 2 - setor.cx * w * scale;
    const y = h / 2 - setor.cy * h * scale;
    try {
      ref.setTransform(x, y, scale, 400, "easeOut");
    } catch {
      /* noop */
    }
  };

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
    [],
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
              style={{ backgroundImage: "linear-gradient(135deg, #FF8A00, #FFC300)" }}
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

          <div className="mt-10 inline-flex items-center gap-3 px-5 py-3 rounded-2xl border border-white/10 bg-[#121212]/70 backdrop-blur">
            <span className="text-2xl">⏳</span>
            {countdownValid ? (
              <p className="text-sm md:text-base text-white">
                Faltam{" "}
                <span className="font-black text-[#FFC300] text-lg">{days}</span> dias
                {days < 30 && hours > 0 && (
                  <>
                    {" "}e <span className="font-black text-[#FFC300]">{hours}h</span>
                  </>
                )}{" "}
                para a Expo Prudente 2026
              </p>
            ) : (
              <p className="text-sm md:text-base text-white font-bold">Expo Prudente 2026</p>
            )}
          </div>
        </div>
      </section>

      {/* ============== MAPA DO EVENTO ============== */}
      <section className="px-2 sm:px-5 py-12 max-w-5xl mx-auto">
        <SectionTitle eyebrow="MAPA DO EVENTO" title="Conheça os setores" />
        <p className="text-center text-[#B8B8B8] -mt-4 mb-6 text-sm">
          Toque no mapa para ampliar e dar zoom
        </p>

        <button
          type="button"
          onClick={openMapa}
          className="group block w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 bg-[#0a0a0a] relative"
          aria-label="Ampliar mapa do evento"
        >
          {!mapaError ? (
            <>
              <img
                src={MAPA_IMG}
                alt="Mapa oficial dos setores da Expo Prudente 2026 com Arquibancada, Pista Arena, Camarotes, Área VIP, Front Open Bar, Palco e Boate"
                className="block w-full h-[85vw] max-h-[650px] sm:h-[520px] md:h-[600px] object-contain bg-black"
                loading="lazy"
                onError={() => setMapaError(true)}
              />
              <div className="absolute bottom-3 right-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur text-xs font-semibold border border-white/10">
                <ZoomIn className="w-3.5 h-3.5" /> Toque para ampliar
              </div>
              {activeSector !== null && SETORES[activeSector] && (
                <div className="absolute top-3 left-3 right-3 px-4 py-3 rounded-2xl bg-black/85 backdrop-blur border border-[#FF8A00]/40 shadow-[0_10px_30px_-10px_rgba(255,138,0,0.6)] text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold tracking-widest text-[#FFC300]">
                        SETOR EM DESTAQUE
                      </p>
                      <p className="text-sm font-extrabold text-white mt-0.5">
                        {SETORES[activeSector].label}
                      </p>
                      <p className="text-xs text-[#D4D4D4] mt-1 leading-relaxed">
                        {SETORES[activeSector].description}
                      </p>
                      <p className="text-[11px] text-[#FFC300]/80 mt-1.5 italic">
                        📍 {SETORES[activeSector].tip}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSector(null);
                      }}
                      className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center flex-shrink-0"
                      aria-label="Fechar descrição do setor"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 p-10 text-center h-[60vw] max-h-[420px]">
              <MapPin className="w-10 h-10 text-[#FF8A00]" />
              <p className="text-[#B8B8B8] text-sm max-w-xs">
                Mapa oficial em breve. Consulte a Eventou e o Instagram
                @expoprudente2026oficial para detalhes dos setores.
              </p>
            </div>
          )}
        </button>

        {!mapaError && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={openMapa}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold border border-[#FF8A00]/40 text-[#FFC300] bg-[#121212] hover:bg-[#1a1a1a] transition-colors"
            >
              <ZoomIn className="w-4 h-4" /> Ampliar mapa
            </button>
          </div>
        )}

        <p className="mt-5 text-center text-xs sm:text-sm text-[#B8B8B8] px-4 max-w-xl mx-auto leading-relaxed">
          📍 Dica: toque em um setor abaixo para o mapa centralizar e dar zoom nele automaticamente.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2 sm:gap-2.5 px-2">
          {SETORES.map((s, i) => {
            const isActive = activeSector === i;
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => handleSectorClick(i)}
                aria-pressed={isActive}
                className={`px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold border transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-[#FF8A00] to-[#FFC300] text-black border-transparent shadow-[0_6px_20px_-6px_rgba(255,138,0,0.7)] animate-pulse"
                    : "bg-[#121212] border-white/10 text-[#FFC300] hover:border-[#FF8A00]/40"
                }`}
              >
                • {s.label}
              </button>
            );
          })}
        </div>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ImageObject",
              name: "Mapa Oficial Expo Prudente 2026",
              description:
                "Mapa dos setores da Expo Prudente 2026 em Presidente Prudente/SP",
              contentUrl: "https://roxou.com.br/images/expo2026-mapa.jpg",
            }),
          }}
        />
      </section>

      {/* ============== PROGRAMAÇÃO ============== */}
      <section id="shows" ref={programacaoRef} className="px-5 py-12 max-w-5xl mx-auto">
        <SectionTitle eyebrow="PROGRAMAÇÃO OFICIAL" title="Todos os dias de shows" />

        <div className="grid gap-5 md:grid-cols-2 mt-8">
          {(SHOWS ?? []).map((show) => (
            <ShowCardItem key={show.id} show={show} />
          ))}
        </div>
      </section>

      {/* ============== EXPERIÊNCIAS ============== */}
      <section className="px-5 py-12 max-w-5xl mx-auto">
        <SectionTitle eyebrow="EXPO COMPLETA" title="Experiências da Expo" />

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
            style={{ backgroundImage: "linear-gradient(135deg, #FF8A00, #FFC300)" }}
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

      {/* Floating CTA mobile */}
      {showFloatingCta && (
        <button
          onClick={() => scrollToId("shows")}
          className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 px-6 py-3 rounded-full font-extrabold text-black text-sm shadow-[0_10px_40px_-10px_rgba(255,138,0,0.8)] animate-in fade-in slide-in-from-bottom-4"
          style={{ background: "linear-gradient(135deg, #FF8A00, #FFC300)" }}
        >
          <Ticket className="w-4 h-4" />
          COMPRAR INGRESSOS
        </button>
      )}

      {/* ============== MODAL MAPA INTERATIVO ============== */}
      {mapaOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Mapa do evento ampliado"
        >
          {/* Header fixo */}
          <div className="relative flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/95 z-10">
            <p className="text-xs sm:text-sm text-white/80 pr-2">
              Arraste ou dê zoom para visualizar os setores
            </p>
            <button
              onClick={() => setMapaOpen(false)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center flex-shrink-0"
              aria-label="Fechar mapa"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Área de zoom/pan */}
          <div className="flex-1 relative bg-black overflow-hidden">
            <TransformWrapper
              ref={transformRef}
              initialScale={1}
              minScale={1}
              maxScale={5}
              doubleClick={{ disabled: false, mode: "zoomIn", step: 0.8 }}
              wheel={{ step: 0.2 }}
              pinch={{ step: 5 }}
              panning={{ velocityDisabled: false }}
              onZoom={(ref) => {
                const z = Number(ref.state.scale.toFixed(2));
                trackExpoEvent("expo_map_zoom", { zoomLevel: z });
              }}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  <TransformComponent
                    wrapperStyle={{
                      width: "100%",
                      height: "100%",
                      background: "#000",
                    }}
                    contentStyle={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <img
                      src={MAPA_IMG}
                      alt="Mapa oficial dos setores da Expo Prudente 2026"
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                      }}
                      draggable={false}
                    />
                  </TransformComponent>

                  {/* Controles flutuantes */}
                  <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-20">
                    <button
                      type="button"
                      onClick={() => zoomIn()}
                      className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center border border-white/10"
                      aria-label="Ampliar"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => zoomOut()}
                      className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center border border-white/10"
                      aria-label="Reduzir"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        resetTransform();
                        trackExpoEvent("expo_map_reset", {});
                      }}
                      className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur flex items-center justify-center border border-white/10"
                      aria-label="Resetar zoom"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </TransformWrapper>
          </div>

          {/* Chips dos setores no rodapé do modal */}
          <div className="border-t border-white/10 bg-black/95 px-3 py-3 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {SETORES.map((s, i) => {
                const isActive = activeSector === i;
                return (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => handleSectorClick(i)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-[#FF8A00] to-[#FFC300] text-black border-transparent shadow-[0_4px_14px_-4px_rgba(255,138,0,0.8)]"
                        : "bg-white/5 border-white/10 text-[#FFC300]"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * Subcomponentes
 * ========================================================================= */

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
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

function ShowCardItem({ show }: { show: ShowCard }) {
  const handleClick = () => {
    trackExpoEvent("expo_show_card_click", {
      artist: show.artists.join(", "),
      date: show.date,
      weekday: show.weekday,
    });
  };
  const handleEventou = () => {
    trackExpoEvent("expo_eventou_click", {
      artist: show.artists.join(", "),
      date: show.date,
      weekday: show.weekday,
    });
  };
  return (
    <article
      onClick={handleClick}
      className="group relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-[#121212] to-[#0a0a0a] p-6 hover:border-[#FF8A00]/50 transition-all hover:-translate-y-1 hover:shadow-[0_20px_60px_-20px_rgba(255,138,0,0.5)]"
    >
      <div
        className="absolute -top-20 -right-20 w-48 h-48 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"
        style={{ background: "radial-gradient(circle, #FF8A00, transparent)" }}
      />
      <div className="relative flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-bold tracking-widest text-[#FFC300]">
            {show?.weekday ?? ""}
          </p>
          <p
            className="font-black mt-1"
            style={{ fontSize: "clamp(1.6rem, 5vw, 2rem)" }}
          >
            {show?.date ?? ""}
          </p>
        </div>
        <div className="text-3xl">🎟️</div>
      </div>

      <ul className="relative space-y-1.5 mb-6">
        {(show?.artists ?? []).map((a) => (
          <li key={a} className="text-base md:text-lg font-bold flex items-center gap-2">
            <span className="text-[#FF8A00]">🎤</span>
            <span>{a}</span>
          </li>
        ))}
      </ul>

      {show?.link ? (
        <a
          href={show.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleEventou}
          className="relative inline-flex w-full items-center justify-center gap-2 px-5 py-3 rounded-full font-extrabold text-black text-sm shadow-[0_8px_30px_-10px_rgba(255,138,0,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-transform"
          style={{ background: "linear-gradient(135deg, #FF8A00, #FFC300)" }}
        >
          <Ticket className="w-4 h-4" />
          COMPRAR INGRESSOS
        </a>
      ) : (
        <span className="relative inline-flex w-full items-center justify-center gap-2 px-5 py-3 rounded-full font-bold text-white/60 text-sm bg-white/5">
          Em breve
        </span>
      )}
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
      <path d="M0,0 L40,0 Q0,0 0,40 Z" fill={`url(#cg-${rotate})`} opacity="0.85" />
    </svg>
  );
}
