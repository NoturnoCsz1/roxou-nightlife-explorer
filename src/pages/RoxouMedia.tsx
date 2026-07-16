import { useEffect } from "react";
import roxouSymbol from "@/assets/roxou-symbol.png.asset.json";
import roxouLogo from "@/assets/roxou-logo.png.asset.json";

/**
 * Roxou Media — Site institucional/comercial servido em midia.roxou.com.br
 * (também acessível via /midia). Single-page, leve, mobile-first, sem
 * dependências pesadas nem AdSense.
 */

const WHATSAPP_URL = "https://wa.me/5518997469865?text=Ol%C3%A1%20Roxou%2C%20quero%20um%20or%C3%A7amento.";
const INSTAGRAM_URL = "https://instagram.com/roxou.pp";
const CANONICAL = "https://midia.roxou.com.br";

const services = [
  {
    title: "Tecnologia",
    desc: "Sites institucionais, landing pages, plataformas digitais, sistemas web, integrações, automação, reservas, gestão e ferramentas sob demanda.",
  },
  {
    title: "Marketing & Mídia",
    desc: "Marketing digital, redes sociais, campanhas, conteúdo, publicidade, divulgação de eventos, SEO, conteúdo patrocinado e divulgação no ecossistema Roxou.",
  },
  {
    title: "Audiovisual",
    desc: "Cobertura de eventos, filmagem, aftermovies, reels, vídeos institucionais, conteúdo social, casamentos, shows, entrevistas, bastidores e edição.",
  },
  {
    title: "Soluções para Eventos & Empresas",
    desc: "Divulgação, listas VIP, convites, reservas, credenciamento, check-in via QR Code, landing pages e ferramentas para parceiros.",
  },
];

const ecosystem = [
  { name: "Roxou", url: "https://roxou.com.br", desc: "Descoberta de lugares, eventos e experiências." },
  { name: "Partner Pro", url: "https://parceiro.roxou.com.br", desc: "Ferramentas para empresas, reservas, VIP e gestão." },
  { name: "Reserva Roxou", url: "https://reserva.roxou.com.br", desc: "Reservas e atendimento." },
  { name: "DriverDash Roxou", url: null, desc: "Gestão para motoristas." },
  { name: "Roxou Media", url: "https://midia.roxou.com.br", desc: "Tecnologia, mídia, audiovisual e experiências." },
];

const audiovisualTags = [
  "Eventos",
  "Shows",
  "Casamentos",
  "Festas",
  "Aftermovies",
  "Institucionais",
  "Conteúdo social",
  "Cobertura em tempo real",
];

export default function RoxouMedia() {
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
      "Soluções em desenvolvimento de sites e plataformas, marketing digital, produção audiovisual, cobertura de eventos e ferramentas para empresas e eventos.";
    setMeta("name", "description", desc);
    setMeta("property", "og:title", "Roxou | Tecnologia, Mídia, Audiovisual e Experiências");
    setMeta("property", "og:description", desc);
    setMeta("property", "og:url", CANONICAL);
    setMeta("property", "og:type", "website");
    setMeta("name", "twitter:card", "summary_large_image");

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
      logo: `${CANONICAL}/favicon.png`,
      sameAs: [INSTAGRAM_URL],
      contactPoint: [
        { "@type": "ContactPoint", telephone: "+5518997469865", contactType: "sales", areaServed: "BR" },
      ],
    });
    document.head.appendChild(ld);
    return () => {
      document.head.removeChild(ld);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-body">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border/30">
        <div className="mx-auto max-w-6xl px-4 md:px-6 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <img src={roxouMark} alt="Roxou" width={28} height={28} className="h-7 w-7" />
            <span className="font-display font-black tracking-tight text-lg">ROXOU</span>
            <span className="hidden sm:inline text-[10px] uppercase tracking-[0.2em] text-muted-foreground ml-2">
              Media
            </span>
          </a>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs md:text-sm px-3 md:px-4 py-2 rounded-full gradient-primary text-primary-foreground font-semibold public-cta-glow"
          >
            Orçamento
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(600px circle at 20% 10%, hsl(var(--primary) / 0.35), transparent 60%), radial-gradient(500px circle at 90% 80%, hsl(var(--accent) / 0.25), transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 md:px-6 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <img
              src={roxouMark}
              alt="Roxou"
              width={72}
              height={72}
              className="h-16 w-16 md:h-20 md:w-20 mb-6"
            />
            <p className="text-[11px] md:text-xs uppercase tracking-[0.3em] text-primary mb-4 font-semibold">
              Tecnologia • Mídia • Experiências
            </p>
            <h1 className="font-display font-black text-3xl sm:text-4xl md:text-5xl leading-[1.1] mb-5">
              Transformamos ideias em experiências que conectam pessoas, marcas e eventos.
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-xl">
              Soluções completas em tecnologia, mídia, audiovisual e experiências para empresas, eventos e negócios.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-full gradient-primary text-primary-foreground font-semibold text-sm md:text-base public-cta-glow"
              >
                Solicitar orçamento
              </a>
              <a
                href="#servicos"
                className="px-6 py-3 rounded-full border border-border/60 text-foreground font-semibold text-sm md:text-base hover:bg-secondary/60 transition-colors"
              >
                Conhecer nossos serviços
              </a>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="relative aspect-square max-w-md ml-auto glass rounded-3xl border border-primary/20 p-8 flex items-center justify-center">
              <img src={roxouMark} alt="" aria-hidden width={280} height={280} className="opacity-90" />
              <div className="absolute inset-0 rounded-3xl neon-border pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* Serviços */}
      <section id="servicos" className="mx-auto max-w-6xl px-4 md:px-6 py-16 md:py-20">
        <h2 className="font-display font-black text-2xl md:text-4xl mb-3">Nossos pilares</h2>
        <p className="text-muted-foreground mb-10 max-w-2xl">
          Quatro frentes integradas para levar sua marca, seu evento ou seu negócio ao próximo nível.
        </p>
        <div className="grid sm:grid-cols-2 gap-4 md:gap-5">
          {services.map((s) => (
            <article
              key={s.title}
              className="rounded-2xl p-6 bg-card border border-border/40 hover:border-primary/40 transition-colors"
            >
              <h3 className="font-display font-bold text-lg md:text-xl mb-2 text-foreground">{s.title}</h3>
              <p className="text-sm md:text-[15px] text-muted-foreground leading-relaxed">{s.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Audiovisual */}
      <section className="mx-auto max-w-6xl px-4 md:px-6 py-16 md:py-20 border-t border-border/30">
        <h2 className="font-display font-black text-2xl md:text-4xl mb-3">Histórias que merecem ser lembradas.</h2>
        <p className="text-muted-foreground mb-8 max-w-2xl">
          Do primeiro frame ao resultado final, transformamos momentos, marcas e eventos em conteúdo que gera conexão.
        </p>
        <div className="flex flex-wrap gap-2">
          {audiovisualTags.map((t) => (
            <span
              key={t}
              className="text-xs md:text-sm px-3 py-1.5 rounded-full bg-secondary/60 border border-border/40 text-secondary-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* Ecossistema */}
      <section className="mx-auto max-w-6xl px-4 md:px-6 py-16 md:py-20 border-t border-border/30">
        <h2 className="font-display font-black text-2xl md:text-4xl mb-3">O ecossistema Roxou</h2>
        <p className="text-muted-foreground mb-10 max-w-2xl">
          Plataformas conectadas para descoberta, operação e experiência.
        </p>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {ecosystem.map((e) => {
            const Wrap: React.ElementType = e.url ? "a" : "div";
            const props = e.url ? { href: e.url, target: "_blank", rel: "noopener noreferrer" } : {};
            return (
              <Wrap
                key={e.name}
                {...props}
                className="block rounded-2xl p-5 bg-card border border-border/40 hover:border-primary/50 transition-colors"
              >
                <h3 className="font-display font-bold text-base md:text-lg text-foreground">{e.name}</h3>
                {e.url && <p className="text-[11px] text-primary/80 mb-2 truncate">{e.url.replace("https://", "")}</p>}
                <p className="text-sm text-muted-foreground leading-relaxed">{e.desc}</p>
              </Wrap>
            );
          })}
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-4xl px-4 md:px-6 py-20 text-center">
        <h2 className="font-display font-black text-2xl md:text-4xl mb-4">
          Vamos criar algo extraordinário juntos?
        </h2>
        <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
          Conte sua ideia. A Roxou transforma em projeto, conteúdo, tecnologia ou experiência.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-full gradient-primary text-primary-foreground font-semibold public-cta-glow"
          >
            WhatsApp • (18) 99746-9865
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-full border border-border/60 font-semibold hover:bg-secondary/60 transition-colors"
          >
            @roxou.pp
          </a>
        </div>
        <p className="mt-8 text-xs text-muted-foreground/70">
          Fernando Henrique — CEO & Diretor Criativo
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8">
        <div className="mx-auto max-w-6xl px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src={roxouMark} alt="" aria-hidden width={20} height={20} className="h-5 w-5" />
            <span>© {new Date().getFullYear()} Roxou — Tecnologia • Mídia • Experiências</span>
          </div>
          <a href="https://roxou.com.br" className="hover:text-primary transition-colors">
            roxou.com.br
          </a>
        </div>
      </footer>
    </div>
  );
}
