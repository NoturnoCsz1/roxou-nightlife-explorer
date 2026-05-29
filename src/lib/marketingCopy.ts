/**
 * Marketing copy generator for ROXOU Instagram content.
 * Generates viral-style captions for Story, Reels, and Feed.
 */

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CopyEvent {
  title: string;
  date_time: string;
  venue_name: string | null;
  category: string;
  sub_category?: string | null;
}

const CATEGORY_EMOJI: Record<string, string> = {
  bar: "🍺", balada: "🪩", festa: "🎉", evento: "📌",
  restaurante: "🍽️", "casa de show": "🎤", futebol: "⚽",
  show: "🎤", festival: "🏟️", universitario: "🎓", cultural: "🎭",
};

// ====== TONE DETECTION BY GENRE / CATEGORY ======
type Tone = "festivo" | "energetico" | "descontraido" | "padrao";

function detectTone(ev?: CopyEvent | null): Tone {
  if (!ev) return "padrao";
  const sub = (ev.sub_category || "").toLowerCase();
  const cat = (ev.category || "").toLowerCase();
  if (sub === "sertanejo" || sub === "pagode_samba" || sub === "festa" || sub === "mpb") return "festivo";
  if (sub === "eletronica" || sub === "funk" || cat === "balada") return "energetico";
  if (cat === "universitario") return "descontraido";
  return "padrao";
}

// ====== STORY / REELS COPY (curto, viral, gatilho) ======

const HOOKS_STORY = [
  "🔥 HOJE TEM ISSO EM PRUDENTE",
  "🔥 CORRE QUE VAI LOTAR",
  "🔥 VOCÊ VAI PERDER ESSA?",
  "⚡ BORA PRA NOITE?",
  "🪩 PRUDENTE TREM HOJE",
  "🎉 O ROLÊ DE HOJE É ESSE",
  "🔥 NÃO FICA EM CASA NÃO",
  "⚡ AGENDA DO DIA — OLHA SÓ",
  "🔥 QUEM VAI? 👀",
];

const HOOKS_VIRAL = [
  "🔥 HOJE TEM ISSO EM PRUDENTE",
  "🔥 CORRE QUE VAI LOTAR",
  "⚡ VOCÊ VAI PERDER ESSA?",
  "🚨 ROLÊ ZERO ARREPENDIMENTO",
  "🔥 QUEM TÁ DENTRO? 👀",
  "⚡ ANTES QUE ENCHA — CORRE",
];

const HOOKS_BY_TONE: Record<Tone, string[]> = {
  festivo: ["🎉 HOJE TEM FESTA BOA", "🍻 BORA CAIR NA ROÇA HOJE", "🥁 PRUDENTE EM RITMO DE ALEGRIA", "❤️ HOJE A NOITE É QUENTE"],
  energetico: ["🔥 SOM ALTO HOJE EM PRUDENTE", "⚡ AS LUZES VÃO PISCAR HOJE", "🪩 NOITE LIGADA NO MÁXIMO", "🚨 PISTA CHEIA — BORA?"],
  descontraido: ["🎓 RESENHA UNIVERSITÁRIA HOJE", "😎 HOJE OS UNIVERSIDADES TÃO ON", "🍻 ROLÊ DE FACUL HOJE — COLA", "🤙 SEM MIMIMI, BORA SAIR"],
  padrao: HOOKS_STORY,
};

const CLOSERS_STORY = [
  "Confere tudo na ROXOU 👇",
  "Mais eventos em roxou.com.br 🔥",
  "Salva e compartilha! 🔖",
  "Marca quem vai contigo! 👥",
  "Não fica de fora não! 🪩",
  "Cola que hoje vai ser bom! 🎉",
];

const CLOSERS_VIRAL = [
  "SALVA AGORA 🔖",
  "MANDA PRA GERAL 👥",
  "CORRE ANTES QUE LOTE ⏳",
  "MARCA QUEM VAI CONTIGO 🔥",
  "NÃO PERDE — roxou.com.br 🚨",
];

function pickRandom<T>(arr: T[], seed = 0): T {
  return arr[(seed + Date.now()) % arr.length];
}

export function generateStoryCopy(
  events: CopyEvent[],
  mode: "agenda" | "top" | "individual" | "destaque" = "agenda",
  viral = false,
): { hook: string; body: string; cta: string; full: string } {
  // Tone-adapted hooks: prioritize the hero event's genre when individual/destaque,
  // otherwise blend default with viral pool.
  const hero = events[0];
  const tone = detectTone(hero);
  const tonedHooks = HOOKS_BY_TONE[tone];
  const baseHooks = viral ? HOOKS_VIRAL : HOOKS_STORY;
  const hooks = tone !== "padrao" ? [...tonedHooks, ...baseHooks] : baseHooks;
  const closers = viral ? CLOSERS_VIRAL : CLOSERS_STORY;
  const seed = new Date().getDate();

  if (mode === "individual" || mode === "destaque") {
    const ev = events[0];
    if (!ev) return { hook: "", body: "", cta: "", full: "" };
    const h = format(new Date(ev.date_time), "HH'h'mm");
    const emoji = CATEGORY_EMOJI[ev.category] || "🎉";
    const hook = pickRandom(hooks, seed);
    const body = `${emoji} ${ev.title.toUpperCase()}\n⏰ ${h}${ev.venue_name ? `\n📍 ${ev.venue_name}` : ""}`;
    const cta = pickRandom(closers, seed + 1);
    return { hook, body, cta, full: `${hook}\n\n${body}\n\n${cta}` };
  }

  const hook = mode === "top" ? "🏆 OS MELHORES ROLÊS DE HOJE" : pickRandom(hooks, seed);
  const top = events.slice(0, 5);
  const body = top.map(ev => {
    const h = format(new Date(ev.date_time), "HH'h'");
    const emoji = CATEGORY_EMOJI[ev.category] || "📌";
    return `${emoji} ${ev.title} · ${h}`;
  }).join("\n");
  const cta = pickRandom(closers, seed + 2);
  return { hook, body, cta, full: `${hook}\n\n${body}\n\n${cta}` };
}

// ====== STORY SEQUENCE (3 telas) ======

export interface StorySequence {
  hook: { title: string; subtitle: string };
  list: { title: string; items: { time: string; name: string; venue: string | null }[] };
  cta: { title: string; subtitle: string; url: string };
}

export function generateStorySequence(events: CopyEvent[], viral = false): StorySequence {
  const hooks = viral ? HOOKS_VIRAL : HOOKS_STORY;
  const seed = new Date().getDate();
  const top = events.slice(0, 4);
  return {
    hook: {
      title: pickRandom(hooks, seed),
      subtitle: viral ? "VOCÊ NÃO PODE PERDER" : "veja a agenda de hoje",
    },
    list: {
      title: viral ? "🔥 ROLÊS DE HOJE" : "📅 AGENDA DE HOJE",
      items: top.map(e => ({
        time: format(new Date(e.date_time), "HH'h'mm"),
        name: e.title,
        venue: e.venue_name,
      })),
    },
    cta: {
      title: viral ? "SALVA AGORA 🔖" : "Confere tudo na ROXOU",
      subtitle: viral ? "MANDA PRA GERAL 👥" : "Salva e compartilha",
      url: "roxou.com.br",
    },
  };
}

// ====== FEED COPY (informativo, completo) ======

export function generateFeedCopy(events: CopyEvent[], mode: "agenda" | "top" | "individual" = "agenda"): { full: string; short: string } {
  const todayStr = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  if (mode === "individual") {
    const ev = events[0];
    if (!ev) return { full: "", short: "" };
    const h = format(new Date(ev.date_time), "HH'h'mm");
    const dayFull = format(new Date(ev.date_time), "EEEE, d 'de' MMMM", { locale: ptBR });
    const emoji = CATEGORY_EMOJI[ev.category] || "🎉";
    return {
      full: `${emoji} ${ev.title.toUpperCase()}\n\nHoje tem! Não perca:\n\n📅 ${dayFull}\n🕐 ${h}\n📍 ${ev.venue_name || "Local a confirmar"}\n\n👉 Garanta sua presença — mais info no ROXOU!\n\nroxou.com.br\n\n#roxou #eventosprudente #roles`,
      short: `${emoji} Hoje: ${ev.title}\n🕐 ${h}${ev.venue_name ? ` · 📍 ${ev.venue_name}` : ""}\n\n👉 roxou.com.br`,
    };
  }

  if (mode === "top") {
    const top = events.slice(0, 5);
    const ranked = top.map((e, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`;
      const h = format(new Date(e.date_time), "HH'h'mm");
      return `${medal} ${e.title}\n🕐 ${h}${e.venue_name ? ` · ${e.venue_name}` : ""}`;
    }).join("\n\n");
    return {
      full: `🏆 TOP ROLÊS DE HOJE\n\n${ranked}\n\n🔥 Não fique de fora!\n👉 roxou.com.br\n\n#roxou #toprolês #prudente`,
      short: `🏆 Top ${top.length} de hoje!\n${top.slice(0, 3).map((e, i) => `${i + 1}. ${e.title}`).join("\n")}\n\n👉 roxou.com.br`,
    };
  }

  // agenda
  const top = events.slice(0, 10);
  const lines = top.map(e => {
    const h = format(new Date(e.date_time), "HH'h'mm");
    const emoji = CATEGORY_EMOJI[e.category] || "📌";
    return `${emoji} ${e.title}\n🕐 ${h}${e.venue_name ? ` · 📍 ${e.venue_name}` : ""}`;
  }).join("\n\n");
  return {
    full: `📅 AGENDA DE HOJE — ${todayStr}\n\nConfira o que rola hoje:\n\n${lines}\n\n👉 Mais info em roxou.com.br\n\nSalva esse post! 🔖\n\n#roxou #agenda #prudente`,
    short: `📅 Agenda de hoje!\n\n${top.slice(0, 5).map(e => `• ${e.title} — ${format(new Date(e.date_time), "HH'h'")}`).join("\n")}\n\n👉 roxou.com.br`,
  };
}
