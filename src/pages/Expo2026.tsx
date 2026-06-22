import { useEffect, useMemo, useRef, useState } from "react";
import { Ticket, X, ZoomIn, Instagram } from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import SEO from "@/components/SEO";
import { trackExpoEvent, createDebouncedTracker, detectSource } from "@/lib/expoAnalytics";
import { ExpoLayout } from "@/components/expo/ExpoLayout";
import {
  EVENT_START_RAW,
  GRADE_IMG,
  SHOWS,
  SHOWS_BUY_LINK,
  SectionTitle,
  FAQ_ITEMS,
  type ShowCard,
  PASSPORT_LINK,
} from "@/components/expo/ExpoShared";

const debouncedZoomTrack = createDebouncedTracker(500);

/* ============================================================================
 * EXPO PRUDENTE 2026 — Home (hub Roxou → Eventou)
 *
 * A Roxou NÃO é organizadora. Esta página apenas divulga e redireciona
 * para a compra oficial via Eventou. Conteúdo extenso vive nas sub-páginas:
 *   /expo2026/ingressos, /front-stage, /mapa, /menores, /informacoes
 * ========================================================================= */

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Expo2026() {
  const [showFloatingCta, setShowFloatingCta] = useState(false);
  const programacaoRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    trackExpoEvent("expo_view", { page: "home" }, { once: true });
    try {
      const src = detectSource();
      if (src === "Google Search") trackExpoEvent("expo_google_organic", {}, { once: true });
      else if (src === "Google Discover") trackExpoEvent("expo_google_discover", {}, { once: true });
      else if (src === "Google Images") trackExpoEvent("expo_google_images", {}, { once: true });
    } catch {
      /* noop */
    }

    const capturePerf = () => {
      try {
        const nav = (performance.getEntriesByType("navigation")[0] ?? null) as
          | PerformanceNavigationTiming
          | null;
        const fcpEntry = performance.getEntriesByName("first-contentful-paint")[0];
        let lcp: number | undefined;
        if ("PerformanceObserver" in window) {
          try {
            const po = new PerformanceObserver((list) => {
              const entries = list.getEntries();
              const last = entries[entries.length - 1];
              if (last) lcp = last.startTime;
            });
            po.observe({ type: "largest-contentful-paint", buffered: true });
            setTimeout(() => po.disconnect(), 5000);
          } catch {
            /* noop */
          }
        }
        setTimeout(() => {
          trackExpoEvent(
            "expo_performance",
            {
              performance: {
                fcp: fcpEntry ? Math.round(fcpEntry.startTime) : null,
                lcp: lcp ? Math.round(lcp) : null,
                domReady: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
                totalLoad: nav ? Math.round(nav.loadEventEnd || nav.duration) : null,
              },
            },
            { once: true },
          );
        }, 3500);
      } catch {
        /* noop */
      }
    };
    if (document.readyState === "complete") capturePerf();
    else window.addEventListener("load", capturePerf, { once: true });
  }, []);

  useEffect(() => {
    const timers = [
      setTimeout(() => trackExpoEvent("expo_engagement_30s", { seconds: 30 }, { once: true }), 30_000),
      setTimeout(() => trackExpoEvent("expo_engagement_60s", { seconds: 60 }, { once: true }), 60_000),
      setTimeout(() => trackExpoEvent("expo_engagement_120s", { seconds: 120 }, { once: true }), 120_000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setShowFloatingCta(y > 600);
      const docH = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const pct = (y / docH) * 100;
      const rounded = Math.round(pct);
      if (pct >= 25) trackExpoEvent("expo_scroll_25", { pct: rounded }, { once: true });
      if (pct >= 50) trackExpoEvent("expo_scroll_50", { pct: rounded }, { once: true });
      if (pct >= 75) trackExpoEvent("expo_scroll_75", { pct: rounded }, { once: true });
      if (pct >= 90) trackExpoEvent("expo_scroll_90", { pct: rounded }, { once: true });
      if (pct >= 99) trackExpoEvent("expo_scroll_100", { pct: rounded }, { once: true });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  const jsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "@id": "https://roxou.com.br/#website",
          url: "https://roxou.com.br/",
          name: "Roxou",
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: "https://roxou.com.br/agenda?q={search_term_string}",
            },
            "query-input": "required name=search_term_string",
          },
        },
        {
          "@type": "Festival",
          "@id": "https://roxou.com.br/expo2026/#festival",
          name: "Expo Prudente 2026",
          startDate: "2026-09-10",
          endDate: "2026-09-14",
          eventStatus: "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          url: "https://roxou.com.br/expo2026/",
          image: "https://roxou.com.br/images/expo2026-grade-oficial.webp",
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
            eventStatus: "https://schema.org/EventScheduled",
            eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
            url: s.link,
            image: "https://roxou.com.br/images/expo2026-grade-oficial.webp",
            description: `Show de ${s.artists.join(", ")} na Expo Prudente 2026 — ${s.weekday}, ${s.date}.`,
            performer: s.artists.map((a) => ({ "@type": "MusicGroup", name: a })),
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
            offers: {
              "@type": "Offer",
              url: s.link,
              availability: "https://schema.org/InStock",
              category: "primary",
            },
          })),
        },
        {
          "@type": "FAQPage",
          "@id": "https://roxou.com.br/expo2026/#faq",
          mainEntity: FAQ_ITEMS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        },
        {
          "@type": "BreadcrumbList",
          "@id": "https://roxou.com.br/expo2026/#breadcrumb",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Início", item: "https://roxou.com.br/" },
            { "@type": "ListItem", position: 2, name: "Eventos", item: "https://roxou.com.br/agenda" },
            { "@type": "ListItem", position: 3, name: "Expo Prudente 2026", item: "https://roxou.com.br/expo2026/" },
          ],
        },
        {
          "@type": "ImageObject",
          "@id": "https://roxou.com.br/expo2026/#grade-oficial",
          name: "Grade Oficial de Shows Expo Prudente 2026",
          description: "Programação oficial de shows da Expo Prudente 2026.",
          contentUrl: "https://roxou.com.br/images/expo2026-grade-oficial.webp",
          url: "https://roxou.com.br/expo2026/",
        },
      ],
    }),
    [],
  );

  return (
    <ExpoLayout>
      <SEO
        title="Expo Prudente 2026 | Shows, Programação e Ingressos Oficiais"
        description="Confira a programação da Expo Prudente 2026, grade oficial de shows e links oficiais de ingressos. 10 a 14 de setembro em Presidente Prudente/SP."
        canonical="https://roxou.com.br/expo2026/"
        ogImage="https://roxou.com.br/images/expo2026-grade-oficial.webp"
        ogImageWidth={1536}
        ogImageHeight={691}
        keywords="expo prudente 2026, ingressos expo prudente, leonardo prudente, zé neto e cristiano prudente, zezé di camargo prudente, expo prudente programação"
        jsonLd={jsonLd}
      />

      {/* ============== HERO ============== */}
      <section className="relative pt-10 pb-12 px-5 text-center">
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

          <PremiumCountdown targetIso={EVENT_START_RAW} />
        </div>
      </section>

      {/* ============== GRADE OFICIAL ============== */}
      <GradeOficialSection />

      {/* ============== PROGRAMAÇÃO COMPACTA ============== */}
      <section id="shows" ref={programacaoRef} className="px-5 py-12 max-w-5xl mx-auto">
        <SectionTitle eyebrow="PROGRAMAÇÃO OFICIAL" title="Todos os dias de shows" />
        <div className="grid gap-2.5 md:gap-3 md:grid-cols-2 mt-6">
          {SHOWS.map((show) => (
            <ShowCardItem key={show.id} show={show} />
          ))}
        </div>
      </section>

      {/* ============== CTA FINAL ============== */}
      <section className="px-5 py-12 max-w-3xl mx-auto text-center">
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

        {/* ===== Destaque compacto Passaporte Todos os Dias ===== */}
        <div className="mt-6 max-w-xl mx-auto rounded-2xl border border-[#FFC300]/35 bg-gradient-to-br from-[#1a1305] to-[#0a0a0a] p-4 md:p-5 text-left">
          <div className="flex items-start gap-3">
            <div className="text-2xl leading-none">🎟️</div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold tracking-widest text-[#FFC300]">NOVIDADE</p>
              <h3 className="font-extrabold text-white text-base md:text-lg leading-tight">
                Passaporte — Todos os Dias
              </h3>
              <p className="mt-1.5 text-xs md:text-sm text-[#B8B8B8] leading-relaxed">
                Acesso para todos os dias da Expo Prudente 2026. Ideal para quem quer curtir a programação completa de 10 a 14 de setembro.
              </p>
              <a
                href={PASSPORT_LINK}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  trackExpoEvent("expo_passaporte_click", { source: "home_cta" });
                  trackExpoEvent("expo_passaporte_eventou_click", { source: "home_cta" });
                }}
                className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-extrabold text-black text-xs md:text-sm hover:scale-[1.03] active:scale-[0.98] transition-transform"
                style={{ background: "linear-gradient(135deg, #FF8A00, #FFC300)" }}
              >
                Comprar Passaporte
              </a>
            </div>
          </div>
        </div>


        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={async () => {
              const url = "https://roxou.com.br/expo2026/";
              const data = {
                title: "Expo Prudente 2026",
                text: "Confira a programação, mapa e ingressos da Expo Prudente 2026!",
                url,
              };
              try {
                if (navigator.share) {
                  await navigator.share(data);
                  trackExpoEvent("expo_share_native", { method: "native" });
                  return;
                }
              } catch {
                /* cancelado */
              }
              try {
                await navigator.clipboard.writeText(url);
                trackExpoEvent("expo_copy_link", { method: "clipboard" });
              } catch {
                /* noop */
              }
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold border border-white/15 text-white/90 bg-white/5 hover:bg-white/10 transition-colors"
          >
            📤 Compartilhar
          </button>
        </div>
      </section>

      {/* ============== FOOTER ============== */}
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
            A Roxou atua exclusivamente como página de divulgação e redirecionamento para compra de ingressos oficiais.
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
    </ExpoLayout>
  );
}

/* ========================================================================== */

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
  const artists = show?.artists ?? [];
  const visibleArtists = artists.slice(0, 3);
  const extraCount = Math.max(0, artists.length - 3);
  return (
    <article
      onClick={handleClick}
      className="group relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-[#121212] to-[#0a0a0a] p-4 hover:border-[#FF8A00]/50 transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_60px_-20px_rgba(255,138,0,0.5)]"
    >
      <div
        className="absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"
        style={{ background: "radial-gradient(circle, #FF8A00, transparent)" }}
      />
      <div className="relative flex items-center justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-widest text-[#FFC300]">{show?.weekday ?? ""}</p>
          <p className="font-black leading-none mt-0.5" style={{ fontSize: "clamp(1.25rem, 4.5vw, 1.6rem)" }}>
            {show?.date ?? ""}
          </p>
        </div>
        <Ticket className="w-5 h-5 text-[#FFC300]/70 flex-shrink-0" aria-hidden />
      </div>

      <div className="relative flex flex-wrap gap-1.5 mb-3" title={artists.join(" • ")}>
        {visibleArtists.map((a) => (
          <span
            key={a}
            className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold text-[#FFC300] bg-[#FFC300]/10 border border-[#FFC300]/20 max-w-full truncate"
          >
            {a}
          </span>
        ))}
        {extraCount > 0 && (
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold text-black"
            style={{ background: "linear-gradient(135deg, #FF8A00, #FFC300)" }}
            title={artists.slice(3).join(" • ")}
          >
            +{extraCount} {extraCount === 1 ? "atração" : "atrações"}
          </span>
        )}
      </div>

      {show?.link ? (
        <a
          href={show.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleEventou}
          className="relative inline-flex w-full sm:w-auto items-center justify-center gap-2 px-4 h-[42px] rounded-xl font-extrabold text-black text-xs shadow-[0_8px_30px_-10px_rgba(255,138,0,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-transform"
          style={{ background: "linear-gradient(135deg, #FF8A00, #FFC300)" }}
        >
          <Ticket className="w-4 h-4" />
          COMPRAR INGRESSOS
        </a>
      ) : (
        <span className="relative inline-flex w-full sm:w-auto items-center justify-center gap-2 px-4 h-[42px] rounded-xl font-bold text-white/60 text-xs bg-white/5">
          Em breve
        </span>
      )}
    </article>
  );
}

function CornerCurve({ className, rotate = 0 }: { className?: string; rotate?: number }) {
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

function PremiumCountdown({ targetIso }: { targetIso: string }) {
  const targetMs = useMemo(() => {
    const t = new Date(targetIso).getTime();
    return Number.isFinite(t) ? t : NaN;
  }, [targetIso]);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!Number.isFinite(targetMs)) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  if (!Number.isFinite(targetMs)) {
    return (
      <div className="mt-10 inline-flex items-center gap-3 px-5 py-3 rounded-2xl border border-white/10 bg-[#121212]/70 backdrop-blur">
        <p className="text-sm md:text-base text-white font-bold">Expo Prudente 2026</p>
      </div>
    );
  }

  const diff = targetMs - now;

  if (diff <= 0) {
    return (
      <div
        className="mt-10 inline-flex items-center gap-3 px-6 py-4 rounded-2xl border bg-[#121212]/70 backdrop-blur animate-fade-in"
        style={{
          borderColor: "rgba(255,195,0,0.4)",
          boxShadow: "0 10px 40px -15px rgba(255,138,0,0.6)",
        }}
      >
        <p className="text-base md:text-lg font-black text-white">
          🎉 A Expo Prudente 2026 começou!
        </p>
      </div>
    );
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  const totalMs = targetMs - new Date("2026-01-01T00:00:00-03:00").getTime();
  const elapsedMs = Math.max(0, totalMs - diff);
  const progress = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));

  return (
    <div className="mt-10 w-full max-w-md mx-auto">
      <p className="text-[11px] font-bold tracking-[0.3em] text-[#FFC300] text-center mb-3">
        ⏳ FALTAM APENAS
      </p>
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <CountdownCard value={days} label="DIAS" />
        <CountdownCard value={hours} label="HORAS" />
        <CountdownCard value={minutes} label="MIN" />
        <CountdownCard value={seconds} label="SEG" />
      </div>
      <p className="text-xs sm:text-sm text-[#B8B8B8] text-center mt-3">
        Para a <span className="font-bold text-white">Expo Prudente 2026</span>
      </p>
      <div className="mt-4 px-1">
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden border border-white/5">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #FF8A00, #FFC300)",
              boxShadow: "0 0 12px rgba(255,138,0,0.6)",
            }}
          />
        </div>
        <p className="text-[10px] text-[#888] text-center mt-2 italic">
          🔥 A cada segundo estamos mais perto da maior Expo Prudente da história.
        </p>
      </div>
    </div>
  );
}

function CountdownCard({ value, label }: { value: number; label: string }) {
  const display = String(value).padStart(2, "0");
  return (
    <div
      className="relative rounded-2xl border bg-white/[0.04] backdrop-blur-md px-2 py-3 sm:py-4 text-center overflow-hidden"
      style={{
        borderColor: "rgba(255,195,0,0.25)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 24px -12px rgba(255,138,0,0.5)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          background: "radial-gradient(120% 80% at 50% 0%, rgba(255,138,0,0.18), transparent 60%)",
        }}
      />
      <p
        key={display}
        className="relative font-black tabular-nums leading-none animate-fade-in"
        style={{
          fontSize: "clamp(1.5rem, 7vw, 2.25rem)",
          color: "#FFC300",
          textShadow: "0 0 18px rgba(255,138,0,0.45)",
        }}
      >
        {display}
      </p>
      <p className="relative mt-1.5 text-[9px] sm:text-[10px] font-bold tracking-[0.2em] text-white/70">
        {label}
      </p>
    </div>
  );
}

function GradeOficialSection() {
  const [open, setOpen] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!sectionRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            trackExpoEvent("expo_grade_oficial_view", {}, { once: true });
            obs.disconnect();
          }
        });
      },
      { threshold: 0.35 },
    );
    obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleOpen = () => {
    setOpen(true);
    trackExpoEvent("expo_grade_oficial_open", {});
  };

  const handleShare = async () => {
    const url = "https://roxou.com.br/expo2026/";
    const data = {
      title: "Grade Oficial — Expo Prudente 2026",
      text: "Confira a programação oficial de shows da Expo Prudente 2026!",
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(data);
        trackExpoEvent("expo_grade_oficial_share", { method: "native" });
        return;
      }
    } catch {
      /* cancelado */
    }
    try {
      await navigator.clipboard.writeText(url);
      trackExpoEvent("expo_grade_oficial_share", { method: "clipboard" });
    } catch {
      /* noop */
    }
  };

  return (
    <section
      ref={sectionRef}
      className="px-2 sm:px-5 py-12 max-w-5xl mx-auto"
      aria-label="Grade oficial de shows da Expo Prudente 2026"
    >
      <SectionTitle eyebrow="🎤 GRADE OFICIAL DE SHOWS" title="Programação completa" />
      <p className="text-center text-[#B8B8B8] -mt-3 mb-6 text-sm sm:text-base px-3">
        Confira a programação completa da Expo Prudente 2026, de 10 a 14 de setembro.
      </p>

      <button
        type="button"
        onClick={handleOpen}
        aria-label="Ampliar grade oficial de shows"
        className="group block w-full overflow-hidden bg-black/60 backdrop-blur border border-white/10 transition-all duration-300 hover:border-[#FF8A00]/50 hover:shadow-[0_20px_60px_-20px_rgba(255,138,0,0.6)] hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-[#FFC300]/60"
        style={{ borderRadius: 24, boxShadow: "0 12px 40px -20px rgba(0,0,0,0.8)" }}
      >
        <img
          src={GRADE_IMG}
          alt="Grade Oficial de Shows da Expo Prudente 2026"
          loading="lazy"
          decoding="async"
          className="block w-full h-auto object-cover"
        />
        <div className="px-4 py-2 text-center bg-black/70 text-[11px] sm:text-xs font-semibold text-[#FFC300] tracking-wider inline-flex w-full items-center justify-center gap-2">
          <ZoomIn className="w-3.5 h-3.5" /> Toque para ampliar e dar zoom
        </div>
      </button>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <a
          href={SHOWS_BUY_LINK}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackExpoEvent("expo_grade_oficial_buy_click", {})}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-extrabold text-black text-sm sm:text-base shadow-[0_10px_30px_-10px_rgba(255,138,0,0.7)] hover:scale-[1.03] active:scale-[0.98] transition-transform"
          style={{ background: "linear-gradient(135deg, #FF8A00, #FFC300)" }}
        >
          🎟️ Comprar Ingressos
        </a>
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold border border-white/15 text-white/90 bg-white/5 hover:bg-white/10 transition-colors"
        >
          📲 Compartilhar Programação
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Grade oficial ampliada"
        >
          <div className="relative flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/95 z-10">
            <p className="text-xs sm:text-sm text-white/80 pr-2 truncate">
              🎤 Grade Oficial — Expo Prudente 2026
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center flex-shrink-0"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="relative flex-1 overflow-hidden bg-black">
            <TransformWrapper
              initialScale={1}
              minScale={1}
              maxScale={5}
              doubleClick={{ mode: "toggle", step: 2 }}
              wheel={{ step: 0.2 }}
              pinch={{ step: 5 }}
              onZoom={() => debouncedZoomTrack("expo_grade_oficial_zoom", {})}
            >
              <TransformComponent
                wrapperStyle={{ width: "100%", height: "100%", background: "#000" }}
                contentStyle={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={GRADE_IMG}
                  alt="Grade Oficial Expo Prudente 2026 ampliada"
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                  draggable={false}
                />
              </TransformComponent>
            </TransformWrapper>
          </div>
        </div>
      )}
    </section>
  );
}
