import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin, corsHeaders } from "../_shared/requireAdmin.ts";

// ─────────────────────────────────────────────────────────────────────────────
// 🎵 Mapeamento de gênero/categoria para "tipo de atração"
// ─────────────────────────────────────────────────────────────────────────────
const ATTRACTION_LABEL: Record<string, { label: string; emoji: string; short: string }> = {
  sertanejo:    { label: "Sertanejo ao vivo",   emoji: "🤠", short: "sertanejo" },
  funk:         { label: "Funk",                emoji: "🔊", short: "funk" },
  pagode_samba: { label: "Pagode e Samba",      emoji: "🥁", short: "pagode e samba" },
  pagode:       { label: "Pagode",              emoji: "🥁", short: "pagode" },
  samba:        { label: "Samba",               emoji: "🥁", short: "samba" },
  eletronica:   { label: "Eletrônica / DJ Set", emoji: "🪩", short: "eletrônica" },
  eletronico:   { label: "Eletrônica / DJ Set", emoji: "🪩", short: "eletrônica" },
  rock:         { label: "Rock ao vivo",        emoji: "🎸", short: "rock" },
  pop_rock:     { label: "Pop / Rock cover",    emoji: "🎤", short: "pop/rock" },
  pop:          { label: "Pop ao vivo",         emoji: "🎤", short: "pop" },
  mpb:          { label: "MPB / Voz e violão",  emoji: "🎶", short: "MPB" },
  standup:      { label: "Stand-up Comedy",     emoji: "🎭", short: "stand-up" },
  universitario:{ label: "Festa universitária", emoji: "🎓", short: "festa universitária" },
  festa:        { label: "Festa",               emoji: "🎉", short: "festa" },
  balada:       { label: "Balada",              emoji: "🪩", short: "balada" },
  bar:          { label: "Bar / Música ao vivo",emoji: "🍺", short: "música ao vivo" },
  show:         { label: "Show ao vivo",        emoji: "🎤", short: "show" },
  cultural:     { label: "Evento cultural",     emoji: "🎭", short: "rolê cultural" },
  restaurante:  { label: "Gastronomia",         emoji: "🍽️", short: "gastronomia" },
  acustico:     { label: "Música acústica",     emoji: "🎶", short: "som acústico" },
  flashback:    { label: "Flashback",           emoji: "💿", short: "flashback" },
  forro:        { label: "Forró",               emoji: "🪗", short: "forró" },
  arrocha:      { label: "Arrocha",             emoji: "🎶", short: "arrocha" },
  axe:          { label: "Axé",                 emoji: "🥁", short: "axé" },
  rap_trap:     { label: "Rap / Trap",          emoji: "🎤", short: "rap/trap" },
  open_format:  { label: "Open Format",         emoji: "🎚️", short: "open format" },
};

function resolveAttraction(category?: string, subCategory?: string, partnerStyle?: string) {
  // Prioridade: estilo do evento (sub) > estilo primário do local > categoria do evento.
  const sub = String(subCategory || "").toLowerCase().trim();
  const ps  = String(partnerStyle || "").toLowerCase().trim();
  const cat = String(category || "").toLowerCase().trim();
  return ATTRACTION_LABEL[sub]
      || ATTRACTION_LABEL[ps]
      || ATTRACTION_LABEL[cat]
      || { label: "Música e resenha", emoji: "🎶", short: "rolê" };
}

// Label humano para `partner.type` quando entrar na frase narrativa
const PARTNER_TYPE_LABEL: Record<string, string> = {
  bar: "bar", restaurante: "restaurante", espetinho: "espetinho",
  lounge: "lounge", balada: "balada", "casa de shows": "casa de shows",
  pub: "pub", choperia: "choperia", adega: "adega", tabacaria: "tabacaria",
  cultural: "espaço cultural", outro: "casa",
};

// Extrai um possível nome de artista do título (sem inventar).
// Suporta: "FESTA com ARTISTA", "FESTA - ARTISTA", "FESTA | ARTISTA", "FESTA feat ARTISTA"
function extractArtistFromTitle(title?: string): string {
  const t = String(title || "").trim();
  if (!t) return "";
  const patterns: RegExp[] = [
    /\b(?:com|c\/)\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ' .&]{1,40})$/u,
    /\s[-–—|]\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ' .&]{1,40})$/u,
    /\bfeat\.?\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ' .&]{1,40})$/iu,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m && m[1]) {
      const cand = m[1].trim().replace(/\s+/g, " ");
      // evita pegar palavras genéricas curtas
      if (cand.length >= 3 && !/^(ao vivo|hoje|live|show|festa|noite)$/i.test(cand)) {
        return cand;
      }
    }
  }
  return "";
}

// ─────────────────────────────────────────────────────────────────────────────
// 🎯 CTAs rotativos (sem clichês, sem "não fique de fora" / "bora marcar")
// ─────────────────────────────────────────────────────────────────────────────
const CTA_BANK: string[] = [
  "Programação completa na agenda da Roxou.",
  "Veja o evento na Roxou e combine seu rolê.",
  "Mais detalhes em roxou.com.br/agenda.",
  "Confira o que rola na cidade pela Roxou.",
  "A Roxou tem a agenda completa do fim de semana.",
  "Saiba mais sobre o rolê na Roxou.",
  "Veja a agenda da semana em roxou.com.br.",
  "Acompanhe a programação local pela Roxou.",
  "Encontre esse e outros rolês na Roxou.",
  "Detalhes e ingressos pela página do evento na Roxou.",
];

function pickFromBank<T>(bank: T[], seed: number): T {
  const idx = ((Math.floor(seed) % bank.length) + bank.length) % bank.length;
  return bank[idx];
}

// ─────────────────────────────────────────────────────────────────────────────
// 📅 Datas oficiais (timezone SP)
// ─────────────────────────────────────────────────────────────────────────────
function formatOfficialDate(iso: string) {
  const dt = new Date(iso);
  const dateLong = dt.toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" });
  const dateShort = dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
  const time = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  const timeLabel = time.replace(":", "h").replace(/^0/, "");
  const weekdayFull = dt.toLocaleDateString("pt-BR", { weekday: "long", timeZone: "America/Sao_Paulo" });
  // Sexta, Sábado, Domingo... (capitalized, sem "-feira")
  const weekdayShort = weekdayFull
    .replace("-feira", "")
    .replace(/^./, (c) => c.toUpperCase());
  // Hora válida? (00:00 é sinal de "sem hora")
  const hasRealTime = !(dt.getUTCHours() === 0 && dt.getUTCMinutes() === 0 && time === "00:00");
  // Hoje (SP)?
  const todaySP = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const eventDaySP = dt.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const isToday = todaySP === eventDaySP;
  return { dateLong, dateShort, timeLabel, weekdayFull, weekdayShort, hasRealTime, isToday };
}

// ─────────────────────────────────────────────────────────────────────────────
// 📍 Localização
// ─────────────────────────────────────────────────────────────────────────────
function buildLocationLine(venue?: string | null, neighborhood?: string | null, city?: string | null) {
  const parts: string[] = [];
  if (venue) parts.push(venue);
  const loc = [neighborhood, city].filter(Boolean).join(", ");
  if (parts.length && loc) return `${parts.join(" ")} — ${loc}`;
  return parts.join(" ") || loc || "";
}

// ─────────────────────────────────────────────────────────────────────────────
// 🚫 Frases banidas (cara de IA / cara de release)
// ─────────────────────────────────────────────────────────────────────────────
const FORBIDDEN_RE = /\b(?:imperd[ií]vel|n[ãa]o (?:perca|fique de fora)|prepare-se|preparem-se|venha curtir|vem curtir|noite inesquec[ií]vel|experi[êe]ncia [úu]nica|promete (?:ser|agitar|ser [ée]pico)|energia contagiante|vibe contagiante|reserve sua data|celebrando|proporcionando|embalar a noite|a cidade vai parar|evento completo|compartilhe com a galera|clima de pura|bora marcar quem vai junto|mesa cheia e gente boa|rol[êe] confirmado|marca quem n[ãa]o pode perder|j[áa] manda no grupo)\b/gi;
const FILLER_RE = /\b(?:em breve)\b/gi;

function stripForbidden(s: string): string {
  return (s || "").replace(FORBIDDEN_RE, "").replace(FILLER_RE, "").replace(/\s{2,}/g, " ").replace(/\s+\./g, ".").trim();
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

// ─────────────────────────────────────────────────────────────────────────────
// 🧩 Detectar template usado em descrições anteriores (fingerprint)
// ─────────────────────────────────────────────────────────────────────────────
function detectTemplateId(text: string): number | null {
  const t = (text || "").toLowerCase();
  if (!t) return null;
  if (t.includes("o que você precisa saber")) return 0; // legado — evitar
  if (t.includes("bora marcar")) return 2;
  if (t.includes("mais detalhes na agenda")) return 3;
  if (t.includes("data:") && t.includes("horário:") && t.includes("local:")) return 4;
  if (t.includes("salva esse rolê") || t.includes("procurando um rolê")) return 5;
  if (t.includes("ganha clima")) return 6;
  if (t.includes("tem batuque") || t.includes("rolê confirmado")) return 7;
  // Minimalista: muito curto, várias linhas
  if (text.length < 180 && (text.match(/\n/g)?.length || 0) >= 3) return 8;
  return 1; // default direto
}

// ─────────────────────────────────────────────────────────────────────────────
// 🎬 8 TEMPLATES — cada um devolve HTML pronto
// ─────────────────────────────────────────────────────────────────────────────
type Ctx = {
  title: string;
  venue: string;          // pode ser ""
  attractionLabel: string;
  attractionShort: string;
  emoji: string;
  weekdayShort: string;   // "Sexta"
  dateShort: string;      // "29/05"
  dateLong: string;       // "29 de maio"
  timeLabel: string;      // "17h"
  hasRealTime: boolean;
  isToday: boolean;
  city: string;
  neighborhood: string;
  locationLine: string;
  hype: string;           // 1-2 frases vindas da IA (opcional)
  cta: string;
  seed: number;
  // 🆕 Novos campos do parceiro/evento
  partnerTypeLabel: string;   // ex.: "restaurante", "bar"
  partnerSummary: string;     // short_description (1 frase do local)
  partnerSecondaryStyles: string[]; // labels curtos
  artist: string;             // extraído do título (se houver)
};

function whenOpener(ctx: Ctx): string {
  if (ctx.isToday) return "Hoje";
  return ctx.weekdayShort || "Nesta data";
}

// — Template 1: Direto e popular —
function tplDireto(c: Ctx): string {
  const opener = whenOpener(c);
  const venuePart = c.venue ? ` no ${c.venue}` : "";
  const head = `${opener} tem ${c.attractionShort}${venuePart}.`;
  const lines: string[] = [];
  lines.push(`<p>${escapeHtml(head)}</p>`);
  if (c.hype) lines.push(`<p>${escapeHtml(c.hype)}</p>`);
  const items: string[] = [];
  items.push(`📅 ${escapeHtml(c.weekdayShort)}, ${escapeHtml(c.dateShort)}`);
  if (c.hasRealTime) items.push(`🕒 ${escapeHtml(c.timeLabel)}`);
  if (c.venue) items.push(`📍 ${escapeHtml(c.venue)}`);
  lines.push(`<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`);
  lines.push(`<p>${escapeHtml(c.cta)}</p>`);
  return lines.join("");
}

// — Template 2: Chamada de rolê —
function tplChamada(c: Ctx): string {
  const opener = whenOpener(c);
  const head = `${opener} pede ${c.attractionShort} com som ao vivo e pegada de bairro.`;
  const subjectBit = c.artist ? `${c.artist}` : c.title;
  const sub = c.venue
    ? `${subjectBit} no ${c.venue}${c.city ? `, em ${c.city}` : ""}.`
    : `${subjectBit}${c.city ? `, em ${c.city}` : ""}.`;
  const items: string[] = [];
  if (c.venue) items.push(`📍 ${escapeHtml(c.venue)}`);
  if (c.hasRealTime) items.push(`🕒 A partir das ${escapeHtml(c.timeLabel)}`);
  items.push(`${c.emoji} ${escapeHtml(c.attractionLabel)}`);
  const html = [
    `<p>${escapeHtml(head)}</p>`,
    `<p>${escapeHtml(sub)}</p>`,
    `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`,
    `<p>${escapeHtml(c.cta)}</p>`,
  ];
  return html.join("");
}

// — Template 3: Curto para Instagram —
function tplCurto(c: Ctx): string {
  const opener = c.isToday ? `Hoje com ${c.attractionShort} na cidade` : `${c.weekdayShort} com ${c.attractionShort} na área`;
  const subject = c.artist ? c.artist : (c.venue || c.attractionLabel);
  const where = c.venue && c.artist ? `${subject} no ${c.venue}` : subject;
  const when = c.hasRealTime ? `, a partir das ${c.timeLabel}` : "";
  return [
    `<p>${escapeHtml(opener)}. ${c.emoji}</p>`,
    `<p>${escapeHtml(`${where}${when}.`)}</p>`,
    `<p>${escapeHtml(c.cta)}</p>`,
  ].join("");
}

// — Template 4: Agenda informativa —
function tplAgenda(c: Ctx): string {
  const lead = c.venue
    ? `A programação de ${c.weekdayShort.toLowerCase()} tem ${c.attractionShort} no ${c.venue}.`
    : `A programação de ${c.weekdayShort.toLowerCase()} tem ${c.title}.`;
  const items: string[] = [`Data: ${c.dateShort}`];
  if (c.hasRealTime) items.push(`Horário: ${c.timeLabel}`);
  if (c.venue) items.push(`Local: ${c.venue}`);
  if (c.city) items.push(`Cidade: ${c.city}`);
  return [
    `<p>${escapeHtml(lead)}</p>`,
    `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`,
    `<p>Veja o evento completo na Roxou.</p>`,
  ].join("");
}

// — Template 5: Tom de descoberta —
function tplDescoberta(c: Ctx): string {
  const q = c.isToday
    ? "Procurando um rolê pra hoje?"
    : `Procurando um rolê pra ${c.weekdayShort.toLowerCase()}?`;
  const body = c.venue
    ? `O ${c.venue} recebe ${c.title}${c.city ? ` em ${c.city}` : ""}.`
    : `${c.title}${c.city ? ` em ${c.city}` : ""}.`;
  return [
    `<p>${escapeHtml(q)}</p>`,
    `<p>${escapeHtml(body)}</p>`,
    `<p>Salva esse rolê e manda pra quem curte ${escapeHtml(c.attractionShort)}.</p>`,
  ].join("");
}

// — Template 6: Tom de notícia local —
function tplNoticia(c: Ctx): string {
  const where = c.city ? ` em ${c.city}` : "";
  const venuePart = c.venue ? ` no ${c.venue}` : "";
  const lead = `${c.weekdayShort}${where} ganha clima de ${c.attractionShort}${venuePart}.`;
  const second = c.hasRealTime
    ? `${c.title} é a atração para animar o público a partir das ${c.timeLabel}.`
    : `${c.title} é a atração confirmada na agenda do dia.`;
  return [
    `<p>${escapeHtml(lead)}</p>`,
    `<p>${escapeHtml(second)}</p>`,
    `<p>Confira a agenda completa na Roxou.</p>`,
  ].join("");
}

// — Template 7: Hype moderado —
function tplHype(c: Ctx): string {
  const head = `Som, mesa e ${c.attractionShort} na agenda.`;
  const subject = c.artist ? c.artist : c.attractionLabel;
  const line = c.venue
    ? `${subject} no ${c.venue} ${c.isToday ? "hoje" : `nesta ${c.weekdayShort.toLowerCase()}`}, ${c.dateShort}.`
    : `${subject} ${c.isToday ? "hoje" : `nesta ${c.weekdayShort.toLowerCase()}`}, ${c.dateShort}.`;
  const items: string[] = [];
  if (c.city) items.push(`📍 ${escapeHtml(c.city)}`);
  if (c.hasRealTime) items.push(`🕒 ${escapeHtml(c.timeLabel)}`);
  items.push(`${c.emoji} ${escapeHtml(c.attractionLabel)}`);
  return [
    `<p>${escapeHtml(head)}</p>`,
    `<p>${escapeHtml(line)}</p>`,
    `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`,
    `<p>${escapeHtml(c.cta)}</p>`,
  ].join("");
}

// — Template 8: Minimalista —
function tplMinimal(c: Ctx): string {
  const lines: string[] = [];
  lines.push(`<p>${escapeHtml(c.title)}.</p>`);
  if (c.venue) lines.push(`<p>${escapeHtml(c.venue)}.</p>`);
  const when = c.hasRealTime
    ? `${c.weekdayShort}, ${c.dateShort}, às ${c.timeLabel}.`
    : `${c.weekdayShort}, ${c.dateShort}.`;
  lines.push(`<p>${escapeHtml(when)}</p>`);
  const tail = c.city ? `${c.attractionShort} em ${c.city}.` : `${c.attractionShort}.`;
  lines.push(`<p>${escapeHtml(tail.charAt(0).toUpperCase() + tail.slice(1))}</p>`);
  lines.push(`<p>Confira na Roxou.</p>`);
  return lines.join("");
}

// — Template 9: Narrativo editorial (prioridade alta, 2–4 parágrafos) —
// Regras: nunca repete o título cru; contextualiza pelo tipo do local +
// bairro/cidade; quando houver artista, abre falando do show; quando for
// bar/restaurante, contextualiza o ambiente.
function tplVenueNarrative(c: Ctx): string {
  const ambientByType: Record<string, string> = {
    bar: "A casa é parada típica de bar de bairro, com mesa na calçada e chope gelado.",
    pub: "O pub mantém o clima de happy hour estendido, com cerveja artesanal e som médio.",
    choperia: "A choperia é ponto certo para encerrar a semana no ritmo da rua.",
    restaurante: "O restaurante combina cozinha do dia a dia com música ao vivo durante a noite.",
    espetinho: "O espetinho é daqueles endereços de mesa na rua, chope e brasa direto.",
    lounge: "O lounge aposta em iluminação baixa e drinks autorais para a noite.",
    balada: "A balada entrega pista cheia e som alto até de madrugada.",
    "casa de shows": "A casa de shows recebe atrações com palco montado e produção dedicada.",
    adega: "A adega é endereço de carta de vinhos e ambiente intimista.",
    tabacaria: "A tabacaria mistura narguilé, drinks e som ambiente para conversar.",
    cultural: "O espaço cultural recebe programações que misturam música, arte e encontro.",
  };

  // ─── Parágrafo 1 — abertura editorial, sem citar o título ───
  const opener = c.isToday ? "Hoje" : `Nesta ${c.weekdayShort.toLowerCase()}, ${c.dateShort},`;
  const typeLabel = c.partnerTypeLabel || "casa";
  const localBit = c.neighborhood && c.city
    ? `${typeLabel} no ${c.neighborhood}, em ${c.city}`
    : c.neighborhood
      ? `${typeLabel} no ${c.neighborhood}`
      : c.city
        ? `${typeLabel} em ${c.city}`
        : typeLabel;

  let p1: string;
  if (c.artist) {
    // Foco no show
    const venuePart = c.venue ? ` no ${c.venue}` : "";
    p1 = `${opener} ${c.artist} sobe ao palco${venuePart}, ${localBit}, com repertório ${c.attractionShort}.`;
  } else if (c.venue) {
    p1 = `${opener} o ${c.venue} entra na agenda da cidade com programação de ${c.attractionShort}, ${localBit}.`;
  } else {
    p1 = `${opener} a noite tem ${c.attractionShort}${c.city ? ` em ${c.city}` : ""}.`;
  }

  // ─── Parágrafo 2 — ambiente do local (curado pelo tipo + summary do parceiro) ───
  const ambientLine = c.partnerTypeLabel
    ? ambientByType[String(c.partnerTypeLabel).toLowerCase()] || ""
    : "";
  const p2Parts: string[] = [];
  if (c.partnerSummary) p2Parts.push(c.partnerSummary);
  if (ambientLine && !c.partnerSummary) p2Parts.push(ambientLine);
  if (c.partnerSecondaryStyles.length) {
    p2Parts.push(
      `A casa também costuma rodar ${c.partnerSecondaryStyles.slice(0, 2).join(" e ")} ao longo da semana.`,
    );
  }
  const p2 = p2Parts.join(" ").trim();

  // ─── Parágrafo 3 — operação prática (horário + dia), sem listão ───
  const timeBit = c.hasRealTime ? `a partir das ${c.timeLabel}` : "com horário a confirmar";
  let p3: string;
  if (c.artist) {
    p3 = `O show começa ${timeBit}. ${c.isToday ? "É para hoje" : `É ${c.weekdayShort.toLowerCase()}, ${c.dateShort}`}, e a entrada acompanha a programação da casa.`;
  } else {
    p3 = `A programação rola ${timeBit}${c.isToday ? ", hoje mesmo" : `, ${c.weekdayShort.toLowerCase()}, ${c.dateShort}`}.`;
  }

  // ─── Parágrafo 4 — CTA variável ───
  const p4 = c.cta;

  const blocks: string[] = [];
  blocks.push(`<p>${escapeHtml(p1)}</p>`);
  if (p2) blocks.push(`<p>${escapeHtml(p2)}</p>`);
  blocks.push(`<p>${escapeHtml(p3)}</p>`);
  blocks.push(`<p>${escapeHtml(p4)}</p>`);
  return blocks.join("");
}

const TEMPLATES = [tplDireto, tplChamada, tplCurto, tplAgenda, tplDescoberta, tplNoticia, tplHype, tplMinimal, tplVenueNarrative];
const TEMPLATE_NAMES = ["direto", "chamada", "curto", "agenda", "descoberta", "noticia", "hype", "minimal", "venue_narrative"];

// ─────────────────────────────────────────────────────────────────────────────
// 🧠 Escolha inteligente do template
// ─────────────────────────────────────────────────────────────────────────────
function chooseTemplate(
  seed: number,
  previousDescs: string[],
  hasMinimalData: boolean,
  hasRichVenue: boolean,
): number {
  const recent = (previousDescs || [])
    .map(detectTemplateId)
    .filter((x): x is number => x !== null && x >= 1 && x <= 9)
    .slice(-5)
    .map((x) => x - 1);

  // Pouca info → templates curtos. Info rica de parceiro → privilegia narrativo (T9).
  const preferred = hasMinimalData
    ? [2, 7, 4]
    : hasRichVenue
      ? [8, 0, 5, 1, 8, 3, 6, 8, 4] // T9 (idx 8) entra duas vezes para ganhar peso
      : [0, 1, 2, 3, 4, 5, 6, 7];

  const start = ((Math.floor(seed) % preferred.length) + preferred.length) % preferred.length;
  for (let i = 0; i < preferred.length; i++) {
    const idx = preferred[(start + i) % preferred.length];
    if (!recent.includes(idx)) return idx;
  }
  return preferred[start];
}

// ─────────────────────────────────────────────────────────────────────────────
// 🤖 Geração opcional de hype curto (1-2 frases) via IA
// ─────────────────────────────────────────────────────────────────────────────
async function generateHype(
  ctx: Pick<Ctx, "title" | "venue" | "attractionLabel" | "city">,
  apiKey: string,
): Promise<string> {
  try {
    const sys = `Você escreve para a Roxou, agenda de rolês do interior de SP. Tom: humano, direto, local, sem exagero, sem release. Proibido: "imperdível", "não perca", "prepare-se", "noite inesquecível", "experiência única", "celebrando", "embalar a noite", "em breve". Tarefa: gere UMA frase curta (no máximo 22 palavras) que contextualize o evento com personalidade. NÃO cite data, hora, dia da semana, preço ou ingresso. NÃO invente atração ou artista. Use só o que vier nos dados. Sem emoji. Sem aspas.`;
    const usr = [
      `Evento: ${ctx.title}`,
      ctx.venue ? `Local: ${ctx.venue}` : null,
      `Tipo: ${ctx.attractionLabel}`,
      ctx.city ? `Cidade: ${ctx.city}` : null,
    ].filter(Boolean).join("\n");
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
        temperature: 0.95,
      }),
    });
    if (!resp.ok) return "";
    const data = await resp.json();
    const raw = data.choices?.[0]?.message?.content || "";
    return stripForbidden(String(raw).replace(/^["'`]+|["'`]+$/g, "").split("\n")[0] || "").slice(0, 220);
  } catch {
    return "";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 🚀 Handler
// ─────────────────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const {
      title,
      venue_name,
      date_time,
      category,
      sub_category,
      seed_index,
      neighborhood,
      address,
      city,
      partner_id,
      venue_description: venueDescIn,
      partner_type: partnerTypeIn,
      previous_descriptions = [],
    } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    if (!date_time) {
      return new Response(JSON.stringify({ error: "date_time é obrigatório (fonte oficial)." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enriquecimento opcional via partner
    let partnerType: string | null = partnerTypeIn || null;
    let partnerNeighborhood: string | null = neighborhood || null;
    let partnerCity: string | null = city || null;
    let partnerSummary: string | null = venueDescIn || null;
    let partnerMusicPrimary: string | null = null;
    let partnerMusicSecondary: string[] = [];

    if (partner_id) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, serviceKey);
        const { data: p } = await supabase
          .from("partners")
          .select("type, neighborhood, city, short_description, full_description, music_style_primary, music_styles_secondary")
          .eq("id", partner_id)
          .maybeSingle();
        if (p) {
          if (!partnerType) partnerType = p.type || null;
          if (!partnerNeighborhood) partnerNeighborhood = p.neighborhood || null;
          if (!partnerCity) partnerCity = p.city || null;
          if (!partnerSummary) {
            // prefere short; full vira fallback truncado em 1 frase
            partnerSummary = (p.short_description || "")
              || (p.full_description ? String(p.full_description).split(/(?<=\.)\s/)[0] : "")
              || null;
          }
          partnerMusicPrimary = (p as any).music_style_primary || null;
          partnerMusicSecondary = Array.isArray((p as any).music_styles_secondary)
            ? (p as any).music_styles_secondary.filter(Boolean)
            : [];
        }
      } catch (_e) { /* segue */ }
    }

    const dateInfo = formatOfficialDate(date_time);
    const attraction = resolveAttraction(category, sub_category, partnerMusicPrimary || undefined);

    const cleanTitle = String(title || "").trim();
    const cleanVenue = String(venue_name || "").trim();
    const cleanCity = String(partnerCity || "").trim();
    const cleanNeighborhood = String(partnerNeighborhood || "").trim();
    const artist = extractArtistFromTitle(cleanTitle);

    const seed = Number.isFinite(Number(seed_index)) ? Number(seed_index) : Math.floor(Math.random() * 9999);

    const hasMinimalData = !cleanVenue && !cleanCity && !cleanNeighborhood;
    const hasRichVenue = Boolean(
      cleanVenue && (partnerType || partnerSummary || partnerMusicPrimary),
    );

    const tplIdx = chooseTemplate(seed, previous_descriptions, hasMinimalData, hasRichVenue);

    // Gera hype curto (opcional) — só usado por T1 (e ignorado pelos outros)
    let hype = "";
    if (tplIdx === 0) {
      hype = await generateHype(
        { title: cleanTitle, venue: cleanVenue, attractionLabel: attraction.label, city: cleanCity },
        LOVABLE_API_KEY,
      );
    }

    const cta = pickFromBank(CTA_BANK, seed + tplIdx);

    // Labels secundários (apenas os que conhecemos)
    const secondaryLabels = partnerMusicSecondary
      .map((v) => ATTRACTION_LABEL[String(v).toLowerCase()]?.short)
      .filter((x): x is string => !!x);

    const ctx: Ctx = {
      title: cleanTitle,
      venue: cleanVenue,
      attractionLabel: attraction.label,
      attractionShort: attraction.short,
      emoji: attraction.emoji,
      weekdayShort: dateInfo.weekdayShort,
      dateShort: dateInfo.dateShort,
      dateLong: dateInfo.dateLong,
      timeLabel: dateInfo.timeLabel,
      hasRealTime: dateInfo.hasRealTime,
      isToday: dateInfo.isToday,
      city: cleanCity,
      neighborhood: cleanNeighborhood,
      locationLine: buildLocationLine(cleanVenue, cleanNeighborhood, cleanCity),
      hype,
      cta,
      seed,
      partnerTypeLabel: PARTNER_TYPE_LABEL[String(partnerType || "").toLowerCase()] || (partnerType || ""),
      partnerSummary: stripForbidden(String(partnerSummary || "").trim()),
      partnerSecondaryStyles: secondaryLabels,
      artist,
    };


    const html = TEMPLATES[tplIdx](ctx);

    // chamada para o card (mantida)
    const chamadaSite = cleanTitle.length > 60 ? cleanTitle.slice(0, 57) + "..." : cleanTitle;

    // Warnings de informação faltante
    const warnings: string[] = [];
    if (!cleanVenue) warnings.push("sem_local");
    if (!cleanCity && !cleanNeighborhood) warnings.push("sem_cidade");
    if (!dateInfo.hasRealTime) warnings.push("sem_horario");

    const captionConfidence = warnings.length === 0 ? "high" : warnings.length === 1 ? "medium" : "low";

    console.log("[generate-description]", {
      template: TEMPLATE_NAMES[tplIdx],
      tplIdx,
      seed,
      hasMinimalData,
      warnings,
      previousCount: Array.isArray(previous_descriptions) ? previous_descriptions.length : 0,
    });

    return new Response(
      JSON.stringify({
        chamada_site: chamadaSite,
        descricao_rica: html,
        description: html,
        description_html: html,
        caption_style: TEMPLATE_NAMES[tplIdx],
        caption_template_id: tplIdx + 1,
        caption_confidence: captionConfidence,
        caption_warnings: warnings,
        used_flyer: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("generate-description error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
