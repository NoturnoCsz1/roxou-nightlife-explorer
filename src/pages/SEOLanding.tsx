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
interface EvergreenSection {
  heading: string;
  body: string[];
}
interface LandingEvergreen {
  context: EvergreenSection;
  places: EvergreenSection;
  howToFollow: EvergreenSection;
  finalCta: EvergreenSection;
}
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
  evergreen?: LandingEvergreen;
}

/** Default evergreen block used as fallback when a config does not define its own. */
const DEFAULT_EVERGREEN = (genre: string): LandingEvergreen => ({
  context: {
    heading: `${genre} em Presidente Prudente: história e contexto`,
    body: [
      `${genre} faz parte do dia a dia cultural de Presidente Prudente. A cidade, polo do Oeste Paulista, sempre teve uma cena viva de bares, casas noturnas e eventos que abraçam diferentes estilos, e ${genre.toLowerCase()} ocupa um espaço importante nessa rotina, atraindo público universitário, famílias e turistas das cidades vizinhas.`,
      `Ao longo dos anos, produtoras locais, casas noturnas e bares passaram a investir em programações com ${genre.toLowerCase()}, criando uma agenda regular de eventos. A Roxou nasceu para organizar essa cena em um só lugar: tudo o que rola na cidade, com horários, locais e link direto para o evento.`,
    ],
  },
  places: {
    heading: `Onde costuma ter ${genre.toLowerCase()} em Presidente Prudente`,
    body: [
      `Os eventos de ${genre.toLowerCase()} em Presidente Prudente acontecem em diferentes tipos de espaço: bares com música ao vivo no centro da cidade, casas noturnas com pista, restaurantes e espaços de eventos maiores para shows e festas com público regional.`,
      `Por isso a Roxou agrega todos esses formatos numa mesma agenda — você encontra desde happy hour intimista até eventos para milhares de pessoas, sempre com link para conferir o local, o Instagram da casa e como garantir presença.`,
    ],
  },
  howToFollow: {
    heading: `Como acompanhar a agenda de ${genre.toLowerCase()} pela Roxou`,
    body: [
      `A agenda da Roxou é atualizada todos os dias com base nas confirmações de produtoras, bares e casas noturnas de Presidente Prudente e região. Sempre que um novo evento de ${genre.toLowerCase()} é divulgado, ele aparece nesta página com data, horário e local.`,
      `Você pode salvar a Roxou na tela inicial do celular para acesso rápido (funciona como app), seguir o nosso Instagram para alertas e voltar a esta página sempre que quiser saber o que fazer em Presidente Prudente hoje.`,
    ],
  },
  finalCta: {
    heading: `Veja a agenda completa de Presidente Prudente`,
    body: [
      `Não encontrou o evento de ${genre.toLowerCase()} ideal para hoje? Sem problema — a Roxou tem a agenda completa de Presidente Prudente, com baladas, bares, shows, futebol ao vivo e muito mais. Clique no botão abaixo e descubra o que rola na cidade nesta semana.`,
    ],
  },
});

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
      {
        heading: `Próximos eventos de pagode em ${CITY}`,
        body: `Todos os próximos eventos de pagode em ${CITY} confirmados na Roxou, em ordem cronológica. Rodas de samba, shows e festas autorais.`,
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
    title: `Funk em ${CITY} Hoje`,
    metaTitle: `Funk em ${CITY} Hoje | Bailes, Festas e Eventos de Funk | Roxou`,
    metaDescription: `Veja onde tem funk em ${CITY} hoje. Encontre bailes, festas universitárias, baladas, eventos de funk e música ao vivo em ${CITY} e região.`,
    heading: `Funk em ${CITY} Hoje`,
    intro: `A agenda definitiva de funk em ${CITY}: bailes, festas universitárias, baladas e eventos atualizados em tempo real.`,
    filter: (e) => {
      const hay = `${e.title} ${e.description ?? ""} ${e.sub_category ?? ""} ${e.category ?? ""}`.toLowerCase();
      return /funk|baile|universit[áa]ri|balada/.test(hay);
    },
    emitEventJsonLd: true,
    longIntro: [
      `Quer saber onde tem funk em ${CITY} hoje? A Roxou reúne em uma agenda única todos os bailes funk em Prudente, festas universitárias em Prudente, baladas e eventos com pista de funk — de open bar com 150 BPM a baile de favela com MCs locais e nacionais. Tudo o que rola de funk em Prudente fica aqui, organizado por data, horário e local, atualizado em tempo real conforme produtoras e casas noturnas confirmam a programação.`,
      `Nossa missão é simples: se tem funk em ${CITY} hoje, a Roxou mostra. Listamos as baladas em ${CITY} que tocam funk durante a semana, as festas universitárias em Prudente que acontecem nas quintas e os principais eventos de funk em ${CITY} para o fim de semana. Quer saber o que fazer em ${CITY} hoje? Esta página resolve — sem precisar caçar story por story no Instagram, com link direto para garantir presença.`,
      `Mostramos também opções de funk em Prudente para diferentes perfis: do baile funk de rua à festa universitária com line-up de DJs, passando por baladas premium e eventos com MC convidado. Salve a Roxou na tela inicial do celular e volte sempre que bater vontade de pista, grave e 150.`,
    ],
    sections: [
      {
        heading: `Onde tem funk hoje em ${CITY}?`,
        body: `Confira agora os eventos de funk em ${CITY} marcados para hoje. Mostramos apenas o que está rolando no dia, com horário e local confirmados. Se nada aparecer aqui, role para baixo e veja a agenda dos próximos dias.`,
        filter: (e) => isTodaySP(new Date(e.date_time)),
      },
      {
        heading: `Agenda de Funk em ${CITY}`,
        body: `Agenda completa de funk em ${CITY} e região: bailes, festas universitárias, baladas e eventos com pista de funk. Tudo organizado por data, do mais próximo ao mais distante.`,
      },
      {
        heading: `Baladas e festas com funk em ${CITY}`,
        body: `Veja as baladas em ${CITY} e festas universitárias em Prudente que estão com programação de funk confirmada nos próximos dias. Cada evento traz endereço, perfil no Instagram e link direto para ingresso.`,
      },
    ],
    faqItems: [
      {
        q: `Onde tem funk hoje em ${CITY}?`,
        a: `Os eventos de funk em ${CITY} marcados para hoje aparecem no topo desta página. A Roxou atualiza a agenda em tempo real conforme baladas, produtoras e bares confirmam a programação. Se nenhum evento de hoje for listado, ainda não há baile funk ou festa universitária em Prudente confirmada para a data — vale acompanhar a agenda da semana.`,
      },
      {
        q: `Quais baladas tocam funk em ${CITY}?`,
        a: `Diversas baladas em ${CITY} mantêm pista de funk fixa ou alternada com outros estilos. Listamos aqui as casas e produtoras com eventos de funk em ${CITY} confirmados, com endereço, horário e Instagram para você conferir o ambiente antes de ir.`,
      },
      {
        q: `Como saber os próximos eventos de funk em Prudente?`,
        a: `Basta acompanhar esta página: a agenda de funk em Prudente é atualizada diariamente com novos bailes, festas universitárias e baladas. Você também pode salvar a Roxou na tela inicial do celular para acessar rápido sempre que quiser saber o que fazer em ${CITY} hoje.`,
      },
    ],
    relatedLinks: [
      { label: "Eventos hoje", href: "/eventos-hoje-em-presidente-prudente" },
      { label: "Baladas", href: "/baladas-em-presidente-prudente" },
      { label: "Sertanejo", href: "/sertanejo-em-presidente-prudente" },
      { label: "Pagode", href: "/pagode-em-presidente-prudente" },
      { label: "Shows", href: "/shows-em-presidente-prudente" },
    ],
  },
  "sertanejo-em-presidente-prudente": {
    slug: "sertanejo-em-presidente-prudente",
    title: `Sertanejo em ${CITY} Hoje`,
    metaTitle: `Sertanejo em ${CITY} Hoje | Shows, Bares e Eventos Sertanejos | Roxou`,
    metaDescription: `Veja onde tem sertanejo em ${CITY} hoje. Descubra bares, shows, festas e eventos sertanejos atualizados diariamente em ${CITY} e região.`,
    heading: `Sertanejo em ${CITY} Hoje`,
    intro: `A agenda definitiva de sertanejo em ${CITY}: shows ao vivo, bares com música sertaneja, festas universitárias e eventos atualizados em tempo real.`,
    filter: (e) => {
      const hay = `${e.title} ${e.description ?? ""} ${e.sub_category ?? ""} ${e.category ?? ""}`.toLowerCase();
      return /sertanej|moda de viola|viola caipira|caipira|m[uú]sica ao vivo/.test(hay);
    },
    emitEventJsonLd: true,
    longIntro: [
      `Procurando sertanejo em ${CITY} hoje? A Roxou reúne em uma única agenda todos os shows sertanejos em ${CITY}, bares sertanejos em Prudente e festas com pista de sertanejo universitário — do raiz com viola caipira ao sertanejo pop com line-up de duplas nacionais. Tudo o que rola de sertanejo em Prudente fica aqui, organizado por data, horário e local, atualizado em tempo real.`,
      `Nossa missão é direta: se tem sertanejo em ${CITY} hoje, a Roxou mostra. Listamos os bares sertanejos em Prudente que abrem com música ao vivo durante a semana, as casas que recebem duplas convidadas aos fins de semana e os grandes shows sertanejos em ${CITY} para datas comemorativas. Quer saber o que fazer em ${CITY} hoje? Esta página resolve — com link direto para garantir presença e sem precisar caçar story por story no Instagram.`,
      `Indicamos também opções de sertanejo em Prudente para diferentes públicos: do happy hour com sertanejo raiz à balada universitária com sertanejo pop, passando por shows intimistas, eventos autorais e grandes festivais. Se você curte música ao vivo em Prudente, esta é a sua página — salve nos favoritos e volte sempre que bater vontade de chapéu, viola e dupla cantando junto.`,
    ],
    sections: [
      {
        heading: `Onde tem sertanejo hoje em ${CITY}?`,
        body: `Confira agora os eventos sertanejos em ${CITY} marcados para hoje. Mostramos apenas o que está rolando no dia, com horário e local confirmados. Se nada aparecer aqui, veja a agenda dos próximos dias logo abaixo.`,
        filter: (e) => isTodaySP(new Date(e.date_time)),
      },
      {
        heading: `Agenda de Sertanejo em ${CITY}`,
        body: `Agenda completa de sertanejo em ${CITY} e região: shows ao vivo, festas universitárias, bares com música sertaneja e eventos autorais. Tudo organizado por data, do mais próximo ao mais distante.`,
      },
      {
        heading: `Bares com música sertaneja em ${CITY}`,
        body: `Veja os bares sertanejos em Prudente com programação ao vivo confirmada nos próximos dias. Cada evento traz endereço, perfil no Instagram da casa e link direto para reservar mesa ou comprar ingresso.`,
      },
      {
        heading: `Próximos shows sertanejos em ${CITY}`,
        body: `Os próximos shows sertanejos em ${CITY} confirmados na Roxou aparecem aqui, em ordem cronológica. Duplas locais, regionais e nacionais — tudo no mesmo lugar.`,
      },
    ],
    faqItems: [
      {
        q: `Onde tem sertanejo hoje em ${CITY}?`,
        a: `Os eventos sertanejos em ${CITY} marcados para hoje aparecem no topo desta página. A Roxou atualiza a agenda em tempo real conforme bares, produtoras e casas noturnas confirmam a programação. Se nenhum evento de hoje for listado, ainda não há show sertanejo em ${CITY} ou música ao vivo em Prudente confirmada para a data.`,
      },
      {
        q: `Quais bares têm música sertaneja em ${CITY}?`,
        a: `Vários bares sertanejos em Prudente mantêm programação fixa ou rotativa com duplas ao vivo. Listamos aqui os bares e casas com eventos sertanejos em ${CITY} confirmados, com endereço, horário e Instagram para você conferir o ambiente antes de ir.`,
      },
      {
        q: `Como saber os próximos shows sertanejos em Prudente?`,
        a: `Basta acompanhar esta página: a agenda de sertanejo em Prudente é atualizada diariamente com novos shows, festas e eventos. Você também pode salvar a Roxou na tela inicial do celular para acessar rápido sempre que quiser saber o que fazer em ${CITY} hoje.`,
      },
    ],
    relatedLinks: [
      { label: "Eventos hoje", href: "/eventos-hoje-em-presidente-prudente" },
      { label: "Shows", href: "/shows-em-presidente-prudente" },
      { label: "Pagode", href: "/pagode-em-presidente-prudente" },
      { label: "Funk", href: "/funk-em-presidente-prudente" },
      { label: "Bares", href: "/bares-em-presidente-prudente" },
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

  const canonicalUrl = `https://roxou.com.br/${config.slug}`;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: config.title,
    description: config.metaDescription,
    url: canonicalUrl,
    inLanguage: "pt-BR",
    about: { "@type": "Thing", name: "Pagode e samba em Presidente Prudente" },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: filtered.length,
      itemListElement: filtered.slice(0, 20).map((e, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://roxou.com.br/evento/${e.slug}`,
        name: e.title,
      })),
    },
  };

  const eventLd = config.emitEventJsonLd
    ? filtered.slice(0, 10).map((e) => ({
        "@context": "https://schema.org",
        "@type": "Event",
        name: e.title,
        startDate: e.date_time,
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: {
          "@type": "Place",
          name: e.venue_name || CITY,
          address: e.address || `${CITY}, SP, Brasil`,
        },
        ...(e.image_url ? { image: e.image_url } : {}),
        url: `https://roxou.com.br/evento/${e.slug}`,
        description: e.description?.slice(0, 280) || config.metaDescription,
      }))
    : null;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ROXOU", item: "https://roxou.com.br" },
      { "@type": "ListItem", position: 2, name: config.title, item: canonicalUrl },
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
        canonical={canonicalUrl}
        jsonLd={jsonLd}
      />
      {/* Extra structured data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}
      {eventLd && eventLd.map((ld, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      ))}

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
        {config.longIntro && config.longIntro.length > 0 && (
          <section className="max-w-2xl space-y-3">
            {config.longIntro.map((p, i) => (
              <p key={i} className="text-sm text-muted-foreground leading-relaxed">{p}</p>
            ))}
          </section>
        )}

        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-12">Carregando eventos...</p>
        ) : config.sections && config.sections.length > 0 ? (
          <>
            {config.sections.map((sec, idx) => {
              const list = sec.filter ? filtered.filter(sec.filter) : filtered;
              return (
                <section key={idx} className="space-y-3">
                  <h2 className="text-lg md:text-xl font-bold font-display text-foreground">{sec.heading}</h2>
                  <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">{sec.body}</p>
                  {list.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">Nenhum evento confirmado nesta seção no momento. Veja a agenda completa abaixo.</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                      {list.map((e, i) => (
                        <EventCard key={e.id} event={e} index={i} sponsored={e.featured} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}

            {filtered.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Nenhum evento encontrado no momento. Continue acompanhando a agenda da Roxou.</p>
                <Link to="/" className="text-primary text-sm font-semibold mt-2 inline-block">Ver todos os eventos →</Link>
              </div>
            )}
          </>
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
