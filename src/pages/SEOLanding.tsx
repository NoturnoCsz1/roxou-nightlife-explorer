import { useEffect, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import EventCard from "@/components/EventCard";
import type { SupabaseEvent } from "@/components/EventCard";
import BottomNav from "@/components/BottomNav";
import DesktopNav from "@/components/DesktopNav";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { usePageTracking } from "@/hooks/usePageTracking";
import { isTodaySP, isTomorrowSP, getWeekendRangeSP } from "@/lib/dateUtils";

/* ─── Landing page config ─── */
interface LandingConfig {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  heading: string;
  intro: string;
  filter: (e: SupabaseEvent) => boolean;
  faqItems?: { q: string; a: string }[];
  relatedLinks: { label: string; href: string }[];
  longIntro?: string[];
  sections?: { heading: string; body: string; filter?: (e: SupabaseEvent) => boolean }[];
  emitEventJsonLd?: boolean;
}

const CITY = "Presidente Prudente";

// ATENÇÃO: usa America/Sao_Paulo. Não trocar por getDay() local.
function isInWeekendSP(value: string): boolean {
  const { start, end } = getWeekendRangeSP();
  const t = new Date(value).getTime();
  return t >= new Date(start).getTime() && t < new Date(end).getTime();
}

const LANDING_CONFIGS: Record<string, LandingConfig> = {
  "eventos-hoje-em-presidente-prudente": {
    slug: "eventos-hoje-em-presidente-prudente",
    title: `Eventos Hoje em ${CITY}`,
    metaTitle: `Eventos Hoje em ${CITY} | ROXOU`,
    metaDescription: `Descubra todos os eventos, festas, baladas e shows acontecendo HOJE em ${CITY}. Atualizado em tempo real.`,
    heading: `🔥 Eventos Hoje em ${CITY}`,
    intro: `Confira o que rola hoje à noite em ${CITY}. Festas, baladas, shows ao vivo e bares — tudo num só lugar, atualizado em tempo real.`,
    filter: (e) => isTodaySP(new Date(e.date_time)),
    faqItems: [
      { q: `O que fazer hoje em ${CITY}?`, a: `Confira a lista completa de eventos, festas e baladas acontecendo hoje em ${CITY} aqui na ROXOU. Atualizamos diariamente com os melhores rolês.` },
      { q: `Qual balada abre hoje em ${CITY}?`, a: `Veja acima todos os eventos de balada e festas universitárias com data de hoje. Clique em cada evento para ver horário, local e como comprar ingresso.` },
      { q: `Tem show hoje em ${CITY}?`, a: `Sim! Filtramos shows ao vivo, pagode, sertanejo e mais. Confira a lista atualizada acima.` },
    ],
    relatedLinks: [
      { label: "Eventos amanhã", href: "/eventos-amanha-em-presidente-prudente" },
      { label: "Fim de semana", href: "/eventos-fim-de-semana-em-presidente-prudente" },
      { label: "Baladas", href: "/baladas-em-presidente-prudente" },
      { label: "Bares", href: "/bares-em-presidente-prudente" },
    ],
  },
  "eventos-amanha-em-presidente-prudente": {
    slug: "eventos-amanha-em-presidente-prudente",
    title: `Eventos Amanhã em ${CITY}`,
    metaTitle: `Eventos Amanhã em ${CITY} | ROXOU`,
    metaDescription: `Veja os eventos confirmados para amanhã em ${CITY}. Baladas, shows, bares e festas.`,
    heading: `📅 Eventos Amanhã em ${CITY}`,
    intro: `Planeje sua noite! Veja todos os eventos confirmados para amanhã em ${CITY}.`,
    filter: (e) => isTomorrowSP(new Date(e.date_time)),
    relatedLinks: [
      { label: "Eventos hoje", href: "/eventos-hoje-em-presidente-prudente" },
      { label: "Fim de semana", href: "/eventos-fim-de-semana-em-presidente-prudente" },
      { label: "Shows", href: "/shows-em-presidente-prudente" },
    ],
  },
  "eventos-fim-de-semana-em-presidente-prudente": {
    slug: "eventos-fim-de-semana-em-presidente-prudente",
    title: `Eventos no Fim de Semana em ${CITY}`,
    metaTitle: `Eventos Fim de Semana em ${CITY} | ROXOU`,
    metaDescription: `Agenda completa do fim de semana em ${CITY}. Festas, baladas, shows e bares no sábado e domingo.`,
    heading: `🎉 Fim de Semana em ${CITY}`,
    intro: `Os melhores eventos do fim de semana em ${CITY}. Sábado e domingo com festas, shows e baladas.`,
    filter: (e) => isInWeekendSP(e.date_time),
    faqItems: [
      { q: `O que fazer no fim de semana em ${CITY}?`, a: `Confira a agenda completa do sábado e domingo na ROXOU. Listamos baladas, shows, pagode, sertanejo e mais.` },
      { q: `Quais festas tem no sábado em ${CITY}?`, a: `Todos os eventos de sábado estão listados acima. Filtramos por categoria para facilitar sua escolha.` },
    ],
    relatedLinks: [
      { label: "Eventos hoje", href: "/eventos-hoje-em-presidente-prudente" },
      { label: "Baladas", href: "/baladas-em-presidente-prudente" },
      { label: "Shows", href: "/shows-em-presidente-prudente" },
      { label: "Sertanejo", href: "/sertanejo-em-presidente-prudente" },
    ],
  },
  "baladas-em-presidente-prudente": {
    slug: "baladas-em-presidente-prudente",
    title: `Baladas em ${CITY}`,
    metaTitle: `Baladas em ${CITY} — Festas e Noite | ROXOU`,
    metaDescription: `As melhores baladas e festas universitárias em ${CITY}. Veja a programação atualizada.`,
    heading: `🎧 Baladas em ${CITY}`,
    intro: `As melhores baladas e festas universitárias de ${CITY}. Eletrônica, funk, sertanejo universitário e mais.`,
    filter: (e) => e.category === "balada" || e.category === "eletronica",
    faqItems: [
      { q: `Quais são as melhores baladas de ${CITY}?`, a: `${CITY} tem diversas opções de baladas e festas universitárias. Confira a lista atualizada acima com os próximos eventos.` },
      { q: `Qual balada tem hoje em ${CITY}?`, a: `Veja os eventos de balada marcados para hoje na lista acima. Para ver todos os eventos de hoje, acesse nossa página de eventos de hoje.` },
    ],
    relatedLinks: [
      { label: "Eventos hoje", href: "/eventos-hoje-em-presidente-prudente" },
      { label: "Funk", href: "/funk-em-presidente-prudente" },
      { label: "Sertanejo", href: "/sertanejo-em-presidente-prudente" },
      { label: "Bares", href: "/bares-em-presidente-prudente" },
    ],
  },
  "bares-em-presidente-prudente": {
    slug: "bares-em-presidente-prudente",
    title: `Bares em ${CITY}`,
    metaTitle: `Bares em ${CITY} — Happy Hour | ROXOU`,
    metaDescription: `Descubra os melhores bares de ${CITY}. Eventos, happy hours e programação ao vivo.`,
    heading: `🍻 Bares em ${CITY}`,
    intro: `Os melhores bares de ${CITY} com eventos, happy hours e música ao vivo. Encontre onde curtir hoje.`,
    filter: (e) => e.category === "bar",
    faqItems: [
      { q: `Quais são os melhores bares de ${CITY}?`, a: `Confira nossa seleção de bares com eventos acontecendo. Cada bar tem sua página com endereço, Instagram e programação.` },
    ],
    relatedLinks: [
      { label: "Eventos hoje", href: "/eventos-hoje-em-presidente-prudente" },
      { label: "Baladas", href: "/baladas-em-presidente-prudente" },
      { label: "Shows", href: "/shows-em-presidente-prudente" },
      { label: "Pagode", href: "/pagode-em-presidente-prudente" },
    ],
  },
  "shows-em-presidente-prudente": {
    slug: "shows-em-presidente-prudente",
    title: `Shows em ${CITY}`,
    metaTitle: `Shows ao Vivo em ${CITY} | ROXOU`,
    metaDescription: `Agenda de shows ao vivo em ${CITY}. Rock, pop, MPB, sertanejo e mais.`,
    heading: `🎤 Shows em ${CITY}`,
    intro: `Shows ao vivo em ${CITY}: rock, pop, MPB, sertanejo e muito mais. Confira a programação atualizada.`,
    filter: (e) => e.category === "show",
    relatedLinks: [
      { label: "Eventos hoje", href: "/eventos-hoje-em-presidente-prudente" },
      { label: "Sertanejo", href: "/sertanejo-em-presidente-prudente" },
      { label: "Pagode", href: "/pagode-em-presidente-prudente" },
      { label: "Baladas", href: "/baladas-em-presidente-prudente" },
    ],
  },
  "pagode-em-presidente-prudente": {
    slug: "pagode-em-presidente-prudente",
    title: `Pagode em ${CITY} Hoje`,
    metaTitle: `Pagode em ${CITY} Hoje | Agenda de Pagodes, Rodas de Samba e Eventos | Roxou`,
    metaDescription: `Veja onde tem pagode em ${CITY} hoje. Agenda atualizada com rodas de samba, bares com pagode ao vivo, eventos, shows e festas em ${CITY} e região.`,
    heading: `Pagode em ${CITY} Hoje`,
    intro: `A agenda definitiva de pagode em ${CITY}: rodas de samba, bares com pagode ao vivo, eventos e shows atualizados em tempo real.`,
    filter: (e) => {
      const hay = `${e.title} ${e.description ?? ""} ${e.sub_category ?? ""} ${e.category ?? ""}`.toLowerCase();
      return /pagode|samba|roda de samba|sambar/.test(hay);
    },
    emitEventJsonLd: true,
    longIntro: [
      `Procurando pagode em ${CITY} hoje? Você está no lugar certo. A Roxou reúne, em uma única agenda, todos os eventos de pagode em Prudente — de rodas de samba intimistas em bares do centro até grandes shows com bandas locais e nacionais. Tudo o que rola de música ao vivo em Prudente com batuque, cavaco e pandeiro fica aqui, atualizado em tempo real.`,
      `Nossa missão é simples: se tem pagode em ${CITY} hoje, a Roxou mostra. Listamos os bares com pagode em ${CITY} que abrem durante a semana, as casas que fazem roda de samba em ${CITY} aos sábados e os principais eventos de pagode em ${CITY} para o fim de semana e datas comemorativas. Você confere horário, local, line-up e link direto para o evento sem precisar caçar story por story no Instagram.`,
      `Sempre que possível, indicamos também opções de pagode em Prudente para diferentes públicos: do happy hour com samba raiz ao pagode 90 que toma conta da noite, passando por encontros de samba de roda, sambas autorais e shows com bandas convidadas de cidades vizinhas. Se você curte música ao vivo em Prudente, esta página é seu ponto de partida — salve nos favoritos e volte sempre que bater aquela vontade de pagodear.`,
    ],
    sections: [
      {
        heading: `Onde tem pagode hoje em ${CITY}?`,
        body: `Confira agora os eventos de pagode em ${CITY} marcados para hoje. Mostramos apenas o que está acontecendo no dia, com horário e local confirmados. Se nenhum evento aparecer aqui, role para baixo e veja os próximos pagodes da semana.`,
        filter: (e) => isTodaySP(new Date(e.date_time)),
      },
      {
        heading: `Agenda de Pagodes em ${CITY}`,
        body: `Agenda completa de pagode em ${CITY} e região: rodas de samba, shows, encontros e festas autorais. Tudo organizado por data, do mais próximo ao mais distante.`,
      },
      {
        heading: `Bares com pagode ao vivo em ${CITY}`,
        body: `Veja os bares com pagode em ${CITY} que estão com programação ao vivo nos próximos dias. Cada evento traz o endereço do bar, o Instagram da casa e o link para garantir presença.`,
      },
    ],
    faqItems: [
      {
        q: `Onde tem pagode hoje em ${CITY}?`,
        a: `Os pagodes em ${CITY} marcados para hoje aparecem no topo desta página. A Roxou atualiza a agenda em tempo real conforme bares e produtores confirmam a programação. Se nenhum evento de hoje for listado, significa que ainda não há roda de samba ou pagode ao vivo confirmado para a data — vale acompanhar a página de eventos da semana.`,
      },
      {
        q: `Quais bares têm pagode em ${CITY}?`,
        a: `Vários bares de ${CITY} mantêm programação fixa ou rotativa de pagode e samba ao vivo. Listamos aqui os bares com pagode em ${CITY} que estão com eventos confirmados, com endereço, horário e perfil no Instagram para você conferir o ambiente antes de ir.`,
      },
      {
        q: `Como saber os próximos eventos de pagode em Prudente?`,
        a: `Basta acompanhar esta página: a agenda de eventos de pagode em ${CITY} é atualizada diariamente com novas rodas de samba, shows e festas. Você também pode salvar a Roxou na tela inicial do celular para receber a programação completa de música ao vivo em Prudente.`,
      },
    ],
    relatedLinks: [
      { label: "Eventos hoje", href: "/eventos-hoje-em-presidente-prudente" },
      { label: "Eventos fim de semana", href: "/eventos-fim-de-semana-em-presidente-prudente" },
      { label: "Sertanejo", href: "/sertanejo-em-presidente-prudente" },
      { label: "Shows", href: "/shows-em-presidente-prudente" },
      { label: "Bares", href: "/bares-em-presidente-prudente" },
    ],
  },
  "funk-em-presidente-prudente": {
    slug: "funk-em-presidente-prudente",
    title: `Funk em ${CITY}`,
    metaTitle: `Funk em ${CITY} — Baile Funk e Festas | ROXOU`,
    metaDescription: `Festas e bailes funk em ${CITY}. Confira a programação atualizada.`,
    heading: `🔊 Funk em ${CITY}`,
    intro: `Baile funk, festas e eventos com funk em ${CITY}. Confira onde curtir.`,
    filter: (e) => e.category === "funk",
    relatedLinks: [
      { label: "Baladas", href: "/baladas-em-presidente-prudente" },
      { label: "Pagode", href: "/pagode-em-presidente-prudente" },
      { label: "Eventos hoje", href: "/eventos-hoje-em-presidente-prudente" },
    ],
  },
  "sertanejo-em-presidente-prudente": {
    slug: "sertanejo-em-presidente-prudente",
    title: `Sertanejo em ${CITY}`,
    metaTitle: `Sertanejo em ${CITY} — Shows e Festas | ROXOU`,
    metaDescription: `Shows de sertanejo e sertanejo universitário em ${CITY}. Veja a programação.`,
    heading: `🤠 Sertanejo em ${CITY}`,
    intro: `Os melhores eventos de sertanejo e sertanejo universitário em ${CITY}. Shows ao vivo e festas.`,
    filter: (e) => e.category === "sertanejo",
    relatedLinks: [
      { label: "Shows", href: "/shows-em-presidente-prudente" },
      { label: "Pagode", href: "/pagode-em-presidente-prudente" },
      { label: "Baladas", href: "/baladas-em-presidente-prudente" },
      { label: "Eventos hoje", href: "/eventos-hoje-em-presidente-prudente" },
    ],
  },
};

export const SEO_LANDING_SLUGS = Object.keys(LANDING_CONFIGS);

const SEOLanding = () => {
  usePageTracking();
  const { landingSlug } = useParams<{ landingSlug: string }>();
  const config = landingSlug ? LANDING_CONFIGS[landingSlug] : undefined;

  const [events, setEvents] = useState<SupabaseEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("events")
      .select("id, title, slug, description, date_time, category, sub_category, venue_name, address, instagram, image_url, featured, status, partner_id")
      .eq("status", "published")
      .gte("date_time", new Date().toISOString())
      .order("date_time", { ascending: true })
      .then(({ data }) => {
        setEvents(data || []);
        setLoading(false);
      });
  }, []);

  if (!config) {
    return <Navigate to="/" replace />;
  }

  const filtered = events.filter(config.filter);

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: config.title,
    description: config.metaDescription,
    numberOfItems: filtered.length,
    itemListElement: filtered.slice(0, 20).map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://roxou.com.br/evento/${e.slug}`,
      name: e.title,
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ROXOU", item: "https://roxou.com.br" },
      { "@type": "ListItem", position: 2, name: config.title, item: `https://roxou.com.br/${config.slug}` },
    ],
  };

  const faqLd = config.faqItems
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: config.faqItems.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <SEO
        title={config.metaTitle}
        description={config.metaDescription}
        canonical={`https://roxou.com.br/${config.slug}`}
        jsonLd={jsonLd}
      />
      {/* Extra structured data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}

      <DesktopNav />

      {/* Breadcrumb */}
      <nav className="mx-auto max-w-lg md:max-w-6xl px-4 md:px-6 pt-4 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5">
          <li><Link to="/" className="hover:text-primary transition-colors">ROXOU</Link></li>
          <li>/</li>
          <li className="text-foreground font-medium">{config.title}</li>
        </ol>
      </nav>

      <header className="mx-auto max-w-lg md:max-w-6xl px-4 md:px-6 pt-4 pb-2 md:pt-6">
        <h1 className="text-2xl md:text-3xl font-black font-display text-foreground leading-tight">
          {config.heading}
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
          {config.intro}
        </p>
      </header>

      <main className="mx-auto max-w-lg md:max-w-6xl px-4 md:px-6 mt-4 md:mt-6 space-y-8">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-12">Carregando eventos...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">Nenhum evento encontrado nesta categoria no momento.</p>
            <Link to="/" className="text-primary text-sm font-semibold mt-2 inline-block">Ver todos os eventos →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {filtered.map((e, i) => (
              <EventCard key={e.id} event={e} index={i} sponsored={e.featured} />
            ))}
          </div>
        )}

        {/* FAQ section */}
        {config.faqItems && config.faqItems.length > 0 && (
          <section className="max-w-2xl">
            <h2 className="text-lg font-bold font-display text-foreground mb-4">Perguntas Frequentes</h2>
            <div className="space-y-4">
              {config.faqItems.map((f, i) => (
                <details key={i} className="group rounded-xl bg-card p-4 card-shadow">
                  <summary className="cursor-pointer text-sm font-semibold text-foreground list-none flex items-center justify-between">
                    {f.q}
                    <span className="text-muted-foreground group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Internal links */}
        <section>
          <h2 className="text-sm font-bold text-foreground mb-3">Veja também</h2>
          <div className="flex flex-wrap gap-2">
            {config.relatedLinks.map((l) => (
              <Link
                key={l.href}
                to={l.href}
                className="rounded-xl bg-card px-4 py-2.5 text-xs font-semibold text-foreground card-shadow hover:text-primary transition-colors"
              >
                {l.label}
              </Link>
            ))}
            <Link
              to="/"
              className="rounded-xl bg-card px-4 py-2.5 text-xs font-semibold text-foreground card-shadow hover:text-primary transition-colors"
            >
              Todos os eventos
            </Link>
          </div>
        </section>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
};

export default SEOLanding;
