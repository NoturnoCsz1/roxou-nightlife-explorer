import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import NotFoundView from "@/components/NotFoundView";
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

// Próximos 7 dias (a partir de agora em America/Sao_Paulo)
function isInNext7DaysSP(value: string): boolean {
  const now = Date.now();
  const week = now + 7 * 24 * 60 * 60 * 1000;
  const t = new Date(value).getTime();
  return t >= now && t <= week;
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
  "musica-ao-vivo-em-presidente-prudente": {
    slug: "musica-ao-vivo-em-presidente-prudente",
    title: `Música ao Vivo em ${CITY} Hoje`,
    metaTitle: `Música ao Vivo em ${CITY} Hoje | Bares, Shows e Eventos | Roxou`,
    metaDescription: `Veja onde tem música ao vivo em ${CITY} hoje. Descubra bares, restaurantes, eventos e casas noturnas com programação atualizada diariamente.`,
    heading: `Música ao Vivo em ${CITY} Hoje`,
    intro: `Bares com música ao vivo, shows e eventos com voz e violão, banda, samba ao vivo, sertanejo ao vivo e mais — agenda atualizada em tempo real.`,
    filter: (e) => {
      const hay = `${e.title} ${e.description ?? ""} ${e.sub_category ?? ""} ${e.category ?? ""}`.toLowerCase();
      return /m[uú]sica ao vivo|musica ao vivo|ao vivo|show ao vivo|banda|voz e viol[ãa]o|rock ao vivo|samba ao vivo|sertanejo ao vivo|pagode ao vivo|mpb/.test(hay);
    },
    emitEventJsonLd: true,
    longIntro: [
      `Procurando música ao vivo em ${CITY} hoje? A Roxou reúne em uma única agenda todos os bares com música ao vivo em ${CITY}, shows com bandas e duplas, rodas de samba, sertanejo ao vivo, voz e violão e eventos com programação musical confirmada. Tudo o que rola de música ao vivo em Prudente fica aqui, organizado por data, horário e local.`,
      `Listamos os bares de ${CITY} que abrem com música ao vivo durante a semana, as casas que recebem bandas convidadas aos fins de semana e os grandes shows que acontecem em espaços de eventos da cidade. Quer saber o que fazer em ${CITY} hoje? Esta página resolve — sem precisar caçar story por story no Instagram.`,
    ],
    evergreen: DEFAULT_EVERGREEN("Música ao Vivo"),
    faqItems: [
      { q: `Onde tem música ao vivo em ${CITY} hoje?`, a: `Os bares e eventos com música ao vivo em ${CITY} marcados para hoje aparecem no topo desta página. A Roxou atualiza a agenda em tempo real conforme bares e produtoras confirmam a programação.` },
      { q: `Quais bares têm música ao vivo em ${CITY}?`, a: `Listamos aqui os bares de ${CITY} com programação ao vivo confirmada, com endereço, horário e Instagram para você conferir o ambiente antes de ir.` },
      { q: `Como saber dos próximos shows em Prudente?`, a: `Acompanhe esta página — a agenda é atualizada diariamente. Você também pode salvar a Roxou na tela inicial do celular para acesso rápido.` },
    ],
    relatedLinks: [
      { label: "Eventos hoje", href: "/eventos-hoje-em-presidente-prudente" },
      { label: "Shows", href: "/shows-em-presidente-prudente" },
      { label: "Pagode", href: "/pagode-em-presidente-prudente" },
      { label: "Sertanejo", href: "/sertanejo-em-presidente-prudente" },
      { label: "Bares", href: "/bares-em-presidente-prudente" },
      { label: "O que fazer hoje", href: "/o-que-fazer-em-presidente-prudente-hoje" },
    ],
  },
  "o-que-fazer-em-presidente-prudente-hoje": {
    slug: "o-que-fazer-em-presidente-prudente-hoje",
    title: `O Que Fazer em ${CITY} Hoje?`,
    metaTitle: `O Que Fazer em ${CITY} Hoje? | Agenda de Eventos, Bares e Rolês | Roxou`,
    metaDescription: `Descubra o que fazer em ${CITY} hoje. Bares, baladas, shows, música ao vivo, festas universitárias, futebol ao vivo e eventos na agenda atualizada da Roxou.`,
    heading: `O Que Fazer em ${CITY} Hoje?`,
    intro: `A agenda completa de hoje em ${CITY}: bares, baladas, shows, festas, música ao vivo, jogos e mais — atualizada em tempo real.`,
    filter: (e) => isTodaySP(new Date(e.date_time)),
    emitEventJsonLd: true,
    longIntro: [
      `Não sabe o que fazer em ${CITY} hoje? A Roxou reúne em uma única página tudo o que está acontecendo agora na cidade: bares com música ao vivo, baladas, shows, festas universitárias, eventos especiais e transmissões de jogos. Tudo organizado por horário, com link direto para conferir o local e garantir presença.`,
      `Nossa missão é simples: facilitar a sua noite em ${CITY}. Em vez de abrir 10 perfis no Instagram para descobrir o rolê do dia, basta esta página — é a agenda definitiva de eventos em Presidente Prudente, atualizada em tempo real conforme bares e produtoras confirmam a programação.`,
    ],
    evergreen: DEFAULT_EVERGREEN("Eventos"),
    faqItems: [
      { q: `O que fazer em ${CITY} hoje?`, a: `Os eventos confirmados para hoje em ${CITY} aparecem nesta página, organizados por horário. Você encontra bares, baladas, shows, festas, música ao vivo e jogos transmitidos ao vivo.` },
      { q: `Tem balada hoje em ${CITY}?`, a: `Se houver baladas confirmadas para hoje, elas aparecem na lista acima. Para ver todas as baladas da cidade, acesse nossa página dedicada.` },
      { q: `Onde tem show hoje em ${CITY}?`, a: `Os shows e eventos com música ao vivo de hoje em ${CITY} estão listados nesta página. Cada evento traz horário, local e link para conferir.` },
    ],
    relatedLinks: [
      { label: "Baladas", href: "/baladas-em-presidente-prudente" },
      { label: "Bares", href: "/bares-em-presidente-prudente" },
      { label: "Shows", href: "/shows-em-presidente-prudente" },
      { label: "Música ao vivo", href: "/musica-ao-vivo-em-presidente-prudente" },
      { label: "Pagode", href: "/pagode-em-presidente-prudente" },
      { label: "Sertanejo", href: "/sertanejo-em-presidente-prudente" },
      { label: "Funk", href: "/funk-em-presidente-prudente" },
    ],
  },
  // ───────────── SHORT-SLUG SEO PAGES ─────────────
  "hoje": {
    slug: "hoje",
    title: `Eventos Hoje em ${CITY}`,
    metaTitle: `Eventos Hoje em ${CITY} | Festas, Shows e Baladas | Roxou`,
    metaDescription: `Veja o que rola hoje em ${CITY}: festas, baladas, shows ao vivo, bares e happy hour. Agenda atualizada em tempo real.`,
    heading: `🔥 Eventos Hoje em ${CITY}`,
    intro: `Tudo o que está rolando hoje em ${CITY} — baladas, bares, shows, pagode, sertanejo e happy hour, num só lugar.`,
    filter: (e) => isTodaySP(new Date(e.date_time)),
    emitEventJsonLd: true,
    longIntro: [
      `Procurando o que fazer em ${CITY} hoje? A Roxou reúne em uma única página todos os eventos confirmados para hoje na cidade: baladas, bares com música ao vivo, shows, pagode, sertanejo, festas universitárias e happy hour. Sem precisar caçar story por story no Instagram.`,
      `A agenda é atualizada em tempo real conforme bares, casas noturnas e produtoras confirmam a programação. Cada evento traz horário, local, link para o Instagram da casa e como garantir presença.`,
    ],
    evergreen: DEFAULT_EVERGREEN("Eventos Hoje"),
    faqItems: [
      { q: `O que fazer hoje em ${CITY}?`, a: `Veja a lista acima — toda a agenda confirmada para hoje em ${CITY}, com baladas, shows, bares e happy hour.` },
      { q: `Tem festa hoje em ${CITY}?`, a: `Sim! Toda festa em ${CITY} hoje aparece nesta página, atualizada em tempo real.` },
      { q: `Onde sair hoje em ${CITY}?`, a: `A Roxou lista bares, baladas e shows com programação confirmada para hoje. Clique em cada card para ver o endereço e o Instagram da casa.` },
    ],
    relatedLinks: [
      { label: "Agenda da semana", href: "/agenda-semana" },
      { label: "Fim de semana", href: "/agenda-fim-de-semana" },
      { label: "Baladas", href: "/baladas" },
      { label: "Bares", href: "/bares" },
      { label: "Shows", href: "/shows" },
      { label: "Happy hour", href: "/happy-hour" },
    ],
  },
  "baladas": {
    slug: "baladas",
    title: `Baladas em ${CITY}`,
    metaTitle: `Baladas em ${CITY} | Festas, Pista e Noite | Roxou`,
    metaDescription: `As melhores baladas em ${CITY}: festas universitárias, eletrônica, funk e sertanejo universitário. Agenda atualizada em tempo real.`,
    heading: `🎧 Baladas em ${CITY}`,
    intro: `A agenda completa das baladas em ${CITY}: festas universitárias, eletrônica, funk, sertanejo universitário e mais.`,
    filter: (e) => {
      const cat = (e.category ?? "").toLowerCase();
      const hay = `${e.title} ${e.description ?? ""} ${e.sub_category ?? ""}`.toLowerCase();
      return cat === "balada" || cat === "eletronica" || /balada|festa universit|open bar|pista|club/.test(hay);
    },
    emitEventJsonLd: true,
    longIntro: [
      `As baladas em ${CITY} têm cenário forte de festas universitárias, casas noturnas com pista de funk e sertanejo, eventos open bar e festas autorais. A Roxou reúne todas essas opções em uma agenda única, atualizada em tempo real.`,
      `Encontre baladas em ${CITY} hoje, amanhã ou no fim de semana — com horário, local, line-up e link direto para garantir presença.`,
    ],
    evergreen: DEFAULT_EVERGREEN("Baladas"),
    faqItems: [
      { q: `Quais as melhores baladas em ${CITY}?`, a: `Listamos acima as baladas com eventos confirmados em ${CITY}. Cada balada tem endereço, Instagram e programação.` },
      { q: `Tem balada hoje em ${CITY}?`, a: `Os eventos de balada de hoje aparecem na agenda acima. Para ver só hoje, acesse /hoje.` },
    ],
    relatedLinks: [
      { label: "Eventos hoje", href: "/hoje" },
      { label: "Pagode", href: "/pagode" },
      { label: "Shows", href: "/shows" },
      { label: "Bares", href: "/bares" },
      { label: "Fim de semana", href: "/agenda-fim-de-semana" },
    ],
  },
  "pagode": {
    slug: "pagode",
    title: `Pagode em ${CITY}`,
    metaTitle: `Pagode em ${CITY} | Rodas de Samba e Shows | Roxou`,
    metaDescription: `Onde tem pagode em ${CITY}: rodas de samba, bares com pagode ao vivo, shows e eventos. Agenda atualizada em tempo real.`,
    heading: `🥁 Pagode em ${CITY}`,
    intro: `Rodas de samba, bares com pagode ao vivo e shows em ${CITY}: a agenda definitiva de pagode em Prudente.`,
    filter: (e) => {
      const hay = `${e.title} ${e.description ?? ""} ${e.sub_category ?? ""} ${e.category ?? ""}`.toLowerCase();
      return /pagode|samba|roda de samba|sambar/.test(hay);
    },
    emitEventJsonLd: true,
    longIntro: [
      `Procurando pagode em ${CITY}? A Roxou reúne todos os eventos de pagode em Prudente — de rodas de samba intimistas em bares do centro a shows com bandas locais e nacionais.`,
      `A agenda é atualizada em tempo real. Veja onde tem pagode em ${CITY} hoje, amanhã ou no fim de semana, com horário, local e link direto para o evento.`,
    ],
    evergreen: DEFAULT_EVERGREEN("Pagode"),
    faqItems: [
      { q: `Onde tem pagode hoje em ${CITY}?`, a: `Veja a lista acima — todos os pagodes com programação confirmada para os próximos dias em ${CITY}.` },
      { q: `Quais bares têm pagode em ${CITY}?`, a: `Os bares com pagode em Prudente aparecem nos cards acima, com endereço e Instagram.` },
    ],
    relatedLinks: [
      { label: "Eventos hoje", href: "/hoje" },
      { label: "Shows", href: "/shows" },
      { label: "Bares com música ao vivo", href: "/bares-musica-ao-vivo" },
      { label: "Sertanejo", href: "/sertanejo-em-presidente-prudente" },
      { label: "Fim de semana", href: "/agenda-fim-de-semana" },
    ],
  },
  "shows": {
    slug: "shows",
    title: `Shows em ${CITY}`,
    metaTitle: `Shows ao Vivo em ${CITY} | Agenda Completa | Roxou`,
    metaDescription: `Agenda de shows ao vivo em ${CITY}: rock, pop, MPB, pagode, sertanejo e mais. Confira datas, locais e ingressos.`,
    heading: `🎤 Shows em ${CITY}`,
    intro: `Shows ao vivo em ${CITY}: rock, pop, MPB, pagode, sertanejo e muito mais. Agenda atualizada em tempo real.`,
    filter: (e) => {
      const cat = (e.category ?? "").toLowerCase();
      const hay = `${e.title} ${e.description ?? ""} ${e.sub_category ?? ""}`.toLowerCase();
      return cat === "show" || /show|banda|cantor|cantora|dupla|ao vivo/.test(hay);
    },
    emitEventJsonLd: true,
    longIntro: [
      `Todos os shows em ${CITY} reunidos em uma agenda única. De shows intimistas em bares a grandes apresentações em espaços de eventos da cidade — tudo atualizado em tempo real.`,
      `Veja datas, line-up, local e link direto para garantir presença ou comprar ingresso. A Roxou conecta produtoras, casas e público em um só lugar.`,
    ],
    evergreen: DEFAULT_EVERGREEN("Shows"),
    faqItems: [
      { q: `Tem show hoje em ${CITY}?`, a: `Os shows de hoje aparecem na lista acima. Para ver só hoje, acesse /hoje.` },
      { q: `Quais os próximos shows em ${CITY}?`, a: `A agenda completa com os próximos shows em ${CITY} está nos cards acima, em ordem cronológica.` },
    ],
    relatedLinks: [
      { label: "Eventos hoje", href: "/hoje" },
      { label: "Pagode", href: "/pagode" },
      { label: "Sertanejo", href: "/sertanejo-em-presidente-prudente" },
      { label: "Bares com música ao vivo", href: "/bares-musica-ao-vivo" },
      { label: "Agenda da semana", href: "/agenda-semana" },
    ],
  },
  "bares": {
    slug: "bares",
    title: `Bares em ${CITY}`,
    metaTitle: `Melhores Bares em ${CITY} | Happy Hour e Música ao Vivo | Roxou`,
    metaDescription: `Os melhores bares em ${CITY}: happy hour, música ao vivo, chopp gelado e programação atualizada. Descubra onde sair hoje.`,
    heading: `🍻 Bares em ${CITY}`,
    intro: `Os melhores bares em ${CITY} com eventos, happy hour e música ao vivo. Encontre onde curtir hoje.`,
    filter: (e) => {
      const cat = (e.category ?? "").toLowerCase();
      const hay = `${e.title} ${e.description ?? ""} ${e.sub_category ?? ""} ${e.venue_name ?? ""}`.toLowerCase();
      return cat === "bar" || /\bbar\b|boteco|botequim|chopp|petiscos|happy hour/.test(hay);
    },
    emitEventJsonLd: true,
    longIntro: [
      `Os melhores bares em ${CITY} estão na Roxou. Listamos bares com música ao vivo, happy hour, boteco tradicional e casas com programação especial — tudo organizado por data e proximidade.`,
      `Cada bar traz endereço, horário, Instagram da casa e os próximos eventos. A agenda é atualizada em tempo real conforme as casas confirmam a programação.`,
    ],
    evergreen: DEFAULT_EVERGREEN("Bares"),
    faqItems: [
      { q: `Quais os melhores bares em ${CITY}?`, a: `Veja a lista acima — os bares de ${CITY} com eventos e programação confirmada, com endereço e Instagram.` },
      { q: `Onde tomar uma cerveja em ${CITY}?`, a: `Os bares listados acima abrem ao longo da semana. Para happy hour, acesse /happy-hour.` },
    ],
    relatedLinks: [
      { label: "Bares com música ao vivo", href: "/bares-musica-ao-vivo" },
      { label: "Happy hour", href: "/happy-hour" },
      { label: "Pagode", href: "/pagode" },
      { label: "Shows", href: "/shows" },
      { label: "Eventos hoje", href: "/hoje" },
    ],
  },
  "bares-musica-ao-vivo": {
    slug: "bares-musica-ao-vivo",
    title: `Bares com Música ao Vivo em ${CITY}`,
    metaTitle: `Bares com Música ao Vivo em ${CITY} | Roxou`,
    metaDescription: `Bares com música ao vivo em ${CITY}: voz e violão, samba, sertanejo e MPB. Agenda atualizada em tempo real.`,
    heading: `🎶 Bares com Música ao Vivo em ${CITY}`,
    intro: `Os bares de ${CITY} com música ao vivo confirmada: voz e violão, samba, sertanejo, MPB e mais.`,
    filter: (e) => {
      const hay = `${e.title} ${e.description ?? ""} ${e.sub_category ?? ""} ${e.category ?? ""} ${e.venue_name ?? ""}`.toLowerCase();
      const isBar = /\bbar\b|boteco|botequim|pub|chopperia/.test(hay) || (e.category ?? "").toLowerCase() === "bar";
      const liveMusic = /m[uú]sica ao vivo|ao vivo|voz e viol[ãa]o|banda|samba|sertanejo|mpb|pagode|roda de samba|cantor|cantora|dupla/.test(hay);
      return liveMusic && (isBar || (e.category ?? "").toLowerCase() === "show");
    },
    emitEventJsonLd: true,
    longIntro: [
      `Os bares com música ao vivo em ${CITY} estão entre os destinos preferidos para uma noite descontraída. Voz e violão, samba ao vivo, sertanejo, MPB, pagode — a Roxou reúne todos os bares de Prudente com programação ao vivo confirmada.`,
      `Veja os bares com música ao vivo em ${CITY} hoje, amanhã ou no fim de semana, com horário, atração e endereço.`,
    ],
    evergreen: DEFAULT_EVERGREEN("Bares com Música ao Vivo"),
    faqItems: [
      { q: `Quais bares têm música ao vivo em ${CITY}?`, a: `Listamos acima os bares com música ao vivo em Prudente com eventos confirmados. Cada card mostra a atração e o horário.` },
      { q: `Tem voz e violão hoje em ${CITY}?`, a: `Se houver atração de voz e violão hoje, ela aparece na lista. Para ver tudo de hoje, acesse /hoje.` },
    ],
    relatedLinks: [
      { label: "Bares", href: "/bares" },
      { label: "Happy hour", href: "/happy-hour" },
      { label: "Pagode", href: "/pagode" },
      { label: "Shows", href: "/shows" },
      { label: "Eventos hoje", href: "/hoje" },
    ],
  },
  "happy-hour": {
    slug: "happy-hour",
    title: `Happy Hour em ${CITY}`,
    metaTitle: `Happy Hour em ${CITY} | Bares e Promoções | Roxou`,
    metaDescription: `Happy hour em ${CITY}: bares com promoção de chopp, drink, petiscos e música. Veja onde ir hoje.`,
    heading: `🍺 Happy Hour em ${CITY}`,
    intro: `Os melhores happy hour em ${CITY}: chopp gelado, drinks, petiscos e música. Agenda atualizada em tempo real.`,
    filter: (e) => {
      const hay = `${e.title} ${e.description ?? ""} ${e.sub_category ?? ""} ${e.category ?? ""} ${e.venue_name ?? ""}`.toLowerCase();
      const isBar = /\bbar\b|boteco|botequim|pub|chopperia/.test(hay) || (e.category ?? "").toLowerCase() === "bar";
      const hour = new Date(e.date_time).getUTCHours() - 3; // SP UTC-3
      const inHappyHour = hour >= 17 && hour < 21;
      return /happy hour|happy-hour|promo[çc][ãa]o|chopp|drink|petisco/.test(hay) || (isBar && inHappyHour);
    },
    emitEventJsonLd: true,
    longIntro: [
      `O happy hour em ${CITY} é um clássico do fim de tarde. Bares com chopp gelado, drinks autorais, petiscos e música ao vivo recebem o público entre 17h e 21h, sempre com promoções e ambientes acolhedores.`,
      `A Roxou lista os bares de Prudente com happy hour confirmado, com horário, promoção e atração musical quando houver.`,
    ],
    evergreen: DEFAULT_EVERGREEN("Happy Hour"),
    faqItems: [
      { q: `Onde tem happy hour em ${CITY}?`, a: `Os bares com happy hour confirmado em Prudente estão na lista acima, com endereço e horário.` },
      { q: `Qual o melhor happy hour em ${CITY}?`, a: `Depende do estilo — listamos opções com chopp, drinks, música ao vivo e petiscos.` },
    ],
    relatedLinks: [
      { label: "Bares", href: "/bares" },
      { label: "Bares com música ao vivo", href: "/bares-musica-ao-vivo" },
      { label: "Eventos hoje", href: "/hoje" },
      { label: "Fim de semana", href: "/agenda-fim-de-semana" },
    ],
  },
  "agenda-semana": {
    slug: "agenda-semana",
    title: `Agenda da Semana em ${CITY}`,
    metaTitle: `Agenda da Semana em ${CITY} | Eventos dos Próximos 7 Dias | Roxou`,
    metaDescription: `Agenda completa da semana em ${CITY}: festas, baladas, shows, bares e happy hour nos próximos 7 dias.`,
    heading: `🗓️ Agenda da Semana em ${CITY}`,
    intro: `Tudo o que rola em ${CITY} nos próximos 7 dias: festas, baladas, shows, bares e happy hour.`,
    filter: (e) => isInNext7DaysSP(e.date_time),
    emitEventJsonLd: true,
    longIntro: [
      `A agenda da semana em ${CITY} reúne todos os eventos dos próximos 7 dias — baladas, bares com música ao vivo, shows, pagode, sertanejo, happy hour e festas universitárias.`,
      `Ideal para se planejar a semana toda. Atualizada em tempo real conforme bares e produtoras confirmam novos eventos.`,
    ],
    evergreen: DEFAULT_EVERGREEN("Agenda da Semana"),
    faqItems: [
      { q: `O que tem essa semana em ${CITY}?`, a: `Veja a lista acima — todos os eventos confirmados em ${CITY} para os próximos 7 dias.` },
      { q: `Tem festa na quinta em ${CITY}?`, a: `As festas universitárias e baladas de quinta aparecem na agenda da semana acima.` },
    ],
    relatedLinks: [
      { label: "Eventos hoje", href: "/hoje" },
      { label: "Fim de semana", href: "/agenda-fim-de-semana" },
      { label: "Baladas", href: "/baladas" },
      { label: "Shows", href: "/shows" },
      { label: "Bares", href: "/bares" },
    ],
  },
  "agenda-fim-de-semana": {
    slug: "agenda-fim-de-semana",
    title: `Agenda de Fim de Semana em ${CITY}`,
    metaTitle: `Agenda Fim de Semana em ${CITY} | Sábado e Domingo | Roxou`,
    metaDescription: `Agenda do fim de semana em ${CITY}: festas, baladas, shows e bares no sábado e domingo. Atualizada em tempo real.`,
    heading: `🎉 Fim de Semana em ${CITY}`,
    intro: `Os melhores eventos do fim de semana em ${CITY}. Sábado e domingo com festas, shows, baladas e bares.`,
    filter: (e) => isInWeekendSP(e.date_time),
    emitEventJsonLd: true,
    longIntro: [
      `O fim de semana em ${CITY} concentra a maior agenda de eventos da cidade: baladas universitárias, shows ao vivo, pagode, sertanejo, festas autorais e bares com programação especial.`,
      `Veja tudo o que rola em ${CITY} no sábado e domingo, com horário, local e link direto para garantir presença.`,
    ],
    evergreen: DEFAULT_EVERGREEN("Fim de Semana"),
    faqItems: [
      { q: `O que fazer no fim de semana em ${CITY}?`, a: `A agenda completa de sábado e domingo está nos cards acima — baladas, shows, bares e mais.` },
      { q: `Tem festa no sábado em ${CITY}?`, a: `Sim, as festas de sábado aparecem na lista acima, com horário e local.` },
    ],
    relatedLinks: [
      { label: "Eventos hoje", href: "/hoje" },
      { label: "Agenda da semana", href: "/agenda-semana" },
      { label: "Baladas", href: "/baladas" },
      { label: "Shows", href: "/shows" },
      { label: "Bares", href: "/bares" },
    ],
  },

  // ───────────── NEW LOCAL SEO PAGES (2026) ─────────────
  "eventos-em-presidente-prudente-hoje": {
    slug: "eventos-em-presidente-prudente-hoje",
    title: `Eventos em ${CITY} Hoje`,
    metaTitle: `Eventos em ${CITY} Hoje | Agenda Completa do Dia | Roxou`,
    metaDescription: `Veja todos os eventos em ${CITY} hoje: festas, shows, baladas, bares com música ao vivo e happy hour. Agenda atualizada em tempo real pela Roxou.`,
    heading: `Eventos em ${CITY} Hoje`,
    intro: `A agenda definitiva de eventos em ${CITY} hoje — festas, shows, baladas, bares e happy hour, atualizada em tempo real.`,
    filter: (e) => isTodaySP(new Date(e.date_time)),
    emitEventJsonLd: true,
    longIntro: [
      `Procurando eventos em ${CITY} hoje? A Roxou reúne em uma página única tudo o que está acontecendo agora na cidade: festas universitárias, shows ao vivo, baladas, bares com programação especial, pagode, sertanejo e happy hour — com horário, local e link direto para o evento.`,
      `A agenda é atualizada em tempo real conforme bares, casas noturnas e produtoras confirmam os eventos do dia. Em vez de caçar story por story no Instagram, basta esta página.`,
    ],
    evergreen: DEFAULT_EVERGREEN("Eventos Hoje"),
    faqItems: [
      { q: `Quais eventos têm em ${CITY} hoje?`, a: `Veja a lista acima — toda a programação confirmada para hoje em ${CITY}, com baladas, shows, bares, pagode, sertanejo e happy hour.` },
      { q: `Onde encontrar a agenda de eventos de ${CITY}?`, a: `Aqui mesmo na Roxou. Atualizamos diariamente com base nas confirmações de bares, casas e produtoras locais.` },
      { q: `Tem evento gratuito hoje em ${CITY}?`, a: `Alguns bares e casas oferecem entrada gratuita ou cortesia até determinado horário. Confira nos cards acima — cada evento traz a política de entrada quando disponível.` },
    ],
    relatedLinks: [
      { label: "O que fazer hoje", href: "/o-que-fazer-em-presidente-prudente-hoje" },
      { label: "Bares", href: "/bares" },
      { label: "Shows", href: "/shows" },
      { label: "Pagode", href: "/pagode" },
      { label: "Baladas", href: "/baladas" },
      { label: "Jogos ao vivo", href: "/jogos" },
      { label: "Guia de Informações da Expo Prudente 2026", href: "/expo2026" },
    ],
  },
  "festa-em-presidente-prudente-hoje": {
    slug: "festa-em-presidente-prudente-hoje",
    title: `Festa em ${CITY} Hoje`,
    metaTitle: `Festa em ${CITY} Hoje | Baladas, Open Bar e Universitárias | Roxou`,
    metaDescription: `Veja onde tem festa em ${CITY} hoje: baladas, festas universitárias, open bar e eventos com pista. Agenda atualizada em tempo real pela Roxou.`,
    heading: `Festa em ${CITY} Hoje`,
    intro: `Onde tem festa hoje em ${CITY}: baladas, universitárias, open bar e eventos com pista — agenda atualizada em tempo real.`,
    filter: (e) => {
      if (!isTodaySP(new Date(e.date_time))) return false;
      const cat = (e.category ?? "").toLowerCase();
      const hay = `${e.title} ${e.description ?? ""} ${e.sub_category ?? ""}`.toLowerCase();
      return cat === "balada" || cat === "eletronica" || /festa|balada|open bar|universit|pista|club/.test(hay);
    },
    emitEventJsonLd: true,
    longIntro: [
      `Procurando festa em ${CITY} hoje? A Roxou reúne todas as festas confirmadas para hoje na cidade — baladas universitárias, open bar, festas autorais e eventos com pista de funk, sertanejo, eletrônica e pagode.`,
      `Cada festa traz horário, local, line-up de DJs e link direto para garantir presença. A agenda é atualizada em tempo real conforme produtoras e casas confirmam a programação.`,
    ],
    evergreen: DEFAULT_EVERGREEN("Festas"),
    faqItems: [
      { q: `Tem festa hoje em ${CITY}?`, a: `Sim — todas as festas confirmadas para hoje em ${CITY} aparecem na lista acima, com horário e local.` },
      { q: `Onde tem festa universitária em ${CITY} hoje?`, a: `As festas universitárias com data de hoje aparecem na agenda acima. Cada evento traz o Instagram da produtora e o link para ingresso.` },
      { q: `Qual a melhor festa de ${CITY} hoje?`, a: `Depende do estilo — funk, sertanejo, open bar, eletrônica. Veja todas as opções e escolha a que combina com você.` },
    ],
    relatedLinks: [
      { label: "Baladas", href: "/baladas" },
      { label: "Funk", href: "/funk-em-presidente-prudente" },
      { label: "Sertanejo", href: "/sertanejo-em-presidente-prudente" },
      { label: "Eventos hoje", href: "/hoje" },
      { label: "Fim de semana", href: "/agenda-fim-de-semana" },
    ],
  },
  "show-em-presidente-prudente-hoje": {
    slug: "show-em-presidente-prudente-hoje",
    title: `Show em ${CITY} Hoje`,
    metaTitle: `Show em ${CITY} Hoje | Música ao Vivo, Bandas e Duplas | Roxou`,
    metaDescription: `Veja onde tem show em ${CITY} hoje: bandas, duplas, sertanejo, pagode, rock e MPB ao vivo. Agenda atualizada em tempo real pela Roxou.`,
    heading: `Show em ${CITY} Hoje`,
    intro: `Todos os shows confirmados para hoje em ${CITY}: bandas, duplas, sertanejo, pagode, rock, MPB e muito mais.`,
    filter: (e) => {
      if (!isTodaySP(new Date(e.date_time))) return false;
      const cat = (e.category ?? "").toLowerCase();
      const hay = `${e.title} ${e.description ?? ""} ${e.sub_category ?? ""}`.toLowerCase();
      return cat === "show" || /show|banda|cantor|cantora|dupla|ao vivo|voz e viol/.test(hay);
    },
    emitEventJsonLd: true,
    longIntro: [
      `Procurando show em ${CITY} hoje? A Roxou reúne todos os shows confirmados para hoje na cidade — bandas locais, duplas sertanejas, pagode ao vivo, rock, MPB, voz e violão e apresentações em casas noturnas e espaços de eventos.`,
      `Cada show traz horário, local, line-up e link para garantir presença ou comprar ingresso. Agenda atualizada em tempo real.`,
    ],
    evergreen: DEFAULT_EVERGREEN("Shows"),
    faqItems: [
      { q: `Tem show hoje em ${CITY}?`, a: `Os shows com data de hoje aparecem na lista acima, com horário e local. Se nada aparecer, ainda não há show confirmado para hoje.` },
      { q: `Quem está se apresentando hoje em ${CITY}?`, a: `Cada card traz a atração principal, o local e o horário. Clique para ver detalhes e ingressos.` },
    ],
    relatedLinks: [
      { label: "Shows", href: "/shows" },
      { label: "Sertanejo", href: "/sertanejo-em-presidente-prudente" },
      { label: "Pagode hoje", href: "/pagode-em-presidente-prudente-hoje" },
      { label: "Música ao vivo", href: "/musica-ao-vivo-presidente-prudente" },
      { label: "Bares com música ao vivo", href: "/bares-musica-ao-vivo" },
    ],
  },
  "pagode-em-presidente-prudente-hoje": {
    slug: "pagode-em-presidente-prudente-hoje",
    title: `Pagode em ${CITY} Hoje`,
    metaTitle: `Pagode em ${CITY} Hoje | Rodas de Samba e Bares Ao Vivo | Roxou`,
    metaDescription: `Veja onde tem pagode em ${CITY} hoje: rodas de samba, bares com pagode ao vivo, shows e eventos. Agenda atualizada em tempo real pela Roxou.`,
    heading: `Pagode em ${CITY} Hoje`,
    intro: `Onde tem pagode em ${CITY} hoje: rodas de samba, bares com pagode ao vivo e shows confirmados para o dia.`,
    filter: (e) => {
      if (!isTodaySP(new Date(e.date_time))) return false;
      const hay = `${e.title} ${e.description ?? ""} ${e.sub_category ?? ""} ${e.category ?? ""}`.toLowerCase();
      return /pagode|samba|roda de samba|sambar/.test(hay);
    },
    emitEventJsonLd: true,
    longIntro: [
      `Procurando pagode em ${CITY} hoje? A Roxou mostra todas as rodas de samba, bares com pagode ao vivo e shows confirmados para hoje na cidade. Cavaco, pandeiro, batuque — tudo organizado por horário e local.`,
      `A agenda é atualizada em tempo real. Se não houver pagode confirmado hoje, veja a página de pagode em Prudente para a programação dos próximos dias.`,
    ],
    evergreen: DEFAULT_EVERGREEN("Pagode"),
    faqItems: [
      { q: `Onde tem pagode hoje em ${CITY}?`, a: `Veja a lista acima — todos os pagodes e rodas de samba com data de hoje em ${CITY}, com endereço e horário.` },
      { q: `Tem roda de samba hoje em ${CITY}?`, a: `Se houver, ela aparece na agenda acima. Caso contrário, confira a página /pagode para os próximos dias.` },
    ],
    relatedLinks: [
      { label: "Pagode (agenda completa)", href: "/pagode" },
      { label: "Shows", href: "/shows" },
      { label: "Bares com música ao vivo", href: "/bares-musica-ao-vivo" },
      { label: "Música ao vivo", href: "/musica-ao-vivo-presidente-prudente" },
      { label: "Eventos hoje", href: "/hoje" },
    ],
  },
  "musica-ao-vivo-presidente-prudente": {
    slug: "musica-ao-vivo-presidente-prudente",
    title: `Música ao Vivo em ${CITY}`,
    metaTitle: `Música ao Vivo em ${CITY} | Bares, Shows e Agenda | Roxou`,
    metaDescription: `Música ao vivo em ${CITY}: bares com voz e violão, samba, sertanejo, MPB, rock e pagode ao vivo. Agenda atualizada em tempo real pela Roxou.`,
    heading: `Música ao Vivo em ${CITY}`,
    intro: `Bares e eventos com música ao vivo em ${CITY}: voz e violão, samba, sertanejo, MPB, rock, pagode e muito mais.`,
    filter: (e) => {
      const hay = `${e.title} ${e.description ?? ""} ${e.sub_category ?? ""} ${e.category ?? ""}`.toLowerCase();
      return /m[uú]sica ao vivo|musica ao vivo|ao vivo|show ao vivo|banda|voz e viol[ãa]o|rock ao vivo|samba ao vivo|sertanejo ao vivo|pagode ao vivo|mpb/.test(hay);
    },
    emitEventJsonLd: true,
    longIntro: [
      `Procurando música ao vivo em ${CITY}? A Roxou lista todos os bares e eventos com programação ao vivo em Prudente — voz e violão, samba, sertanejo, MPB, rock, pagode — com horário, atração e endereço.`,
      `A agenda é atualizada em tempo real conforme bares e produtoras confirmam a programação musical.`,
    ],
    evergreen: DEFAULT_EVERGREEN("Música ao Vivo"),
    faqItems: [
      { q: `Onde tem música ao vivo em ${CITY}?`, a: `Os bares e eventos com música ao vivo em Prudente aparecem na lista acima, com horário, atração e endereço.` },
      { q: `Tem voz e violão hoje em ${CITY}?`, a: `Se houver, aparece na agenda. Confira também /bares-musica-ao-vivo para ver todos os bares com programação.` },
      { q: `Quais bares têm música ao vivo em ${CITY}?`, a: `Listamos aqui os bares de Prudente com programação ao vivo confirmada, com endereço e Instagram para você conferir o ambiente antes de ir.` },
    ],
    relatedLinks: [
      { label: "Bares com música ao vivo", href: "/bares-musica-ao-vivo" },
      { label: "Shows", href: "/shows" },
      { label: "Pagode", href: "/pagode" },
      { label: "Sertanejo", href: "/sertanejo-em-presidente-prudente" },
      { label: "Bares", href: "/bares" },
      { label: "Eventos hoje", href: "/hoje" },
    ],
  },
  "onde-sair-em-presidente-prudente": {
    slug: "onde-sair-em-presidente-prudente",
    title: `Onde Sair em ${CITY}`,
    metaTitle: `Onde Sair em ${CITY} | Bares, Baladas e Rolês | Roxou`,
    metaDescription: `Onde sair em ${CITY}: bares, baladas, shows, música ao vivo, happy hour e eventos para todos os estilos. Agenda atualizada em tempo real pela Roxou.`,
    heading: `Onde Sair em ${CITY}`,
    intro: `Onde sair em ${CITY} hoje, amanhã ou no fim de semana — bares, baladas, shows, música ao vivo e happy hour, num só lugar.`,
    filter: (e) => isInNext7DaysSP(e.date_time),
    emitEventJsonLd: true,
    longIntro: [
      `Não sabe onde sair em ${CITY}? A Roxou reúne em uma única agenda todos os bares, baladas, shows, eventos com música ao vivo e happy hour confirmados para os próximos dias. De rolês intimistas a grandes festas, tudo organizado por data e estilo.`,
      `Cada opção traz horário, local, Instagram da casa e link direto para o evento. Atualizamos em tempo real para você não perder nada do que rola em Prudente.`,
    ],
    evergreen: DEFAULT_EVERGREEN("Onde Sair"),
    faqItems: [
      { q: `Onde sair hoje em ${CITY}?`, a: `Veja a agenda acima — bares, baladas, shows e happy hour com programação confirmada nos próximos dias. Para só hoje, acesse /hoje.` },
      { q: `Quais os melhores rolês em ${CITY}?`, a: `Listamos todas as opções por data. Cada card mostra a casa, a atração e o horário para você escolher.` },
      { q: `Onde ir no fim de semana em ${CITY}?`, a: `Acesse /agenda-fim-de-semana para ver a programação completa de sábado e domingo.` },
    ],
    relatedLinks: [
      { label: "Eventos hoje", href: "/hoje" },
      { label: "Bares", href: "/bares" },
      { label: "Baladas", href: "/baladas" },
      { label: "Shows", href: "/shows" },
      { label: "Pagode", href: "/pagode" },
      { label: "Fim de semana", href: "/agenda-fim-de-semana" },
      { label: "Jogos ao vivo", href: "/jogos" },
    ],
  },
  "agenda-cultural-presidente-prudente": {
    slug: "agenda-cultural-presidente-prudente",
    title: `Agenda Cultural de ${CITY}`,
    metaTitle: `Agenda Cultural de ${CITY} | Shows, Eventos e Música ao Vivo | Roxou`,
    metaDescription: `Agenda cultural de ${CITY}: shows, eventos, música ao vivo, festas, exposições e programação cultural atualizada em tempo real pela Roxou.`,
    heading: `Agenda Cultural de ${CITY}`,
    intro: `A agenda cultural completa de ${CITY} — shows, música ao vivo, festas, eventos e programação cultural atualizada em tempo real.`,
    filter: (e) => isInNext7DaysSP(e.date_time),
    emitEventJsonLd: true,
    longIntro: [
      `A agenda cultural de ${CITY} reúne shows, eventos, música ao vivo, festas e programação cultural da cidade e região. A Roxou organiza tudo em um só lugar, com data, horário, local e link direto para o evento.`,
      `Atualizamos em tempo real com base nas confirmações de produtoras, bares, casas noturnas e espaços culturais. Acompanhe esta página para se planejar — e salve a Roxou na tela inicial do celular para acesso rápido. Você também encontra aqui o Guia de Informações da Expo Prudente 2026, com tudo sobre o maior evento da cidade. A Roxou apenas divulga informações públicas. Para informações oficiais, consulte os canais oficiais do evento.`,
    ],
    evergreen: DEFAULT_EVERGREEN("Agenda Cultural"),
    faqItems: [
      { q: `O que tem na agenda cultural de ${CITY} esta semana?`, a: `Veja a lista acima — todos os eventos culturais, shows, festas e programação confirmados para os próximos 7 dias em ${CITY}.` },
      { q: `Onde acompanhar a agenda cultural de ${CITY}?`, a: `Aqui na Roxou. Atualizamos diariamente com base nas confirmações de produtoras, bares, casas noturnas e espaços culturais.` },
      { q: `Tem evento cultural gratuito em ${CITY}?`, a: `Alguns eventos têm entrada gratuita ou cortesia. Confira em cada card a política de entrada quando informada pela casa.` },
    ],
    relatedLinks: [
      { label: "Eventos hoje", href: "/hoje" },
      { label: "Shows", href: "/shows" },
      { label: "Música ao vivo", href: "/musica-ao-vivo-presidente-prudente" },
      { label: "Bares", href: "/bares" },
      { label: "Fim de semana", href: "/agenda-fim-de-semana" },
      { label: "Jogos ao vivo", href: "/jogos" },
      { label: "Guia de Informações da Expo Prudente 2026", href: "/expo2026" },
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
    // ESTRUTURAL — Onda 25 (correção Soft 404):
    // Landing slug inválido antes redirecionava para "/" (Soft 404). Agora
    // devolve NotFoundView com noindex,follow.
    return (
      <NotFoundView
        title="Página não encontrada"
        message={`A landing "${landingSlug}" não existe na ROXOU. Explore a agenda completa de Presidente Prudente.`}
        seoTitle="Página não encontrada | ROXOU"
      />
    );
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

  // Onda SEO A — nunca emitir Event JSON-LD sem eventos reais.
  const eventLd =
    config.emitEventJsonLd && filtered.length > 0
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

  // Landing sem eventos AND sem conteúdo editorial evergreen/longIntro:
  // marca noindex,follow para evitar página fina. Landings com evergreen
  // (padrão em todas as configs) permanecem indexáveis.
  const hasEvergreen = !!(config.evergreen || (config.longIntro && config.longIntro.length > 0));
  const shouldNoindex = filtered.length === 0 && !hasEvergreen;


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
        noindex={shouldNoindex}
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
              if (list.length === 0) return null;
              return (
                <section key={idx} className="space-y-3">
                  <h2 className="text-lg md:text-xl font-bold font-display text-foreground">{sec.heading}</h2>
                  <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">{sec.body}</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                    {list.map((e, i) => (
                      <EventCard key={e.id} event={e} index={i} sponsored={e.featured} />
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {filtered.map((e, i) => (
              <EventCard key={e.id} event={e} index={i} sponsored={e.featured} />
            ))}
          </div>
        ) : null}

        {/* Evergreen content — sempre renderizado para evitar Soft 404 */}
        {(() => {
          const ever = config.evergreen ?? DEFAULT_EVERGREEN(config.title);
          const noEvents = !loading && filtered.length === 0;
          return (
            <>
              {noEvents && (
                <section className="rounded-2xl bg-card/60 border border-border/40 p-5 card-shadow">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Ainda não encontramos eventos desta categoria confirmados para o momento, mas a agenda da Roxou é atualizada constantemente. Veja abaixo o contexto da cena local, os locais que costumam receber esse tipo de programação e confira a agenda completa de {CITY}.
                  </p>
                </section>
              )}

              <section className="max-w-2xl space-y-3">
                <h2 className="text-lg md:text-xl font-bold font-display text-foreground">{ever.context.heading}</h2>
                {ever.context.body.map((p, i) => (
                  <p key={i} className="text-sm text-muted-foreground leading-relaxed">{p}</p>
                ))}
              </section>

              <section className="max-w-2xl space-y-3">
                <h2 className="text-lg md:text-xl font-bold font-display text-foreground">{ever.places.heading}</h2>
                {ever.places.body.map((p, i) => (
                  <p key={i} className="text-sm text-muted-foreground leading-relaxed">{p}</p>
                ))}
              </section>

              <section className="max-w-2xl space-y-3">
                <h2 className="text-lg md:text-xl font-bold font-display text-foreground">{ever.howToFollow.heading}</h2>
                {ever.howToFollow.body.map((p, i) => (
                  <p key={i} className="text-sm text-muted-foreground leading-relaxed">{p}</p>
                ))}
              </section>

              <section className="rounded-2xl gradient-primary p-5 text-primary-foreground">
                <h2 className="text-lg md:text-xl font-bold font-display">{ever.finalCta.heading}</h2>
                {ever.finalCta.body.map((p, i) => (
                  <p key={i} className="text-sm leading-relaxed opacity-90 mt-2">{p}</p>
                ))}
                <Link
                  to="/agenda"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-background/95 px-4 py-2.5 text-xs font-bold text-foreground hover:bg-background transition-colors"
                >
                  Ver agenda completa →
                </Link>
              </section>
            </>
          );
        })()}


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
