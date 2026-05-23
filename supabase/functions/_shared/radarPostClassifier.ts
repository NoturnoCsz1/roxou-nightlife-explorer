/**
 * Espelho Deno do classificador do Radar IA (src/lib/radarPostClassifier.ts).
 * Mantenha sincronizado. Sem deps externas.
 */

export type RadarPostType =
  | "event_flyer" | "music_event" | "party_event" | "bar_event"
  | "food_promo" | "menu" | "announcement" | "old_post"
  | "generic_post" | "invalid";

export type RadarDecision = "create" | "review" | "ignore";

export interface RadarExtracted {
  title: string | null;
  date: string | null;
  time: string | null;
  venue: string | null;
  artists: string[];
  genre: string | null;
  shortDescription: string | null;
}

export interface RadarClassification {
  type: RadarPostType;
  score: number;
  decision: RadarDecision;
  confidence: "high" | "medium" | "low";
  extracted: RadarExtracted;
  reasons: string[];
  matchedSignals: Record<string, string[]>;
}

const STRONG_EVENT_KW = [
  "show","ao vivo","line-up","line up","lineup","atração","atracao","atrações","atracoes",
  "dj ","mc ","banda","pagode","sertanejo","funk","eletronica","eletrônica","rock",
  "samba","forró","forro","axé","axe","rave","sunset","balada","festa","baile","festival",
  "open bar","openbar","entrada","ingresso","ingressos","reserva","reservas","lista vip",
  "couvert","passaporte","camarote","área vip","area vip",
];
const WEEKDAY_KW = ["hoje","amanha","amanhã","sexta","sábado","sabado","domingo","segunda","terça","terca","quarta","quinta","sextou","sabadou","domingou"];
const FOOD_KW = [
  "cardápio","cardapio","menu novo","prato","pratos","executivo","executivos",
  "hambúrguer","hamburguer","burger","pizza","massa","massas","esfiha","esfihas",
  "rodízio","rodizio","buffet","churrasco","porção","porcao","porções","porcoes",
  "delivery","peça já","peca ja","peça agora","peca agora","frete grátis","frete gratis",
  "almoço","almoco","jantar","sobremesa","sobremesas",
];
const PROMO_KW = ["promoção","promocao","combo","desconto","compre","leve","oferta","imperdível","imperdivel","preço especial","preco especial","dose dupla","happy hour de comida","2 por 1","2x1","queima de estoque","liquidação","liquidacao"];
const ANNOUNCE_KW = ["comunicado","funcionamento","horário especial","horario especial","fechado hoje","abriremos","não abriremos","nao abriremos","manutenção","manutencao","aviso","informamos","atenção clientes","atencao clientes"];
const SWEEPSTAKE_KW = ["sorteio","sorteamos","sorteios","ganhe um","concorra","participe e ganhe"];
const COMING_SOON_KW = ["em breve","aguardem","logo mais","data a confirmar","data em breve"];

const TIME_RE = /\b([01]?\d|2[0-3])\s?h(?:[:.]?[0-5]\d)?\b/;
const VENUE_HINT_RE = /\b(bar|casa|club|clube|pub|lounge|disco|boate|hall|arena|espa[çc]o|rooftop)\b/i;
const ARTIST_HINT_RE = /\b(dj|mc|banda|cantor|cantora)\s+[A-ZÀ-Ý][\wÀ-ÿ\-\.]+(?:\s+[A-ZÀ-Ý][\wÀ-ÿ\-\.]+){0,2}/g;
const GENRE_MAP: Record<string, string> = {
  funk: "funk", pagode: "pagode_samba", samba: "pagode_samba",
  sertanejo: "sertanejo", "eletrônica": "eletronica", eletronica: "eletronica",
  techno: "eletronica", house: "eletronica", rave: "eletronica",
  rock: "rock", forró: "forro", forro: "forro", axé: "axe", axe: "axe",
};

const WEEKDAYS: Record<string, number> = {
  domingo: 0, segunda: 1, terca: 2, "terça": 2, quarta: 3, quinta: 4,
  sexta: 5, sabado: 6, "sábado": 6, sextou: 5, sabadou: 6, domingou: 0,
};
const MONTHS: Record<string, number> = {
  janeiro: 0, fevereiro: 1, marco: 2, "março": 2, abril: 3, maio: 4, junho: 5,
  julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
};

function lower(s: string | null | undefined) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function spNow(): Date {
  const n = new Date();
  return new Date(n.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
}

function resolveEventDate(text: string): string | null {
  const t = lower(text);
  const ref = spNow();
  if (/\bhoje\b/.test(t)) return ymd(ref);
  if (/\bamanha\b/.test(t)) { const d = new Date(ref); d.setDate(d.getDate() + 1); return ymd(d); }
  for (const [w, dow] of Object.entries(WEEKDAYS)) {
    if (new RegExp(`\\b${w}\\b`).test(t)) {
      const d = new Date(ref);
      const diff = (dow - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      return ymd(d);
    }
  }
  const m1 = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (m1) {
    const day = +m1[1], month = +m1[2]; let year = m1[3] ? +m1[3] : ref.getFullYear();
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const d = new Date(year, month - 1, day);
      if (!m1[3] && d.getTime() < ref.getTime() - 86400000) d.setFullYear(year + 1);
      return ymd(d);
    }
  }
  const m3 = t.match(/\b(\d{1,2})\s+de\s+(janeiro|fevereiro|marco|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/);
  if (m3) {
    const day = +m3[1], month = MONTHS[m3[2]];
    if (day && month != null) {
      const d = new Date(ref.getFullYear(), month, day);
      if (d.getTime() < ref.getTime() - 86400000) d.setFullYear(d.getFullYear() + 1);
      return ymd(d);
    }
  }
  return null;
}
function resolveEventTime(text: string): string | null {
  const t = lower(text);
  const m = t.match(/\b(\d{1,2})(?::|h)(\d{2})\b/) || t.match(/\b(\d{1,2})h\b/);
  if (!m) return null;
  const h = +m[1], mi = m[2] ? +m[2] : 0;
  if (h < 0 || h > 23 || mi < 0 || mi > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
}

function pickFirstLine(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.split(/\r?\n/).map((x) => x.trim()).find((x) => x.length >= 3);
  return t ? t.slice(0, 200) : null;
}
function detectArtists(text: string): string[] {
  const out = new Set<string>();
  const matches = text.match(ARTIST_HINT_RE) || [];
  for (const m of matches) {
    const c = m.replace(/\s+/g, " ").trim();
    if (c.length > 4 && c.length < 60) out.add(c);
  }
  return Array.from(out).slice(0, 8);
}
function detectGenre(textLower: string): string | null {
  for (const [kw, g] of Object.entries(GENRE_MAP)) if (textLower.includes(kw)) return g;
  return null;
}
function detectVenue(text: string): string | null {
  const m = text.match(new RegExp(`(${VENUE_HINT_RE.source})\\s+([A-Z0-9À-Ý][\\wÀ-ÿ\\-\\.&' ]{2,40})`, "i"));
  if (!m) return null;
  return `${m[1]} ${m[2]}`.trim().replace(/\s+/g, " ").slice(0, 60);
}
function daysSince(iso: string | null | undefined): number {
  if (!iso) return Infinity;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return Infinity;
  return (Date.now() - t) / 86_400_000;
}

export interface RadarPostInput {
  caption?: string | null;
  ocr?: string | null;
  timestamp?: string | null;
  partnerName?: string | null;
  knownDuplicate?: boolean;
}

export function classifyRadarPost(input: RadarPostInput): RadarClassification {
  const captionRaw = input.caption || "";
  const ocrRaw = input.ocr || "";
  const fullRaw = `${captionRaw}\n${ocrRaw}`;
  const full = lower(fullRaw);

  const matched = {
    strong: STRONG_EVENT_KW.filter((k) => full.includes(k)),
    food: FOOD_KW.filter((k) => full.includes(k)),
    promo: PROMO_KW.filter((k) => full.includes(k)),
    announce: ANNOUNCE_KW.filter((k) => full.includes(k)),
    sweepstake: SWEEPSTAKE_KW.filter((k) => full.includes(k)),
    coming_soon: COMING_SOON_KW.filter((k) => full.includes(k)),
  };
  const weekdayHits = WEEKDAY_KW.filter((k) => new RegExp(`\\b${k}\\b`).test(full));
  const hasTime = TIME_RE.test(full);

  const extracted: RadarExtracted = {
    title: pickFirstLine(captionRaw),
    date: resolveEventDate(fullRaw),
    time: hasTime ? resolveEventTime(fullRaw) : null,
    venue: detectVenue(fullRaw),
    artists: detectArtists(fullRaw),
    genre: detectGenre(full),
    shortDescription: pickFirstLine(captionRaw),
  };

  const reasons: string[] = [];
  let score = 50;

  if (matched.strong.length) { score += Math.min(30, matched.strong.length * 8); reasons.push(`Sinais de evento: ${matched.strong.slice(0,3).join(", ")}`); }
  if (extracted.date) { score += 15; reasons.push(`Data detectada: ${extracted.date}`); }
  if (weekdayHits.length) { score += 8; reasons.push(`Dia da semana: ${weekdayHits[0]}`); }
  if (extracted.time) { score += 10; reasons.push(`Horário detectado: ${extracted.time}`); }
  if (extracted.artists.length) { score += Math.min(12, extracted.artists.length * 4); reasons.push(`Atrações: ${extracted.artists.slice(0,2).join(", ")}`); }
  if (extracted.genre) score += 5;
  if (matched.food.length) score -= matched.food.length * 12;
  if (matched.promo.length) score -= matched.promo.length * 10;
  if (matched.announce.length) score -= matched.announce.length * 15;
  if (matched.sweepstake.length) score -= 20;
  if (matched.coming_soon.length && !extracted.date) score -= 25;

  const ageDays = daysSince(input.timestamp);
  const futureDate = extracted.date && new Date(`${extracted.date}T23:59:59-03:00`).getTime() >= Date.now() - 86_400_000;
  if (ageDays > 5 && !futureDate) { score -= 25; reasons.push(`Post antigo (${Math.round(ageDays)}d)`); }
  if (input.knownDuplicate) { score -= 40; reasons.unshift("Flyer já processado (duplicado)"); }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let type: RadarPostType = "generic_post";
  if (matched.announce.length >= 2 || (matched.announce.length && !matched.strong.length)) type = "announcement";
  else if (matched.food.length >= 2 && !matched.strong.length) type = matched.food.some((k) => /cardapio|menu/.test(k)) ? "menu" : "food_promo";
  else if (matched.promo.length && !matched.strong.length && !extracted.date) type = "food_promo";
  else if (ageDays > 5 && !futureDate) type = "old_post";
  else if (!extracted.date && !weekdayHits.length && !hasTime && !matched.strong.length) type = "generic_post";
  else if (matched.strong.some((k) => /dj|banda|cantor|show|ao vivo|line/.test(k))) type = "music_event";
  else if (matched.strong.some((k) => /festa|baile|balada|rave|sunset|festival/.test(k))) type = "party_event";
  else if (matched.strong.some((k) => /open bar|bar/.test(k))) type = "bar_event";
  else if (extracted.date || hasTime || weekdayHits.length) type = "event_flyer";

  let decision: RadarDecision;
  if (score >= 80) decision = "create";
  else if (score >= 60) decision = "review";
  else decision = "ignore";

  if (type === "announcement" || type === "menu" || type === "food_promo" || type === "old_post") decision = "ignore";

  if (!extracted.date && !extracted.time && !weekdayHits.length) {
    if (decision === "create") decision = "review";
    if (!matched.strong.length) decision = "ignore";
    if (!reasons.some((r) => /sem data/i.test(r))) reasons.push("Sem data clara");
  }

  if (!reasons.length) reasons.push("Sinais fracos de evento");

  const confidence: RadarClassification["confidence"] = score >= 80 ? "high" : score >= 60 ? "medium" : "low";

  return { type, score, decision, confidence, extracted, reasons, matchedSignals: matched };
}

// === Partner memory (mirror src/lib/radarPostClassifier.ts) ===
export interface PartnerMemorySummary {
  dominant_type: string | null;
  event_accuracy_score: number;
  promo_rate: number;
  menu_rate: number;
  ignore_rate: number;
  confidence: number;
  total_analyzed: number;
}

export function applyPartnerMemory(
  c: RadarClassification,
  mem: PartnerMemorySummary | null | undefined,
): RadarClassification {
  if (!mem || mem.confidence < 30 || mem.total_analyzed < 3) return c;
  let score = c.score;
  const reasons = [...c.reasons];
  let decision = c.decision;

  if (mem.event_accuracy_score >= 70) {
    score += 8;
    reasons.push(`Parceiro confiável (${mem.event_accuracy_score}% eventos reais)`);
  }
  if (mem.promo_rate >= 50) {
    score -= 12;
    reasons.push(`Parceiro posta muita promoção (${mem.promo_rate}%)`);
  }
  if (mem.menu_rate >= 40) {
    score -= 10;
    reasons.push(`Parceiro posta muito cardápio (${mem.menu_rate}%)`);
  }
  if (mem.ignore_rate >= 70) score -= 8;

  score = Math.max(0, Math.min(100, Math.round(score)));
  if (decision !== "ignore") {
    if (score >= 80) decision = "create";
    else if (score >= 60) decision = "review";
    else if (mem.confidence >= 60 && mem.event_accuracy_score < 20) decision = "ignore";
  }
  return { ...c, score, reasons, decision };
}
