import { useEffect, useState } from "react";
import {
  Code2, Megaphone, Video, CalendarHeart, ArrowRight, Instagram,
  Phone, Sparkles, Layers, MonitorSmartphone, Camera, Radio,
  PenTool, Rocket, Compass, Cpu, Film, Users, Mail,
} from "lucide-react";

/**
 * Roxou Media — Site institucional/comercial servido em midia.roxou.com.br
 * (também acessível via /midia). Single-page, leve, mobile-first, sem
 * dependências pesadas nem AdSense. Assets servidos de /brand (estáticos).
 */

const WHATSAPP_URL =
  "https://wa.me/5518997469865?text=Ol%C3%A1%20Roxou%2C%20quero%20um%20or%C3%A7amento.";
const INSTAGRAM_URL = "https://instagram.com/roxou.pp";
const CANONICAL = "https://midia.roxou.com.br";

const SYMBOL = "/brand/roxou-symbol.png";
const LOGO = "/brand/roxou-logo.png";

const nav = [
  { label: "Serviços", href: "#servicos" },
  { label: "Audiovisual", href: "#audiovisual" },
  { label: "Tecnologia", href: "#tecnologia" },
  { label: "Ecossistema", href: "#ecossistema" },
  { label: "Portfólio", href: "#portfolio" },
  { label: "Contato", href: "#contato" },
];

const marquee = [
  "TECNOLOGIA", "MÍDIA", "AUDIOVISUAL", "EVENTOS", "EXPERIÊNCIAS",
  "PLATAFORMAS", "CONTEÚDO", "ESTRATÉGIA",
];

const pillars = [
  {
    icon: Code2,
    title: "Tecnologia",
    tag: "Desenvolvimento",
    highlight: true,
    desc: "Sites, landing pages, plataformas, sistemas web, integrações e automação sob demanda.",
    caps: ["Sites institucionais", "Plataformas", "Sistemas", "Integrações", "Automação"],
  },
  {
    icon: Video,
    title: "Audiovisual",
    tag: "Produção",
    highlight: true,
    desc: "Cobertura de eventos, aftermovies, reels, institucionais e conteúdo social.",
    caps: ["Aftermovies", "Reels", "Cobertura ao vivo", "Institucionais", "Casamentos"],
  },
  {
    icon: Megaphone,
    title: "Marketing & Mídia",
    tag: "Distribuição",
    desc: "Campanhas, conteúdo, redes sociais, SEO e divulgação no ecossistema Roxou.",
    caps: ["Campanhas", "Redes sociais", "SEO", "Conteúdo patrocinado"],
  },
  {
    icon: CalendarHeart,
    title: "Eventos & Empresas",
    tag: "Operação",
    desc: "Divulgação, listas VIP, reservas, credenciamento e ferramentas para parceiros.",
    caps: ["Listas VIP", "Reservas", "Check-in QR", "Landing pages"],
  },
] as const;

const builds = [
  { icon: MonitorSmartphone, title: "Sites e plataformas", desc: "Institucionais, comerciais, portais e áreas logadas." },
  { icon: Layers, title: "Sistemas personalizados", desc: "Painéis, gestão, integrações e automações internas." },
  { icon: Sparkles, title: "Experiências digitais", desc: "Landing pages, produtos digitais e interfaces sob medida." },
  { icon: Megaphone, title: "Campanhas e mídia", desc: "Estratégia, conteúdo e distribuição no ecossistema." },
  { icon: Film, title: "Produção audiovisual", desc: "Aftermovies, reels, cobertura e conteúdo social." },
  { icon: CalendarHeart, title: "Soluções para eventos", desc: "Divulgação, VIP, reservas e credenciamento." },
];

const portfolio = [
  { name: "Roxou", cat: "Plataforma", desc: "Descoberta de eventos, bares e experiências.", url: "https://roxou.com.br" },
  { name: "Partner Pro", cat: "Sistema", desc: "Ferramentas para parceiros: eventos, reservas e VIP.", url: "https://parceiro.roxou.com.br" },
  { name: "Reserva Roxou", cat: "Produto", desc: "Reservas e atendimento para estabelecimentos.", url: "https://reserva.roxou.com.br" },
  { name: "DriverDash Roxou", cat: "Operação", desc: "Painel de gestão para motoristas parceiros.", url: null },
  { name: "Roxou Media", cat: "Institucional", desc: "Tecnologia, mídia, audiovisual e experiências.", url: CANONICAL },
];

const ecosystem = [
  { name: "Roxou", url: "https://roxou.com.br", desc: "Descoberta de lugares, eventos e experiências.", icon: Compass },
  { name: "Partner Pro", url: "https://parceiro.roxou.com.br", desc: "Ferramentas para empresas, reservas, VIP e gestão.", icon: Users },
  { name: "Reserva Roxou", url: "https://reserva.roxou.com.br", desc: "Reservas e atendimento.", icon: CalendarHeart },
  { name: "DriverDash Roxou", url: null, desc: "Gestão para motoristas.", icon: Cpu },
  { name: "Roxou Media", url: CANONICAL, desc: "Tecnologia, mídia, audiovisual e experiências.", icon: Sparkles },
];

const process = [
  { icon: Compass, title: "Descobrimos", desc: "Planejamento e estratégia." },
  { icon: PenTool, title: "Criamos", desc: "Design, conteúdo e audiovisual." },
  { icon: Rocket, title: "Desenvolvemos", desc: "Sites, plataformas e sistemas." },
  { icon: Radio, title: "Conectamos", desc: "Mídia, público e experiências." },
];

const audiovisualCats = [
  "Eventos", "Shows", "Casamentos", "Festas", "Aftermovies",
  "Institucionais", "Conteúdo social", "Cobertura em tempo real",
];

const portfolioCats = ["Todos", "Tecnologia", "Audiovisual", "Eventos", "Marketing"] as const;
type PortfolioCat = typeof portfolioCats[number];

const catMap: Record<string, PortfolioCat[]> = {
  Roxou: ["Tecnologia", "Marketing"],
  "Partner Pro": ["Tecnologia", "Eventos"],
  "Reserva Roxou": ["Tecnologia", "Eventos"],
  "DriverDash Roxou": ["Tecnologia"],
  "Roxou Media": ["Marketing", "Audiovisual"],
};

export default function RoxouMedia() {
  const [filter, setFilter] = useState<PortfolioCat>("Todos");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.title = "Roxou | Tecnologia, Mídia, Audiovisual e Experiências";

    const setMeta = (attr: "name" | "property", key: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const desc =
      "Desenvolvimento de sites e plataformas, marketing digital, produção audiovisual, cobertura de eventos e soluções para empresas — em Presidente Prudente e região.";
    setMeta("name", "description", desc);
    setMeta("property", "og:title", "Roxou | Tecnologia, Mídia, Audiovisual e Experiências");
    setMeta("property", "og:description", desc);
    setMeta("property", "og:url", CANONICAL);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:image", `${CANONICAL}${LOGO}`);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:image", `${CANONICAL}${LOGO}`);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = CANONICAL;

    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Roxou",
      url: CANONICAL,
      logo: `${CANONICAL}${SYMBOL}`,
      sameAs: [INSTAGRAM_URL],
      founder: { "@type": "Person", name: "Fernando Henrique", jobTitle: "CEO & Diretor Criativo" },
      contactPoint: [
        { "@type": "ContactPoint", telephone: "+5518997469865", contactType: "sales", areaServed: "BR" },
      ],
    });
    document.head.appendChild(ld);
    return () => {
      document.head.removeChild(ld);
    };
  }, []);

  const filteredPortfolio =
    filter === "Todos" ? portfolio : portfolio.filter((p) => catMap[p.name]?.includes(filter));

  return (
    <div className="min-h-screen bg-background text-foreground font-body antialiased overflow-x-hidden">
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/75 border-b border-primary/10">
        <div className="mx-auto max-w-6xl px-4 md:px-6 h-14 md:h-16 flex items-center justify-between gap-4">
          <a href="#top" className="flex items-center gap-2.5 shrink-0">
            <img src={SYMBOL} alt="Roxou" width={30} height={30} className="h-7 w-7 md:h-8 md:w-8" />
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-black tracking-tight text-lg md:text-xl">ROXOU</span>
              <span className="hidden sm:inline text-[9px] uppercase tracking-[0.25em] text-primary/80 font-semibold">
                Media
              </span>
            </div>
          </a>
          <nav className="hidden lg:flex items-center gap-1">
            {nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="px-3 py-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
              >
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs md:text-sm px-3.5 md:px-5 py-2 md:py-2.5 rounded-full bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all shadow-[0_0_24px_-6px_hsl(var(--primary)/0.6)]"
            >
              Solicitar <span className="hidden sm:inline">orçamento</span>
            </a>
            <button
              type="button"
              aria-label="Menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 text-foreground/80"
            >
              <span className="sr-only">Menu</span>
              <div className="flex flex-col gap-1">
                <span className="block h-0.5 w-4 bg-current" />
                <span className="block h-0.5 w-4 bg-current" />
                <span className="block h-0.5 w-4 bg-current" />
              </div>
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="lg:hidden border-t border-border/30 bg-background/95 backdrop-blur">
            <nav className="mx-auto max-w-6xl px-4 py-3 grid grid-cols-2 gap-1">
              {nav.map((n) => (
                <a
                  key={n.href}
                  href={n.href}
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-2.5 rounded-lg text-sm font-medium text-foreground/80 hover:bg-secondary/60"
                >
                  {n.label}
                </a>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main id="top">
        {/* ===== HERO ===== */}
        <section className="relative overflow-hidden border-b border-primary/10">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(700px circle at 15% 0%, hsl(var(--primary) / 0.35), transparent 55%), radial-gradient(600px circle at 95% 90%, hsl(var(--accent) / 0.22), transparent 55%)",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--primary)/0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)/0.5) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
            }}
          />

          <div className="relative mx-auto max-w-6xl px-4 md:px-6 pt-10 md:pt-20 pb-14 md:pb-24 grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 items-center">
            {/* Coluna esquerda */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 mb-5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] md:text-xs uppercase tracking-[0.25em] text-primary font-semibold">
                  Tecnologia • Mídia • Experiências
                </span>
              </div>
              <h1 className="font-display font-black text-[2rem] sm:text-5xl md:text-6xl leading-[1.05] tracking-tight mb-5">
                Transformamos ideias em{" "}
                <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                  experiências
                </span>{" "}
                que conectam pessoas, marcas e eventos.
              </h1>
              <p className="text-base md:text-lg text-foreground/70 mb-8 max-w-xl leading-relaxed">
                Desenvolvimento, mídia, audiovisual e soluções para eventos — no mesmo estúdio.
                Uma empresa regional com estrutura para construir sua próxima plataforma, campanha ou produção.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm md:text-base hover:brightness-110 transition-all shadow-[0_0_32px_-6px_hsl(var(--primary)/0.7)]"
                >
                  Solicitar orçamento
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
                <a
                  href="#servicos"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-border/60 text-foreground font-semibold text-sm md:text-base hover:bg-secondary/60 hover:border-primary/40 transition-all"
                >
                  Conhecer nossos serviços
                </a>
              </div>

              <dl className="mt-10 grid grid-cols-3 gap-4 max-w-md">
                {[
                  { k: "4", l: "frentes integradas" },
                  { k: "5+", l: "produtos próprios" },
                  { k: "SP", l: "e região" },
                ].map((s) => (
                  <div key={s.l} className="border-l-2 border-primary/40 pl-3">
                    <dt className="font-display font-black text-2xl md:text-3xl text-foreground">{s.k}</dt>
                    <dd className="text-[11px] text-foreground/60 uppercase tracking-wider mt-0.5">{s.l}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Coluna direita — composição visual */}
            <div className="relative">
              <div className="relative aspect-[4/5] max-w-md mx-auto">
                {/* Painel principal */}
                <div className="absolute inset-0 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-background to-background overflow-hidden">
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-30"
                    style={{
                      background:
                        "radial-gradient(circle at 50% 30%, hsl(var(--primary)/0.5), transparent 55%)",
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center p-10">
                    <img
                      src={SYMBOL}
                      alt=""
                      aria-hidden
                      width={320}
                      height={320}
                      className="w-full max-w-[280px] drop-shadow-[0_0_60px_hsl(var(--primary)/0.55)]"
                    />
                  </div>
                </div>

                {/* Card flutuante 1 — Tecnologia */}
                <div className="absolute -left-3 md:-left-8 top-6 md:top-10 rounded-2xl border border-primary/30 bg-card/90 backdrop-blur p-3.5 md:p-4 shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.5)] w-[54%] max-w-[240px]">
                  <div className="flex items-center gap-2 mb-2">
                    <Code2 className="h-4 w-4 text-primary" />
                    <span className="text-[10px] uppercase tracking-wider text-foreground/60 font-semibold">
                      Plataforma
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-1.5 rounded-full bg-primary/40 w-full" />
                    <div className="h-1.5 rounded-full bg-primary/25 w-4/5" />
                    <div className="h-1.5 rounded-full bg-primary/20 w-3/5" />
                  </div>
                </div>

                {/* Card flutuante 2 — Audiovisual */}
                <div className="absolute -right-3 md:-right-8 bottom-12 md:bottom-16 rounded-2xl border border-accent/30 bg-card/90 backdrop-blur p-3.5 md:p-4 shadow-[0_8px_32px_-8px_hsl(var(--accent)/0.5)] w-[52%] max-w-[220px]">
                  <div className="flex items-center gap-2 mb-2">
                    <Camera className="h-4 w-4 text-accent" />
                    <span className="text-[10px] uppercase tracking-wider text-foreground/60 font-semibold">
                      Captação
                    </span>
                  </div>
                  <div className="aspect-video rounded-lg bg-gradient-to-br from-accent/30 via-primary/20 to-background border border-border/40 flex items-center justify-center">
                    <Video className="h-6 w-6 text-accent/80" />
                  </div>
                </div>

                {/* Chip Mídia */}
                <div className="absolute right-2 top-2 rounded-full border border-primary/40 bg-background/80 backdrop-blur px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Radio className="h-3 w-3" /> Ao vivo
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== MARQUEE POSICIONAMENTO ===== */}
        <section aria-label="Áreas de atuação" className="border-b border-primary/10 py-4 bg-primary/[0.03] overflow-hidden">
          <div className="flex gap-10 whitespace-nowrap animate-[roxouMarquee_40s_linear_infinite] motion-reduce:animate-none">
            {[...marquee, ...marquee, ...marquee].map((m, i) => (
              <span
                key={i}
                className="text-sm md:text-base font-display font-black uppercase tracking-[0.3em] text-foreground/40 flex items-center gap-10"
              >
                {m}
                <span className="h-1 w-1 rounded-full bg-primary/60" aria-hidden />
              </span>
            ))}
          </div>
          <style>{`@keyframes roxouMarquee{from{transform:translateX(0)}to{transform:translateX(-33.333%)}}`}</style>
        </section>

        {/* ===== SERVIÇOS (Bento) ===== */}
        <section id="servicos" className="mx-auto max-w-6xl px-4 md:px-6 py-16 md:py-24">
          <SectionEyebrow>O que fazemos</SectionEyebrow>
          <h2 className="font-display font-black text-3xl md:text-5xl mb-4 max-w-3xl">
            Quatro frentes integradas, um único ponto de contato.
          </h2>
          <p className="text-foreground/70 mb-10 md:mb-14 max-w-2xl text-base md:text-lg">
            Tecnologia e audiovisual como pilares, marketing e operação para amplificar. Tudo conversa entre si.
          </p>
          <div className="grid md:grid-cols-6 gap-4 md:gap-5">
            {pillars.map((p) => (
              <article
                key={p.title}
                className={`group relative rounded-3xl border p-6 md:p-8 bg-card overflow-hidden transition-all ${
                  p.highlight
                    ? "md:col-span-3 border-primary/30 hover:border-primary/60"
                    : "md:col-span-3 lg:col-span-3 border-border/40 hover:border-primary/40"
                }`}
              >
                {p.highlight && (
                  <div
                    aria-hidden
                    className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-primary/20 blur-3xl opacity-60 group-hover:opacity-100 transition-opacity"
                  />
                )}
                <div className="relative">
                  <div className="flex items-center justify-between mb-5">
                    <div className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-primary/15 border border-primary/30 text-primary">
                      <p.icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-foreground/50 font-semibold">
                      {p.tag}
                    </span>
                  </div>
                  <h3 className="font-display font-black text-xl md:text-2xl mb-2.5">{p.title}</h3>
                  <p className="text-sm md:text-[15px] text-foreground/70 leading-relaxed mb-5">{p.desc}</p>
                  <ul className="flex flex-wrap gap-1.5">
                    {p.caps.map((c) => (
                      <li
                        key={c}
                        className="text-[11px] md:text-xs px-2.5 py-1 rounded-full bg-secondary/50 border border-border/40 text-foreground/75"
                      >
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ===== O QUE CONSTRUÍMOS ===== */}
        <section id="tecnologia" className="border-y border-primary/10 bg-primary/[0.02]">
          <div className="mx-auto max-w-6xl px-4 md:px-6 py-16 md:py-24">
            <SectionEyebrow>Capacidades</SectionEyebrow>
            <h2 className="font-display font-black text-3xl md:text-5xl mb-4 max-w-3xl">
              O que a Roxou constrói.
            </h2>
            <p className="text-foreground/70 mb-10 md:mb-14 max-w-2xl text-base md:text-lg">
              Do primeiro rascunho ao deploy — plataformas, mídia e produção que trabalham juntas.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {builds.map((b) => (
                <article
                  key={b.title}
                  className="group relative rounded-2xl border border-border/40 bg-card p-5 md:p-6 hover:border-primary/40 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 border border-primary/25 text-primary shrink-0">
                      <b.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display font-bold text-base md:text-lg mb-1">{b.title}</h3>
                      <p className="text-sm text-foreground/65 leading-relaxed">{b.desc}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ===== AUDIOVISUAL ===== */}
        <section id="audiovisual" className="mx-auto max-w-6xl px-4 md:px-6 py-16 md:py-24">
          <SectionEyebrow>Audiovisual</SectionEyebrow>
          <h2 className="font-display font-black text-3xl md:text-5xl mb-4 max-w-3xl">
            Histórias que merecem ser lembradas.
          </h2>
          <p className="text-foreground/70 mb-10 md:mb-12 max-w-2xl text-base md:text-lg">
            Do primeiro frame ao resultado final, transformamos momentos, marcas e eventos em conteúdo que gera conexão.
          </p>

          <div className="grid lg:grid-cols-3 gap-4 md:gap-5">
            {/* Card principal 16:9 */}
            <div className="lg:col-span-2 relative rounded-3xl border border-primary/30 bg-card overflow-hidden">
              <div className="aspect-video relative">
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(circle at 30% 40%, hsl(var(--primary)/0.4), transparent 60%), linear-gradient(135deg, hsl(var(--accent)/0.15), transparent)",
                  }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/20 border border-primary/40 backdrop-blur">
                    <Film className="h-7 w-7 text-primary" />
                  </div>
                  <span className="text-xs uppercase tracking-[0.25em] text-foreground/60 font-semibold">
                    Aftermovie · 16:9
                  </span>
                </div>
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-1">Reservado</p>
                    <p className="font-display font-bold text-lg text-foreground/90">Sua próxima produção</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Reels verticais */}
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 md:gap-5">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="relative rounded-2xl border border-border/40 bg-card overflow-hidden aspect-[9/16] lg:aspect-[9/12]"
                >
                  <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                      background:
                        i === 1
                          ? "linear-gradient(160deg, hsl(var(--primary)/0.35), hsl(var(--background)))"
                          : "linear-gradient(200deg, hsl(var(--accent)/0.3), hsl(var(--background)))",
                    }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Camera className="h-6 w-6 text-foreground/50 mb-2" />
                    <span className="text-[10px] uppercase tracking-wider text-foreground/50 font-semibold">
                      Reel {i}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {audiovisualCats.map((t) => (
              <span
                key={t}
                className="text-xs md:text-sm px-3 py-1.5 rounded-full bg-secondary/50 border border-border/40 text-foreground/75"
              >
                {t}
              </span>
            ))}
          </div>

          <div className="mt-8">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all"
            >
              <Video className="h-4 w-4" /> Solicitar produção
            </a>
          </div>
        </section>

        {/* ===== PORTFÓLIO ===== */}
        <section id="portfolio" className="border-t border-primary/10 bg-primary/[0.02]">
          <div className="mx-auto max-w-6xl px-4 md:px-6 py-16 md:py-24">
            <SectionEyebrow>Projetos próprios</SectionEyebrow>
            <h2 className="font-display font-black text-3xl md:text-5xl mb-4 max-w-3xl">
              Projetos que conectam tecnologia, conteúdo e experiência.
            </h2>
            <p className="text-foreground/70 mb-8 max-w-2xl text-base md:text-lg">
              Produtos do ecossistema Roxou desenvolvidos internamente.
            </p>

            <div className="flex flex-wrap gap-2 mb-8">
              {portfolioCats.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFilter(c)}
                  className={`text-xs md:text-sm px-4 py-2 rounded-full border font-semibold transition-all ${
                    filter === c
                      ? "bg-primary text-primary-foreground border-primary shadow-[0_0_18px_-4px_hsl(var(--primary)/0.6)]"
                      : "border-border/50 text-foreground/70 hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {filteredPortfolio.map((p) => {
                const Tag: React.ElementType = p.url ? "a" : "div";
                return (
                  <Tag
                    key={p.name}
                    {...(p.url ? { href: p.url, target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="group relative rounded-2xl border border-border/40 bg-card overflow-hidden hover:border-primary/50 transition-all block"
                  >
                    <div className="aspect-[16/10] relative overflow-hidden">
                      <div
                        aria-hidden
                        className="absolute inset-0"
                        style={{
                          background:
                            "radial-gradient(circle at 30% 30%, hsl(var(--primary)/0.35), transparent 55%), linear-gradient(135deg, hsl(var(--background)), hsl(var(--card)))",
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <img src={SYMBOL} alt="" aria-hidden width={80} height={80} className="opacity-40 group-hover:opacity-60 transition-opacity" />
                      </div>
                      <span className="absolute top-3 left-3 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-background/70 backdrop-blur border border-border/40 text-foreground/80 font-semibold">
                        {p.cat}
                      </span>
                    </div>
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-1.5">
                        <h3 className="font-display font-bold text-base md:text-lg">{p.name}</h3>
                        {p.url && <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />}
                      </div>
                      <p className="text-sm text-foreground/65 leading-relaxed">{p.desc}</p>
                    </div>
                  </Tag>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===== ECOSSISTEMA ===== */}
        <section id="ecossistema" className="mx-auto max-w-6xl px-4 md:px-6 py-16 md:py-24">
          <SectionEyebrow>Ecossistema</SectionEyebrow>
          <h2 className="font-display font-black text-3xl md:text-5xl mb-4 max-w-3xl">
            Uma marca, cinco plataformas conectadas.
          </h2>
          <p className="text-foreground/70 mb-10 md:mb-14 max-w-2xl text-base md:text-lg">
            Do descobrir ao operar — o ecossistema Roxou cobre todo o ciclo.
          </p>

          <div className="relative">
            {/* Centro */}
            <div className="lg:absolute lg:inset-0 lg:pointer-events-none hidden lg:flex items-center justify-center">
              <div className="pointer-events-auto relative">
                <div className="h-32 w-32 rounded-full bg-gradient-to-br from-primary via-primary to-accent p-[2px]">
                  <div className="h-full w-full rounded-full bg-background flex items-center justify-center">
                    <img src={SYMBOL} alt="Roxou" width={64} height={64} className="h-16 w-16" />
                  </div>
                </div>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {ecosystem.map((e, i) => {
                const Wrap: React.ElementType = e.url ? "a" : "div";
                const props = e.url ? { href: e.url, target: "_blank", rel: "noopener noreferrer" } : {};
                return (
                  <Wrap
                    key={e.name}
                    {...props}
                    className={`group relative rounded-2xl p-5 md:p-6 bg-card border border-border/40 hover:border-primary/50 transition-all block ${
                      i === 2 ? "lg:col-start-2" : ""
                    }`}
                  >
                    <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 border border-primary/25 text-primary mb-4">
                      <e.icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-display font-bold text-base md:text-lg mb-1">{e.name}</h3>
                    {e.url && (
                      <p className="text-[11px] text-primary/80 mb-2 truncate font-medium">
                        {e.url.replace("https://", "")}
                      </p>
                    )}
                    <p className="text-sm text-foreground/65 leading-relaxed">{e.desc}</p>
                  </Wrap>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===== PROCESSO ===== */}
        <section className="border-y border-primary/10 bg-primary/[0.02]">
          <div className="mx-auto max-w-6xl px-4 md:px-6 py-16 md:py-24">
            <SectionEyebrow>Processo</SectionEyebrow>
            <h2 className="font-display font-black text-3xl md:text-5xl mb-4 max-w-3xl">
              Da ideia à execução.
            </h2>
            <p className="text-foreground/70 mb-10 md:mb-14 max-w-2xl text-base md:text-lg">
              Um caminho claro, com entregas incrementais e visibilidade a cada etapa.
            </p>
            <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              {process.map((step, i) => (
                <li
                  key={step.title}
                  className="relative rounded-2xl border border-border/40 bg-card p-5 md:p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 text-primary">
                      <step.icon className="h-5 w-5" />
                    </div>
                    <span className="font-display font-black text-3xl text-primary/25">0{i + 1}</span>
                  </div>
                  <h3 className="font-display font-bold text-base md:text-lg mb-1">{step.title}</h3>
                  <p className="text-sm text-foreground/65 leading-relaxed">{step.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ===== CTA FINAL ===== */}
        <section id="contato" className="relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(600px circle at 50% 0%, hsl(var(--primary) / 0.25), transparent 60%)",
            }}
          />
          <div className="relative mx-auto max-w-4xl px-4 md:px-6 py-20 md:py-28 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] uppercase tracking-[0.25em] text-primary font-semibold">
                Vamos começar
              </span>
            </div>
            <h2 className="font-display font-black text-3xl md:text-5xl mb-5 leading-tight">
              Seu próximo projeto pode começar aqui.
            </h2>
            <p className="text-foreground/70 mb-10 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
              Conte o que você precisa. A Roxou conecta estratégia, tecnologia, mídia e produção
              para transformar a ideia em uma solução real.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm md:text-base hover:brightness-110 transition-all shadow-[0_0_32px_-6px_hsl(var(--primary)/0.7)]"
              >
                <Phone className="h-4 w-4" />
                Falar sobre meu projeto
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full border border-border/60 font-semibold hover:bg-secondary/60 hover:border-primary/40 transition-all"
              >
                <Instagram className="h-4 w-4" />
                @roxou.pp
              </a>
            </div>
            <div className="mt-10 inline-flex items-center gap-3 text-sm text-foreground/70">
              <div className="h-9 w-9 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-display font-black">
                F
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Fernando Henrique</p>
                <p className="text-xs text-foreground/60">CEO & Diretor Criativo</p>
              </div>
            </div>
            <p className="mt-6 text-sm text-foreground/70">
              <a href="tel:+5518997469865" className="hover:text-primary transition-colors">
                (18) 99746-9865
              </a>
              <span className="mx-2 text-foreground/30">·</span>
              <a href="mailto:contato@roxou.com.br" className="hover:text-primary transition-colors inline-flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> contato@roxou.com.br
              </a>
            </p>
          </div>
        </section>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-primary/10 bg-background">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8 md:gap-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <img src={SYMBOL} alt="Roxou" width={32} height={32} className="h-8 w-8" />
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display font-black tracking-tight text-lg">ROXOU</span>
                  <span className="text-[9px] uppercase tracking-[0.25em] text-primary/80 font-semibold">Media</span>
                </div>
              </div>
              <p className="text-sm text-foreground/60 max-w-sm leading-relaxed">
                Tecnologia • Mídia • Experiências. Desenvolvemos plataformas, produzimos conteúdo e
                conectamos marcas ao público certo — no interior de São Paulo.
              </p>
            </div>
            <div>
              <h4 className="font-display font-bold text-sm uppercase tracking-wider text-foreground/80 mb-3">
                Navegue
              </h4>
              <ul className="space-y-2 text-sm text-foreground/60">
                <li><a href="#servicos" className="hover:text-primary transition-colors">Serviços</a></li>
                <li><a href="#audiovisual" className="hover:text-primary transition-colors">Audiovisual</a></li>
                <li><a href="#ecossistema" className="hover:text-primary transition-colors">Ecossistema</a></li>
                <li><a href="#contato" className="hover:text-primary transition-colors">Contato</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-bold text-sm uppercase tracking-wider text-foreground/80 mb-3">
                Contato
              </h4>
              <ul className="space-y-2 text-sm text-foreground/60">
                <li>
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                </li>
                <li>
                  <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors inline-flex items-center gap-1.5">
                    <Instagram className="h-3.5 w-3.5" /> Instagram
                  </a>
                </li>
                <li>
                  <a href="https://roxou.com.br" className="hover:text-primary transition-colors">
                    roxou.com.br
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-foreground/50">
            <span>© {new Date().getFullYear()} Roxou — Tecnologia • Mídia • Experiências</span>
            <span>Presidente Prudente · SP</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 mb-4">
      <span className="h-px w-8 bg-primary/60" />
      <span className="text-[10px] md:text-xs uppercase tracking-[0.25em] text-primary font-semibold">
        {children}
      </span>
    </div>
  );
}
