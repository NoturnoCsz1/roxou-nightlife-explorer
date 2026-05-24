/**
 * Radar Post Classifier — heurística refinada para o Radar IA.
 *
 * Objetivo: separar flyer real de evento de promoção/cardápio/aviso/post antigo,
 * sem depender de IA, gerando um score 0–100 e razões legíveis.
 *
 * Saída usada por:
 *  - supabase/functions/automatic-event-hunter (mirror em _shared/)
 *  - src/pages/admin/RadarIA.tsx (badges + leitura rápida)
 *
 * NUNCA inventa data, hora, artista, local. Se a regex não casa, retorna null.
 * Timezone: America/Sao_Paulo (resolvido via instagramPostFilters).
 */

import { resolveEventDate, resolveEventTime } from "./instagramPostFilters";

export type RadarPostType =
  | "event_flyer"
  | "music_event"
  | "party_event"
  | "bar_event"
  | "food_promo"
  | "menu"
  | "announcement"
  | "old_post"
  | "generic_post"
  | "invalid";

export type RadarDecision = "create" | "review" | "ignore";

export interface RadarExtracted {
  title: string | null;
  date: string | null;        // YYYY-MM-DD
  time: string | null;        // HH:mm
  venue: string | null;
  artists: string[];
  genre: string | null;
  shortDescription: string | null;
}

export interface RadarClassification {
  type: RadarPostType;
  score: number;              // 0–100
  decision: RadarDecision;    // create / review / ignore
  confidence: "high" | "medium" | "low";
  extracted: RadarExtracted;
  reasons: string[];          // primeiro item = motivo principal
  matchedSignals: {
    strong: string[];
    food: string[];
    promo: string[];
    announce: string[];
    sweepstake: string[];
    coming_soon: string[];
  };
}

export interface RadarPostInput {
  caption?: string | null;
  ocr?: string | null;
  /** ISO timestamp do post no Instagram */
  timestamp?: string | null;
  partnerName?: string | null;
  /** Já tem flyer_fingerprint match? (vindo de dedupe externo) */
  knownDuplicate?: boolean;
}

// =====================================================================
// Sinais
// =====================================================================

const STRONG_EVENT_KW = [
  "show","ao vivo","line-up","line up","lineup","atração","atracao","atrações","atracoes",
  "dj ","mc ","banda","pagode","sertanejo","funk","eletronica","eletrônica","rock",
  "samba","forró","forro","axé","axe","rave","sunset","balada","festa","baile","festival",
  "open bar","openbar","entrada","ingresso","ingressos","reserva","reservas","lista vip",
  "couvert","passaporte","camarote","área vip","area vip",
];

const WEEKDAY_KW = [
  "hoje","amanha","amanhã","sexta","sábado","sabado","domingo","segunda","terça","terca",
  "quarta","quinta","sextou","sabadou","domingou",
];

const FOOD_KW = [
  "cardápio","cardapio","menu novo","prato","pratos","executivo","executivos",
  "hambúrguer","hamburguer","burger","pizza","massa","massas","esfiha","esfihas",
  "rodízio","rodizio","buffet","churrasco","porção","porcao","porções","porcoes",
  "delivery","peça já","peca ja","peça agora","peca agora","frete grátis","frete gratis",
  "almoço","almoco","jantar","sobremesa","sobremesas",
];

const PROMO_KW = [
  "promoção","promocao","combo","desconto","compre","leve","oferta","imperdível","imperdivel",
  "preço especial","preco especial","dose dupla","happy hour de comida","2 por 1","2x1",
  "queima de estoque","liquidação","liquidacao",
];

const ANNOUNCE_KW = [
  "comunicado","funcionamento","horário especial","horario especial","fechado hoje",
  "abriremos","não abriremos","nao abriremos","manutenção","manutencao","aviso",
  "informamos","atenção clientes","atencao clientes",
];

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

// =====================================================================
// Util
// =====================================================================

function lower(s: string | null | undefined) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
    const cleaned = m.replace(/\s+/g, " ").trim();
    if (cleaned.length > 4 && cleaned.length < 60) out.add(cleaned);
  }
  return Array.from(out).slice(0, 8);
}

function detectGenre(textLower: string): string | null {
  for (const [kw, g] of Object.entries(GENRE_MAP)) {
    if (textLower.includes(kw)) return g;
  }
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

// =====================================================================
// Classificador principal
// =====================================================================

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

  // Extração estruturada — NUNCA inventa
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

  // ---- Sinais positivos
  if (matched.strong.length) {
    score += Math.min(30, matched.strong.length * 8);
    reasons.push(`Sinais de evento: ${matched.strong.slice(0, 3).join(", ")}`);
  }
  if (extracted.date) {
    score += 15;
    reasons.push(`Data detectada: ${extracted.date}`);
  }
  if (weekdayHits.length) {
    score += 8;
    reasons.push(`Dia da semana: ${weekdayHits[0]}`);
  }
  if (extracted.time) {
    score += 10;
    reasons.push(`Horário detectado: ${extracted.time}`);
  }
  if (extracted.artists.length) {
    score += Math.min(12, extracted.artists.length * 4);
    reasons.push(`Atrações: ${extracted.artists.slice(0, 2).join(", ")}`);
  }
  if (extracted.genre) {
    score += 5;
  }

  // ---- Sinais negativos
  if (matched.food.length) score -= matched.food.length * 12;
  if (matched.promo.length) score -= matched.promo.length * 10;
  if (matched.announce.length) score -= matched.announce.length * 15;
  if (matched.sweepstake.length) score -= 20;
  if (matched.coming_soon.length && !extracted.date) score -= 25;

  // ---- Idade do post
  const ageDays = daysSince(input.timestamp);
  const futureDate = extracted.date && new Date(`${extracted.date}T23:59:59-03:00`).getTime() >= Date.now() - 86_400_000;
  if (ageDays > 5 && !futureDate) {
    score -= 25;
    reasons.push(`Post antigo (${Math.round(ageDays)}d)`);
  }

  // ---- Duplicado conhecido
  if (input.knownDuplicate) {
    score -= 40;
    reasons.unshift("Flyer já processado (duplicado)");
  }

  // ---- Clamp
  score = Math.max(0, Math.min(100, Math.round(score)));

  // =================================================================
  // Decisão de TYPE
  // =================================================================
  let type: RadarPostType = "generic_post";

  if (matched.announce.length >= 2 || (matched.announce.length && !matched.strong.length)) {
    type = "announcement";
  } else if (matched.food.length >= 2 && !matched.strong.length) {
    type = matched.food.some((k) => /cardapio|menu/.test(k)) ? "menu" : "food_promo";
  } else if (matched.promo.length && !matched.strong.length && !extracted.date) {
    type = "food_promo";
  } else if (ageDays > 5 && !futureDate) {
    type = "old_post";
  } else if (!extracted.date && !weekdayHits.length && !hasTime && !matched.strong.length) {
    type = "generic_post";
  } else if (matched.strong.some((k) => /dj|banda|cantor|show|ao vivo|line/.test(k))) {
    type = "music_event";
  } else if (matched.strong.some((k) => /festa|baile|balada|rave|sunset|festival/.test(k))) {
    type = "party_event";
  } else if (matched.strong.some((k) => /open bar|bar/.test(k))) {
    type = "bar_event";
  } else if (extracted.date || hasTime || weekdayHits.length) {
    type = "event_flyer";
  }

  // =================================================================
  // Decisão final
  // =================================================================
  let decision: RadarDecision;
  if (score >= 80) decision = "create";
  else if (score >= 60) decision = "review";
  else decision = "ignore";

  // Hard overrides
  if (type === "announcement" || type === "menu" || type === "food_promo" || type === "old_post") {
    decision = "ignore";
  }
  

  // Sem data E sem horário E sem dia da semana → no máximo "review"
  if (!extracted.date && !extracted.time && !weekdayHits.length) {
    if (decision === "create") decision = "review";
    if (!matched.strong.length) decision = "ignore";
    if (!reasons.some((r) => /sem data/i.test(r))) reasons.push("Sem data clara");
  }

  // Reason principal se ainda nada
  if (!reasons.length) {
    reasons.push(
      type === "menu" ? "Cardápio detectado" :
      type === "food_promo" ? "Promoção de comida" :
      type === "announcement" ? "Aviso institucional" :
      type === "old_post" ? "Post antigo sem data futura" :
      "Sinais fracos de evento",
    );
  }

  const confidence: RadarClassification["confidence"] =
    score >= 80 ? "high" : score >= 60 ? "medium" : "low";

  return {
    type,
    score,
    decision,
    confidence,
    extracted,
    reasons,
    matchedSignals: matched,
  };
}

// =====================================================================
// Helpers de UI
// =====================================================================

export const RADAR_TYPE_LABELS: Record<RadarPostType, string> = {
  event_flyer: "Flyer de evento",
  music_event: "Show / Música ao vivo",
  party_event: "Festa / Balada",
  bar_event: "Evento de bar",
  food_promo: "Promoção",
  menu: "Cardápio",
  announcement: "Aviso",
  old_post: "Post antigo",
  generic_post: "Genérico",
  invalid: "Inválido",
};

/** Badges visuais ordenados por prioridade. Cada item é exibido no card. */
export function radarBadgesFor(c: Pick<RadarClassification, "type" | "score" | "decision">): {
  label: string;
  variant: "strong" | "review" | "promo" | "menu" | "announce" | "old" | "nodate" | "duplicate";
}[] {
  const badges: ReturnType<typeof radarBadgesFor> = [];
  if (c.type === "menu") badges.push({ label: "CARDÁPIO", variant: "menu" });
  else if (c.type === "food_promo") badges.push({ label: "PROMOÇÃO", variant: "promo" });
  else if (c.type === "announcement") badges.push({ label: "AVISO", variant: "announce" });
  else if (c.type === "old_post") badges.push({ label: "POST ANTIGO", variant: "old" });
  else if (c.score >= 80) badges.push({ label: "EVENTO FORTE", variant: "strong" });
  else if (c.score >= 60) badges.push({ label: "PRECISA REVISAR", variant: "review" });
  return badges;
}

// =====================================================================
// Memória inteligente por parceiro (aplicada após classifyRadarPost)
// =====================================================================

export type PartnerState =
  | "trusted_partner"
  | "mixed_partner"
  | "low_quality_partner"
  | "promotional_partner";

export interface PartnerMemorySummary {
  dominant_type: string | null;
  event_accuracy_score: number;
  promo_rate: number;
  menu_rate: number;
  ignore_rate: number;
  confidence: number;
  total_analyzed: number;
  partner_state?: PartnerState | null;
  recent_created_score?: number | null;
  recent_ignored_score?: number | null;
}

/** Aplica boost/penalidade baseado no histórico do parceiro. Não muda extraído. */
export function applyPartnerMemory(
  c: RadarClassification,
  mem: PartnerMemorySummary | null | undefined,
): RadarClassification {
  if (!mem || mem.total_analyzed < 3) return c;

  let score = c.score;
  const reasons = [...c.reasons];
  let decision = c.decision;
  const state = mem.partner_state || null;
  const recentPos = mem.recent_created_score ?? 0;
  const recentNeg = mem.recent_ignored_score ?? 0;

  // --- Boosts/penalidades por estado adaptativo
  if (state === "trusted_partner") {
    score += 10;
    reasons.push(`Parceiro CONFIÁVEL (${mem.event_accuracy_score}% eventos reais)`);
  } else if (state === "low_quality_partner") {
    score -= 15;
    reasons.push(`Parceiro BAIXA QUALIDADE — admin ignora muito`);
  } else if (state === "promotional_partner") {
    // Penalidade extra se o post não tem data clara
    if (!c.extracted.date && !c.extracted.time) {
      score -= 12;
      reasons.push("Parceiro PROMOCIONAL sem data clara no flyer");
    } else {
      score -= 4;
      reasons.push("Parceiro PROMOCIONAL");
    }
  }

  // --- Boost por padrão musical confirmado
  if (
    (mem.dominant_type === "music_event" || mem.dominant_type === "bar_event" || mem.dominant_type === "party_event")
    && (c.type === "music_event" || c.type === "bar_event" || c.type === "party_event" || c.type === "event_flyer")
    && mem.confidence >= 40
  ) {
    score += 6;
    reasons.push(`Padrão musical confirmado (${mem.dominant_type})`);
  }

  // --- Padrão cardápio: penalizar flyer sem data
  if ((mem.dominant_type === "menu" || mem.menu_rate >= 40) && !c.extracted.date) {
    score -= 8;
    reasons.push("Parceiro com padrão de cardápio — sem data");
  }

  // --- Fallback nas taxas (caso state ainda não esteja calibrado)
  if (!state || state === "mixed_partner") {
    if (mem.event_accuracy_score >= 70 && mem.confidence >= 50) score += 6;
    if (mem.promo_rate >= 50) score -= 10;
    if (mem.ignore_rate >= 70) score -= 6;
  }

  // --- Recência: feedback recente pesa mais que histórico antigo
  if (recentPos - recentNeg >= 3) score += 3;
  else if (recentNeg - recentPos >= 3) score -= 4;

  score = Math.max(0, Math.min(100, Math.round(score)));

  if (decision !== "ignore") {
    if (score >= 80) decision = "create";
    else if (score >= 60) decision = "review";
    else if (state === "low_quality_partner" && mem.confidence >= 50) decision = "ignore";
    else if (mem.confidence >= 60 && mem.event_accuracy_score < 20) decision = "ignore";
  }

  return { ...c, score, reasons, decision };
}

export const PARTNER_MEMORY_BADGES = {
  trusted: { label: "CONFIÁVEL", cls: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40" },
  mixed: { label: "MISTO", cls: "bg-slate-500/20 text-slate-200 border-slate-500/40" },
  promotional: { label: "MUITO PROMOCIONAL", cls: "bg-orange-500/20 text-orange-200 border-orange-500/40" },
  low_quality: { label: "BAIXA QUALIDADE", cls: "bg-rose-500/20 text-rose-200 border-rose-500/40" },
  music: { label: "PADRÃO MUSICAL", cls: "bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-500/40" },
  menu: { label: "PADRÃO CARDÁPIO", cls: "bg-amber-500/20 text-amber-200 border-amber-500/40" },
} as const;

export function partnerMemoryBadges(mem: PartnerMemorySummary | null | undefined): Array<{ label: string; cls: string }> {
  if (!mem || mem.total_analyzed < 3) return [];
  const out: Array<{ label: string; cls: string }> = [];
  const state = mem.partner_state || null;

  if (state === "trusted_partner") out.push(PARTNER_MEMORY_BADGES.trusted);
  else if (state === "promotional_partner") out.push(PARTNER_MEMORY_BADGES.promotional);
  else if (state === "low_quality_partner") out.push(PARTNER_MEMORY_BADGES.low_quality);
  else if (state === "mixed_partner" && mem.confidence >= 40) out.push(PARTNER_MEMORY_BADGES.mixed);

  if (
    (mem.dominant_type === "music_event" || mem.dominant_type === "party_event" || mem.dominant_type === "bar_event")
    && mem.confidence >= 40
  ) out.push(PARTNER_MEMORY_BADGES.music);
  if (mem.dominant_type === "menu" || mem.menu_rate >= 40) out.push(PARTNER_MEMORY_BADGES.menu);

  return out;
}

