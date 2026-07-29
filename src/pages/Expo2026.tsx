import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Ticket, Instagram, MessageCircle, ArrowUp, CalendarDays, MapPin, Users } from "lucide-react";
import SEO from "@/components/SEO";
import { trackExpoEvent, detectSource } from "@/lib/expoAnalytics";
import { ExpoLayout } from "@/components/expo/ExpoLayout";
import {
  EVENT_START_RAW,
  EVENT_END_RAW,
  EVENT_PERIOD_LABEL,
  EVENT_VENUE,
  EVENT_ADDRESS,
  EVENT_AGE_RATING,
  SUPPORT_PHONE_LABEL,
  SUPPORT_WHATSAPP,
  GRADE_IMG,
  COMUNICADO_IMG,
  SHOWS,
  SETORES,
  SectionTitle,
  FAQ_ITEMS,
  type ShowCard,
  PASSPORT_LINK,
} from "@/components/expo/ExpoShared";

/* ============================================================================
 * EXPO PRUDENTE 2026 — página pública enxuta (Roxou → Eventou)
 *
 * A Roxou apenas divulga informações públicas do evento. Organização, venda
 * de ingressos, alterações, atendimento e reembolsos são de responsabilidade
 * dos organizadores e da plataforma Eventou.
 *
 * Ordem: header → hero → contador → ingressos → comunicado → programação →
 *        setores → informações → suporte/disclaimer → footer.
 * ========================================================================= */

const GOLD = "linear-gradient(135deg, #FF8A00, #FFC300)";

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Expo2026() {
  const [showFloatingCta, setShowFloatingCta] = useState(false);
  const programacaoRef = useRef<HTMLElement | null>(null);
  const { hash } = useLocation();

  /* Deep link por âncora vinda do header (#programacao, #ingressos, #suporte) */
  useEffect(() => {
    if (!hash) return;
    const id = hash.replace("#", "");
    const t = setTimeout(() => scrollToId(id), 120);
    return () => clearTimeout(t);
  }, [hash]);

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
            trackExpoEvent("expo_schedule_view", { section: "programacao" }, { once: true });
            obs.disconnect();
          }
        });
      },
      { threshold: 0.3 },
    );
    obs.observe(programacaoRef.current);
    return () => obs.disconnect();
  }, []);

  const jsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Festival",
          "@id": "https://roxou.com.br/expo2026#festival",
          name: "Expo Prudente 2026",
          startDate: EVENT_START_RAW,
          endDate: EVENT_END_RAW,
          eventStatus: "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          url: "https://roxou.com.br/expo2026",
          image: "https://roxou.com.br/expo2026/programacao/programacao-geral.jpg",
          location: {
            "@type": "Place",
            name: EVENT_VENUE,
            address: {
              "@type": "PostalAddress",
              streetAddress: "Rodovia Raposo Tavares, km 563",
              addressLocality: "Presidente Prudente",
              addressRegion: "SP",
              addressCountry: "BR",
            },
          },
          subEvent: SHOWS.map((s) => ({
            "@type": "MusicEvent",
            name: `${s.artists.join(", ")} — Expo Prudente 2026`,
            startDate: s.startIso,
            eventStatus: "https://schema.org/EventScheduled",
            eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
            url: s.link,
            image: `https://roxou.com.br${s.art}`,
            performer: s.artists.map((a) => ({ "@type": "MusicGroup", name: a })),
            location: {
              "@type": "Place",
              name: EVENT_VENUE,
              address: {
                "@type": "PostalAddress",
                addressLocality: "Presidente Prudente",
                addressRegion: "SP",
                addressCountry: "BR",
              },
            },
          })),
        },
        {
          "@type": "FAQPage",
          "@id": "https://roxou.com.br/expo2026#faq",
          mainEntity: FAQ_ITEMS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        },
        {
          "@type": "BreadcrumbList",
          "@id": "https://roxou.com.br/expo2026#breadcrumb",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Início", item: "https://roxou.com.br/" },
            { "@type": "ListItem", position: 2, name: "Eventos", item: "https://roxou.com.br/agenda" },
            { "@type": "ListItem", position: 3, name: "Expo Prudente 2026", item: "https://roxou.com.br/expo2026" },
          ],
        },
      ],
    }),
    [],
  );

  return (
    <ExpoLayout>
      <SEO
        title="Expo Prudente 2026 | Programação, ingressos e informações"
        description="Confira a programação atualizada da Expo Prudente 2026, de 11 a 14 de setembro, ingressos oficiais, dias com pista gratuita, setores e suporte."
        canonical="https://roxou.com.br/expo2026"
        ogImage="https://roxou.com.br/expo2026/programacao/programacao-geral.jpg"
        ogImageWidth={1280}
        ogImageHeight={481}
        keywords="expo prudente 2026, programação expo prudente, ingressos expo prudente, pista grátis expo prudente, loubet, zezé di camargo e luciano, mc hariel"
        jsonLd={jsonLd}
      />

      {/* ================= HERO ================= */}
      <section className="relative px-5 pt-8 pb-8 text-center">
        <div className="relative mx-auto max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-black uppercase tracking-widest text-black" style={{ background: GOLD }}>
            Pista grátis — 11 e 13 de setembro
          </span>

          <h1
            className="mt-5 font-black uppercase leading-[0.95] tracking-tight"
            style={{ fontSize: "clamp(2rem, 8.5vw, 4rem)", textShadow: "0 0 40px rgba(255,138,0,0.3)" }}
          >
            <span className="block text-white">Expo Prudente</span>
            <span className="block bg-clip-text text-transparent" style={{ backgroundImage: GOLD }}>
              2026
            </span>
          </h1>

          <p className="mt-4 text-base md:text-xl font-bold text-white uppercase tracking-wide">
            11 a 14 de setembro
          </p>
          <p className="mt-1.5 text-xs md:text-sm text-[#B8B8B8]">
            {EVENT_VENUE} · Presidente Prudente – SP
          </p>

          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-black/50">
            <img
              src={GRADE_IMG}
              alt="Arte oficial da programação da Expo Prudente 2026, de 11 a 14 de setembro, em Presidente Prudente"
              width={1280}
              height={481}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="block h-auto w-full"
            />
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => scrollToId("ingressos")}
              aria-label="Ir para a seção de ingressos"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-7 font-extrabold text-black shadow-[0_10px_40px_-12px_rgba(255,138,0,0.7)] transition-transform hover:scale-[1.02] active:scale-[0.98] motion-reduce:transform-none"
              style={{ background: GOLD }}
            >
              <Ticket className="h-4 w-4" aria-hidden /> Ver ingressos
            </button>
            <button
              type="button"
              onClick={() => scrollToId("programacao")}
              aria-label="Ir para a programação por dia"
              className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#FFC300]/40 bg-white/[0.04] px-7 font-bold text-white transition-colors hover:bg-white/10"
            >
              Ver programação
            </button>
          </div>

          <Countdown targetIso={EVENT_START_RAW} />
        </div>
      </section>

      {/* ================= INGRESSOS ================= */}
      <section id="ingressos" className="mx-auto max-w-5xl px-5 py-10 scroll-mt-16">
        <SectionTitle eyebrow="🎟️ INGRESSOS OFICIAIS" title="Escolha seu dia" />
        <p className="-mt-3 mb-6 text-center text-sm text-[#B8B8B8]">
          Confira as opções oficiais disponíveis na Eventou.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SHOWS.map((show) => (
            <TicketCard key={show.id} show={show} />
          ))}

          <article className="flex flex-col rounded-2xl border border-[#FFC300]/35 bg-gradient-to-br from-[#1a1305] to-[#0a0a0a] p-4">
            <p className="text-[10px] font-black tracking-widest text-[#FFC300]">TODOS OS DIAS</p>
            <h3 className="mt-1 text-lg font-black leading-tight text-white">Passaporte</h3>
            <p className="mt-2 flex-1 text-xs leading-relaxed text-[#B8B8B8]">
              Acesso conforme os setores e condições disponíveis na plataforma oficial. Período:
              11 a 14 de setembro de 2026.
            </p>
            <a
              href={PASSPORT_LINK}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Ver passaporte de todos os dias na Eventou (abre em nova aba)"
              onClick={() => {
                trackExpoEvent("expo_ticket_click", {
                  event_day: "todos",
                  ticket_type: "passaporte",
                  destination: PASSPORT_LINK,
                  source_section: "ingressos",
                });
                trackExpoEvent("expo_passaporte_click", { source: "ingressos" });
                trackExpoEvent("expo_passaporte_eventou_click", { source: "ingressos" });
              }}
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-extrabold text-black transition-transform hover:scale-[1.02] active:scale-[0.98] motion-reduce:transform-none"
              style={{ background: GOLD }}
            >
              Ver passaporte
            </a>
          </article>
        </div>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-[#8a8a8a]">
          Links externos da Eventou, plataforma responsável pela venda e gestão dos ingressos.
        </p>
      </section>

      {/* ================= COMUNICADO OFICIAL ================= */}
      <section id="comunicado" className="mx-auto max-w-5xl px-5 py-10 scroll-mt-16">
        <SectionTitle eyebrow="📢 COMUNICADO OFICIAL" title="Atualização da programação" />
        <div className="grid gap-5 md:grid-cols-2 md:items-start">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/60">
            <img
              src={COMUNICADO_IMG}
              alt="Comunicado oficial da organização sobre a adequação da programação de shows da Expo Prudente 2026 ao edital de licitação, com dois dias de portões abertos"
              width={1440}
              height={1920}
              loading="lazy"
              decoding="async"
              className="block h-auto w-full"
            />
          </div>

          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-[#D4D4D4]">
              A programação da Expo Prudente 2026 foi reestruturada para atender às exigências do
              processo licitatório, incluindo dois dias com pista gratuita. O evento agora acontece
              de 11 a 14 de setembro.
            </p>

            <div id="suporte-compra" className="rounded-2xl border border-[#FFC300]/30 bg-white/[0.03] p-4">
              <p className="font-extrabold text-white">
                Já havia comprado ingresso para uma atração ou data alterada?
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#B8B8B8]">
                Entre em contato diretamente com o suporte da Eventou para consultar as opções
                disponíveis para o seu pedido.
              </p>
              <a
                href={SUPPORT_WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Falar com o suporte da Eventou no WhatsApp (abre em nova aba)"
                onClick={() => trackExpoEvent("expo_support_click", { source_section: "comunicado" })}
                className="mt-3 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-5 text-sm font-extrabold text-black transition-transform hover:scale-[1.02] active:scale-[0.98] motion-reduce:transform-none"
                style={{ background: GOLD }}
              >
                <MessageCircle className="h-4 w-4" aria-hidden /> Falar com o suporte da Eventou
              </a>
              <p className="mt-2 text-xs text-[#B8B8B8]">{SUPPORT_PHONE_LABEL}</p>
              <p className="mt-3 text-xs font-semibold text-[#FFC300]">
                A Roxou não realiza cancelamentos, trocas ou reembolsos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= PROGRAMAÇÃO ================= */}
      <section
        id="programacao"
        ref={programacaoRef}
        className="mx-auto max-w-5xl px-5 py-10 scroll-mt-16"
      >
        <SectionTitle eyebrow="🎤 PROGRAMAÇÃO OFICIAL" title="Dia a dia" />
        <div className="grid gap-3 sm:grid-cols-2">
          {SHOWS.map((show) => (
            <ScheduleCard key={show.id} show={show} />
          ))}
        </div>
      </section>

      {/* ================= SETORES ================= */}
      <section id="setores" className="mx-auto max-w-5xl px-5 py-10 scroll-mt-16">
        <SectionTitle eyebrow="🏟️ ESTRUTURA" title="Setores" />
        <div className="grid gap-3 sm:grid-cols-2">
          {SETORES.map((s) => (
            <article key={s.name} className="rounded-2xl border border-white/10 bg-[#101010] p-4">
              <h3 className="text-sm font-black tracking-wider text-[#FFC300]">{s.name}</h3>
              <ul className="mt-2 space-y-1.5">
                {s.items.map((item) => (
                  <li key={item} className="text-sm leading-relaxed text-[#B8B8B8]">
                    • {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* ================= INFORMAÇÕES ================= */}
      <section id="informacoes" className="mx-auto max-w-3xl px-5 py-10 scroll-mt-16">
        <SectionTitle eyebrow="ℹ️ ESSENCIAL" title="Informações do evento" />
        <dl className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-[#101010]">
          <InfoRow icon={<CalendarDays className="h-4 w-4" aria-hidden />} label="Data" value={EVENT_PERIOD_LABEL} />
          <InfoRow
            icon={<CalendarDays className="h-4 w-4" aria-hidden />}
            label="Horário de referência"
            value="A partir das 19h, conforme cada página oficial da Eventou"
          />
          <InfoRow icon={<MapPin className="h-4 w-4" aria-hidden />} label="Local" value={EVENT_VENUE} />
          <InfoRow icon={<MapPin className="h-4 w-4" aria-hidden />} label="Endereço" value={EVENT_ADDRESS} />
          <InfoRow icon={<Users className="h-4 w-4" aria-hidden />} label="Classificação" value={EVENT_AGE_RATING} />
          <InfoRow icon={<Ticket className="h-4 w-4" aria-hidden />} label="Ingressos" value="Venda e gerenciamento pela Eventou" />
          <InfoRow icon={<MessageCircle className="h-4 w-4" aria-hidden />} label="Suporte" value={SUPPORT_PHONE_LABEL} />
        </dl>
      </section>

      {/* ================= SUPORTE E DISCLAIMER ================= */}
      <section id="suporte" className="mx-auto max-w-3xl px-5 py-10 scroll-mt-16">
        <div className="rounded-2xl border border-[#FFC300]/25 bg-white/[0.03] p-5">
          <h2 className="text-base font-black uppercase tracking-wider text-[#FFC300]">
            Aviso importante
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#D4D4D4]">
            A Roxou atua exclusivamente na divulgação de informações públicas da Expo Prudente
            2026. A organização, programação, venda de ingressos, alterações, cancelamentos,
            atendimento, trocas e reembolsos são de responsabilidade dos organizadores do evento e
            da plataforma Eventou.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={PASSPORT_LINK}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir a página oficial de ingressos na Eventou (abre em nova aba)"
              onClick={() =>
                trackExpoEvent("expo_ticket_click", {
                  event_day: "todos",
                  ticket_type: "passaporte",
                  destination: PASSPORT_LINK,
                  source_section: "disclaimer",
                })
              }
              className="inline-flex min-h-[44px] items-center rounded-xl border border-[#FFC300]/40 px-4 text-sm font-bold text-[#FFC300] hover:bg-[#FFC300]/10"
            >
              Ingressos oficiais na Eventou
            </a>
            <a
              href={SUPPORT_WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Falar com o suporte da Eventou no WhatsApp (abre em nova aba)"
              onClick={() => trackExpoEvent("expo_support_click", { source_section: "disclaimer" })}
              className="inline-flex min-h-[44px] items-center rounded-xl border border-white/15 px-4 text-sm font-bold text-white/90 hover:bg-white/10"
            >
              Suporte Eventou · {SUPPORT_PHONE_LABEL}
            </a>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/15 px-4 text-sm font-bold text-white/90 hover:bg-white/10"
            >
              <ArrowUp className="h-4 w-4" aria-hidden /> Voltar ao topo
            </button>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-white/5 bg-black/40 px-5 py-8">
        <div className="mx-auto max-w-3xl space-y-3 text-center">
          <a
            href="https://instagram.com/expoprudente2026oficial"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#FFC300] hover:text-[#FF8A00]"
          >
            <Instagram className="h-4 w-4" aria-hidden />
            @expoprudente2026oficial
          </a>
          <p className="text-xs leading-relaxed text-[#8a8a8a]">
            A Roxou apenas divulga informações públicas do evento. A organização, venda de
            ingressos, alterações na programação, atendimento e reembolsos são de responsabilidade
            dos organizadores e da plataforma Eventou.
          </p>
        </div>
      </footer>

      {showFloatingCta && (
        <button
          type="button"
          onClick={() => scrollToId("ingressos")}
          aria-label="Ver ingressos oficiais"
          className="fixed bottom-4 left-1/2 z-40 inline-flex min-h-[48px] -translate-x-1/2 items-center gap-2 rounded-full px-6 text-sm font-extrabold text-black shadow-[0_10px_40px_-10px_rgba(255,138,0,0.8)] md:hidden"
          style={{ background: GOLD }}
        >
          <Ticket className="h-4 w-4" aria-hidden />
          VER INGRESSOS
        </button>
      )}
    </ExpoLayout>
  );
}

/* ========================================================================== */

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="mt-0.5 text-[#FFC300]">{icon}</span>
      <div className="min-w-0">
        <dt className="text-[11px] font-bold uppercase tracking-wider text-[#8a8a8a]">{label}</dt>
        <dd className="text-sm font-semibold leading-snug text-white break-words">{value}</dd>
      </div>
    </div>
  );
}

function DayBadges({ show }: { show: ShowCard }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {show.freeEntry && (
        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-black" style={{ background: GOLD }}>
          Pista grátis
        </span>
      )}
      {show.badge && (
        <span className="inline-flex items-center rounded-full border border-[#FFC300]/40 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#FFC300]">
          {show.badge}
        </span>
      )}
    </div>
  );
}

function TicketCard({ show }: { show: ShowCard }) {
  return (
    <article className="flex flex-col rounded-2xl border border-white/10 bg-[#101010] p-4 transition-colors hover:border-[#FF8A00]/50">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold tracking-widest text-[#FFC300]">{show.weekday}</p>
          <p className="text-xl font-black leading-none text-white">{show.date}</p>
        </div>
        <DayBadges show={show} />
      </div>

      <ul className="mt-3 flex-1 space-y-1">
        {show.artists.map((a) => (
          <li key={a} className="text-sm font-semibold leading-snug text-white/90">
            {a}
          </li>
        ))}
      </ul>

      <a
        href={show.link}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${show.ctaLabel} do dia ${show.date} na Eventou (abre em nova aba)`}
        onClick={() => {
          trackExpoEvent("expo_ticket_click", {
            event_day: show.date,
            ticket_type: show.freeEntry ? "pista_gratis" : "ingresso",
            destination: show.link,
            source_section: "ingressos",
          });
          trackExpoEvent("expo_eventou_click", { date: show.date, artist: show.artists.join(", ") });
        }}
        className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 text-sm font-extrabold text-black transition-transform hover:scale-[1.02] active:scale-[0.98] motion-reduce:transform-none"
        style={{ background: GOLD }}
      >
        {show.ctaLabel}
      </a>
    </article>
  );
}

function ScheduleCard({ show }: { show: ShowCard }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#101010]">
      {show.art && (
        <img
          src={show.art}
          alt={`Arte oficial do dia ${show.date} da Expo Prudente 2026 com ${show.artists.join(", ")}`}
          width={1280}
          height={481}
          loading="lazy"
          decoding="async"
          className="block h-auto w-full"
        />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-[#FFC300]">{show.weekday}</p>
            <p className="text-xl font-black leading-none text-white">{show.date}</p>
          </div>
          <DayBadges show={show} />
        </div>

        <p className="mt-2.5 text-sm leading-snug text-white/90">{show.artists.join(" · ")}</p>

        <a
          href={show.link}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${show.ctaLabel} do dia ${show.date} na Eventou (abre em nova aba)`}
          onClick={() =>
            trackExpoEvent("expo_ticket_click", {
              event_day: show.date,
              ticket_type: show.freeEntry ? "pista_gratis" : "ingresso",
              destination: show.link,
              source_section: "programacao",
            })
          }
          className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[#FFC300]/40 px-4 text-sm font-bold text-[#FFC300] hover:bg-[#FFC300]/10"
        >
          {show.ctaLabel}
        </a>
      </div>
    </article>
  );
}

function Countdown({ targetIso }: { targetIso: string }) {
  const targetMs = useMemo(() => new Date(targetIso).getTime(), [targetIso]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = targetMs - now;

  if (!Number.isFinite(targetMs) || diff <= 0) {
    return (
      <p className="mt-8 inline-flex rounded-2xl border border-[#FFC300]/40 bg-white/[0.04] px-6 py-4 text-base font-black text-white">
        🎉 A Expo Prudente 2026 começou!
      </p>
    );
  }

  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff / 3_600_000) % 24);
  const minutes = Math.floor((diff / 60_000) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return (
    <div className="mx-auto mt-8 w-full max-w-md">
      <p className="mb-3 text-center text-[11px] font-bold tracking-[0.25em] text-[#FFC300]">
        CONTAGEM REGRESSIVA PARA A EXPO PRUDENTE 2026
      </p>
      <div className="grid grid-cols-4 gap-2">
        {[
          { v: days, l: "DIAS" },
          { v: hours, l: "HORAS" },
          { v: minutes, l: "MIN" },
          { v: seconds, l: "SEG" },
        ].map((item) => (
          <div
            key={item.l}
            className="rounded-2xl border border-[#FFC300]/25 bg-white/[0.04] px-2 py-3 text-center"
          >
            <p
              className="font-black tabular-nums leading-none"
              style={{ fontSize: "clamp(1.4rem, 6.5vw, 2rem)", color: "#FFC300" }}
            >
              {String(item.v).padStart(2, "0")}
            </p>
            <p className="mt-1.5 text-[9px] font-bold tracking-[0.2em] text-white/70">{item.l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
