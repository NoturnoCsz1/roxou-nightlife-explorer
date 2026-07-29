import { Link } from "react-router-dom";
import { Instagram, Music2, Mail, Globe, ArrowRight, Play, Trophy, Medal, Star, Sparkles } from "lucide-react";
import SEO from "@/components/SEO";
import { BdaLayout } from "@/components/bda/BdaLayout";
import BdaCountdown from "@/components/bda/BdaCountdown";
import {
  BDA_CATEGORIES,
  BDA_PRIZES,
  BDA_ROUTES,
  BDA_SOCIAL,
  BDA_STEPS,
} from "@/components/bda/bdaConfig";
import bdaLogo from "@/assets/bda-logo.png.asset.json";

const CANONICAL = "https://roxou.com.br/batalhadeaura";

const PRIZE_ICONS = [Trophy, Medal, Star];

function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <header className="mb-8 text-center">
      <span className="bda-font-body inline-block rounded-full border border-[#2E7DFF]/40 bg-[#2E7DFF]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-[#8FC0FF]">
        {kicker}
      </span>
      <h2 className="bda-font-display mt-3 text-2xl font-black uppercase text-white sm:text-4xl [text-shadow:0_0_24px_rgba(168,85,247,0.55)]">
        {title}
      </h2>
      <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-[#A855F7] to-transparent" />
    </header>
  );
}

export default function BatalhaDeAura() {
  return (
    <BdaLayout>
      <SEO
        title="Batalha de Aura PP | Campeonato Oficial"
        description="O primeiro campeonato de Farmar Aura de Presidente Prudente."
        canonical={CANONICAL}
        ogType="website"
        keywords="batalha de aura, campeonato aura, presidente prudente, esports prudente, farmar aura"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          name: "Batalha de Aura PP",
          description: "O primeiro campeonato de Farmar Aura de Presidente Prudente.",
          url: CANONICAL,
          eventStatus: "https://schema.org/EventScheduled",
          location: {
            "@type": "Place",
            name: "Presidente Prudente",
            address: {
              "@type": "PostalAddress",
              addressLocality: "Presidente Prudente",
              addressRegion: "SP",
              addressCountry: "BR",
            },
          },
          organizer: { "@type": "Organization", name: "ROXOU", url: "https://roxou.com.br" },
        }}
      />

      {/* ================= HERO ================= */}
      <section className="relative flex min-h-[100svh] flex-col items-center justify-center px-4 py-16 text-center">
        <div className="relative">
          <div aria-hidden className="absolute inset-0 -z-10 rounded-full bg-[#A855F7]/30 blur-[70px]" />
          <img
            src={bdaLogo.url}
            alt="Logo oficial da Batalha de Aura PP"
            width={1024}
            height={1024}
            fetchPriority="high"
            className="mx-auto h-40 w-40 object-contain drop-shadow-[0_0_40px_rgba(168,85,247,0.65)] sm:h-56 sm:w-56"
          />
        </div>

        <h1 className="bda-font-display mt-6 text-[10vw] font-black uppercase leading-[0.95] text-white sm:text-6xl lg:text-7xl [text-shadow:0_0_30px_rgba(46,125,255,0.6)]">
          Batalha de
          <span className="block bg-gradient-to-r from-[#A855F7] via-[#C8D2E0] to-[#2E7DFF] bg-clip-text text-transparent">
            Aura PP
          </span>
        </h1>

        <p className="bda-font-body mx-auto mt-4 max-w-xl text-base text-[#C8D2E0]/85 sm:text-lg">
          O primeiro campeonato de Farmar Aura de Presidente Prudente.
        </p>

        <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href="#inscricoes"
            className="bda-font-display group inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-r from-[#A855F7] to-[#2E7DFF] px-7 text-sm font-bold uppercase tracking-widest text-white shadow-[0_0_34px_-6px_rgba(168,85,247,0.95)] transition-transform duration-200 hover:scale-[1.03]"
          >
            Quero participar
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="#patrocinadores"
            className="bda-font-display inline-flex h-12 items-center justify-center rounded-full border border-[#C8D2E0]/30 bg-white/[0.04] px-7 text-sm font-bold uppercase tracking-widest text-[#C8D2E0] backdrop-blur-sm transition-colors hover:border-[#2E7DFF] hover:text-white"
          >
            Quero patrocinar
          </a>
        </div>

        {/* Placeholder do vídeo teaser */}
        <div className="mx-auto mt-12 w-full max-w-3xl">
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-[#A855F7]/30 bg-black/50 backdrop-blur-sm">
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.22),transparent_65%)]" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-[#2E7DFF]/50 bg-white/[0.05]">
                <Play className="h-6 w-6 text-[#8FC0FF]" />
              </span>
              <span className="bda-font-body text-xs uppercase tracking-[0.3em] text-[#C8D2E0]/60">
                Teaser em breve
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= O QUE É ================= */}
      <section className="relative px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <SectionTitle kicker="Institucional" title="O que é a Batalha de Aura" />
          <div className="rounded-3xl border border-[#C8D2E0]/15 bg-white/[0.03] p-6 backdrop-blur-sm sm:p-10">
            <p className="bda-font-body text-lg leading-relaxed text-[#C8D2E0]/90">
              A Batalha de Aura PP é o primeiro campeonato de Farmar Aura de Presidente Prudente.
              A competição reúne participantes da cidade em uma disputa organizada, com etapas
              definidas, acompanhamento de pontuação e uma grande final.
            </p>
            <p className="bda-font-body mt-4 text-lg leading-relaxed text-[#C8D2E0]/75">
              O campeonato nasce com estrutura de eSports: identidade própria, transmissão de
              conteúdo, ranking e reconhecimento oficial para os competidores que se destacarem
              ao longo da temporada. As regras completas serão divulgadas no regulamento oficial.
            </p>
            <div className="mt-6 flex items-center gap-2 text-[#A855F7]">
              <Sparkles className="h-4 w-4" />
              <span className="bda-font-body text-xs font-semibold uppercase tracking-[0.24em]">
                Uma realização ROXOU
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CATEGORIAS ================= */}
      <section className="relative px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <SectionTitle kicker="Formatos" title="Categorias" />
          <div className="grid gap-5 sm:grid-cols-2">
            {BDA_CATEGORIES.map((c) => (
              <article
                key={c.id}
                className="group relative overflow-hidden rounded-3xl border border-[#A855F7]/25 bg-gradient-to-b from-white/[0.06] to-transparent p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#2E7DFF]/60 hover:shadow-[0_0_46px_-12px_rgba(46,125,255,0.9)]"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#A855F7]/25 blur-3xl transition-opacity duration-300 group-hover:opacity-100 sm:opacity-60"
                />
                <span className="bda-font-body rounded-full border border-[#2E7DFF]/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8FC0FF]">
                  {c.tag}
                </span>
                <h3 className="bda-font-display mt-4 text-3xl font-black text-white">{c.name}</h3>
                <p className="bda-font-body mt-3 text-[#C8D2E0]/80">{c.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ================= COMO FUNCIONA ================= */}
      <section className="relative px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <SectionTitle kicker="Etapas" title="Como funciona" />
          <ol className="relative space-y-5 pl-8">
            <div
              aria-hidden
              className="absolute left-[13px] top-2 h-[calc(100%-1rem)] w-px bg-gradient-to-b from-[#A855F7] via-[#2E7DFF] to-transparent"
            />
            {BDA_STEPS.map((s, i) => (
              <li
                key={s.step}
                className="relative animate-fade-in rounded-2xl border border-[#C8D2E0]/12 bg-white/[0.03] p-5 backdrop-blur-sm"
                style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
              >
                <span
                  aria-hidden
                  className="absolute -left-8 top-6 flex h-[14px] w-[14px] items-center justify-center rounded-full bg-[#A855F7] shadow-[0_0_16px_rgba(168,85,247,1)]"
                />
                <div className="bda-font-display text-xs font-bold tracking-[0.3em] text-[#8FC0FF]">
                  {s.step}
                </div>
                <h3 className="bda-font-display mt-1 text-xl font-black uppercase text-white">
                  {s.title}
                </h3>
                <p className="bda-font-body mt-1 text-[#C8D2E0]/80">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ================= PREMIAÇÃO ================= */}
      <section className="relative px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <SectionTitle kicker="Reconhecimento" title="Premiação" />
          <div className="grid gap-5 sm:grid-cols-3">
            {BDA_PRIZES.map((p, i) => {
              const Icon = PRIZE_ICONS[i] ?? Trophy;
              return (
                <article
                  key={p.title}
                  className="relative overflow-hidden rounded-3xl border border-[#C8D2E0]/20 bg-gradient-to-b from-[#A855F7]/12 to-transparent p-6 text-center transition-transform duration-300 hover:-translate-y-1"
                >
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#A855F7]/40 bg-black/40">
                    <Icon className="h-5 w-5 text-[#C8D2E0]" />
                  </span>
                  <h3 className="bda-font-display mt-4 text-xl font-black uppercase text-white">
                    {p.title}
                  </h3>
                  <div className="bda-font-body text-[11px] uppercase tracking-[0.24em] text-[#8FC0FF]">
                    {p.subtitle}
                  </div>
                  <p className="bda-font-body mt-3 text-sm text-[#C8D2E0]/80">{p.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= PATROCINADORES ================= */}
      <section id="patrocinadores" className="relative scroll-mt-16 px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <SectionTitle kicker="Parcerias" title="Patrocinadores" />
          {[
            { label: "Patrocínio Oficial", slots: 4 },
            { label: "Apoio Oficial", slots: 6 },
          ].map((group) => (
            <div key={group.label} className="mb-10">
              <h3 className="bda-font-display mb-4 text-center text-sm font-bold uppercase tracking-[0.28em] text-[#C8D2E0]/70">
                {group.label}
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: group.slots }).map((_, i) => (
                  <div
                    key={i}
                    className="flex aspect-[3/2] items-center justify-center rounded-2xl border border-dashed border-[#C8D2E0]/20 bg-white/[0.02] text-[10px] uppercase tracking-[0.2em] text-[#C8D2E0]/40"
                  >
                    Sua marca aqui
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= CONTAGEM REGRESSIVA ================= */}
      <section className="relative px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <SectionTitle kicker="Grande Final" title="Contagem regressiva" />
          <BdaCountdown />
        </div>
      </section>

      {/* ================= INSCRIÇÕES ================= */}
      <section id="inscricoes" className="relative scroll-mt-16 px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="relative overflow-hidden rounded-[2rem] border border-[#A855F7]/35 bg-gradient-to-br from-[#A855F7]/18 via-black/30 to-[#2E7DFF]/18 p-8 backdrop-blur-sm sm:p-14">
            <h2 className="bda-font-display text-2xl font-black uppercase text-white sm:text-4xl">
              Inscrições
            </h2>
            <p className="bda-font-body mx-auto mt-3 max-w-md text-[#C8D2E0]/85">
              As inscrições da Batalha de Aura PP serão abertas em breve. Garanta seu lugar na
              primeira temporada.
            </p>
            <Link
              to={BDA_ROUTES.inscricao}
              className="bda-font-display mt-8 inline-flex h-14 items-center justify-center rounded-full bg-gradient-to-r from-[#A855F7] to-[#2E7DFF] px-10 text-base font-black uppercase tracking-[0.2em] text-white shadow-[0_0_44px_-8px_rgba(168,85,247,1)] transition-transform duration-200 hover:scale-[1.03]"
            >
              Inscreva-se
            </Link>
          </div>
        </div>
      </section>

      {/* ================= RODAPÉ ================= */}
      <footer className="relative border-t border-[#C8D2E0]/12 px-4 py-12">
        <div className="mx-auto max-w-4xl text-center">
          <img
            src={bdaLogo.url}
            alt="Batalha de Aura PP"
            width={1024}
            height={1024}
            loading="lazy"
            className="mx-auto h-16 w-16 object-contain opacity-90"
          />
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {[
              { href: BDA_SOCIAL.instagram, Icon: Instagram, label: "Instagram" },
              { href: BDA_SOCIAL.tiktok, Icon: Music2, label: "TikTok" },
              { href: BDA_SOCIAL.contato, Icon: Mail, label: "Contato" },
              { href: BDA_SOCIAL.site, Icon: Globe, label: "Site" },
            ].map(({ href, Icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="bda-font-body inline-flex h-9 items-center gap-2 rounded-full border border-[#C8D2E0]/20 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#C8D2E0]/80 transition-colors hover:border-[#A855F7] hover:text-white"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </a>
            ))}
          </div>
          <p className="bda-font-body mt-6 text-xs text-[#C8D2E0]/45">
            © {new Date().getFullYear()} Batalha de Aura PP — Uma realização ROXOU. Todos os
            direitos reservados.
          </p>
        </div>
      </footer>
    </BdaLayout>
  );
}
