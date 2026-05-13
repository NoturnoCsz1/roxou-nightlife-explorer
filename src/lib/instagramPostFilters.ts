/**
 * Helpers BARATOS (sem IA) para filtrar/classificar posts de parceiros.
 * Usado pelo Radar IA antes de gastar crédito de Vision/LLM.
 */

const SP_TZ = "America/Sao_Paulo";

/** Janela padrão do Radar: últimos 5 dias em America/Sao_Paulo. */
export function getInstagramPostWindow(referenceDate: Date = new Date(), days = 5) {
  const end = new Date(referenceDate);
  const start = new Date(referenceDate);
  start.setUTCDate(start.getUTCDate() - days);
  return { startDate: start, endDate: end, days, timezone: SP_TZ };
}

/** Verifica se um timestamp ISO está dentro da janela. */
export function isPostWithinWindow(
  timestamp: string | null | undefined,
  referenceDate: Date = new Date(),
  days = 5,
): boolean {
  if (!timestamp) return false;
  const t = new Date(timestamp).getTime();
  if (isNaN(t)) return false;
  const { startDate, endDate } = getInstagramPostWindow(referenceDate, days);
  return t >= startDate.getTime() && t <= endDate.getTime() + 60_000;
}

export type PostKind = "event" | "promotion" | "announcement" | "menu" | "generic" | "unknown";

const EVENT_KW = [
  "hoje", "amanhã", "amanha", "sábado", "sabado", "sexta", "quinta", "domingo", "segunda", "terça", "terca", "quarta",
  "lineup", "line-up", "atração", "atracao", "atrações", "show", "ao vivo", "open bar", "openbar",
  "festa", "baile", "edição", "edicao", "especial", "entrada", "ingresso", "ingressos", "reservas", "reserva",
  "presença de dj", "presenca de dj", "dj ", "começa às", "comeca as", "a partir das",
  "20h", "21h", "22h", "23h", "00h", "01h", "música ao vivo", "musica ao vivo", "rolê", "role ",
];

const PROMO_KW = [
  "promoção", "promocao", "combo", "desconto", "compre", "leve", "delivery", "peça agora", "peca agora",
  "oferta", "imperdível", "imperdivel", "preço especial", "preco especial", "dose dupla", "happy hour",
  "cardápio", "cardapio", "menu novo", "novidade no menu", "produto", "frete grátis", "frete gratis",
];

const ANNOUNCE_KW = [
  "comunicado", "funcionamento", "horário especial", "horario especial", "fechado", "abriremos",
  "não abriremos", "nao abriremos", "manutenção", "manutencao", "aviso", "informamos", "atenção", "atencao",
];

const MENU_KW = ["cardápio", "cardapio", "menu", "novo prato", "drink novo", "lançamos", "lancamos"];

function lower(s: string | null | undefined) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export interface PostClassification {
  kind: PostKind;
  hasEventSignal: boolean;
  hasPromoSignal: boolean;
  hasAnnounceSignal: boolean;
  hasDateSignal: boolean;
  matchedKeywords: string[];
}

/** Classificador heurístico — sem IA. */
export function classifyPartnerPost(text: string | null | undefined): PostClassification {
  const t = lower(text).slice(0, 4000);
  if (!t.trim()) return { kind: "unknown", hasEventSignal: false, hasPromoSignal: false, hasAnnounceSignal: false, hasDateSignal: false, matchedKeywords: [] };

  const matched: string[] = [];
  const evHit = EVENT_KW.filter((k) => t.includes(k));
  const prHit = PROMO_KW.filter((k) => t.includes(k));
  const anHit = ANNOUNCE_KW.filter((k) => t.includes(k));
  const mnHit = MENU_KW.filter((k) => t.includes(k));
  matched.push(...evHit, ...prHit, ...anHit);

  const hasDateSignal = !!extractEventDateHint(t);

  // prioridades
  if (anHit.length >= 2 || /comunicado|aviso|informamos/.test(t)) {
    return { kind: "announcement", hasEventSignal: evHit.length > 0, hasPromoSignal: prHit.length > 0, hasAnnounceSignal: true, hasDateSignal, matchedKeywords: matched };
  }
  if (evHit.length > 0 && (hasDateSignal || /\b\d{1,2}h(?:\d{2})?\b/.test(t))) {
    return { kind: "event", hasEventSignal: true, hasPromoSignal: prHit.length > 0, hasAnnounceSignal: false, hasDateSignal, matchedKeywords: matched };
  }
  if (prHit.length >= 1 && evHit.length === 0) {
    return { kind: "promotion", hasEventSignal: false, hasPromoSignal: true, hasAnnounceSignal: false, hasDateSignal, matchedKeywords: matched };
  }
  if (mnHit.length > 0 && evHit.length === 0) {
    return { kind: "menu", hasEventSignal: false, hasPromoSignal: prHit.length > 0, hasAnnounceSignal: false, hasDateSignal, matchedKeywords: matched };
  }
  if (evHit.length > 0) {
    return { kind: "event", hasEventSignal: true, hasPromoSignal: prHit.length > 0, hasAnnounceSignal: false, hasDateSignal, matchedKeywords: matched };
  }
  return { kind: "generic", hasEventSignal: false, hasPromoSignal: prHit.length > 0, hasAnnounceSignal: false, hasDateSignal, matchedKeywords: matched };
}

const WEEKDAYS: Record<string, number> = {
  domingo: 0, segunda: 1, "segunda-feira": 1, terca: 2, "terca-feira": 2,
  quarta: 3, "quarta-feira": 3, quinta: 4, "quinta-feira": 4,
  sexta: 5, "sexta-feira": 5, sabado: 6, "sabado-feira": 6,
};

/** Extrai hint de data do texto (sem ainda construir Date). */
export function extractEventDateHint(text: string): string | null {
  const t = lower(text);
  if (/\bhoje\b/.test(t)) return "hoje";
  if (/\bamanha\b/.test(t)) return "amanha";
  for (const w of Object.keys(WEEKDAYS)) {
    if (new RegExp(`\\b${w}\\b`).test(t)) return w;
  }
  // dd/mm
  const m1 = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (m1) return m1[0];
  // "dia 13"
  const m2 = t.match(/\bdia\s+(\d{1,2})\b/);
  if (m2) return m2[0];
  // "13 de maio"
  const m3 = t.match(/\b(\d{1,2})\s+de\s+(janeiro|fevereiro|marco|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/);
  if (m3) return m3[0];
  return null;
}

/**
 * Tenta resolver a data do evento a partir do texto, usando referência em SP.
 * Retorna ISO YYYY-MM-DD ou null se incerto.
 */
export function resolveEventDate(text: string, reference: Date = new Date()): string | null {
  const t = lower(text);
  const ref = new Date(reference);
  const refSP = new Date(ref.toLocaleString("en-US", { timeZone: SP_TZ }));

  if (/\bhoje\b/.test(t)) return ymd(refSP);
  if (/\bamanha\b/.test(t)) {
    const d = new Date(refSP); d.setDate(d.getDate() + 1); return ymd(d);
  }
  for (const [w, dow] of Object.entries(WEEKDAYS)) {
    if (new RegExp(`\\b${w}\\b`).test(t)) {
      const d = new Date(refSP);
      const diff = (dow - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      return ymd(d);
    }
  }
  // dd/mm[/yyyy]
  const m1 = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (m1) {
    const day = parseInt(m1[1], 10);
    const month = parseInt(m1[2], 10);
    let year = m1[3] ? parseInt(m1[3], 10) : refSP.getFullYear();
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const d = new Date(year, month - 1, day);
      // se data ficou no passado e ano não foi explícito, considerar próximo ano
      if (!m1[3] && d.getTime() < refSP.getTime() - 86400000) {
        d.setFullYear(year + 1);
      }
      return ymd(d);
    }
  }
  const months: Record<string, number> = {
    janeiro: 0, fevereiro: 1, marco: 2, "março": 2, abril: 3, maio: 4, junho: 5,
    julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
  };
  const m3 = t.match(/\b(\d{1,2})\s+de\s+(janeiro|fevereiro|marco|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/);
  if (m3) {
    const day = parseInt(m3[1], 10);
    const month = months[m3[2]];
    if (day && month != null) {
      const d = new Date(refSP.getFullYear(), month, day);
      if (d.getTime() < refSP.getTime() - 86400000) d.setFullYear(d.getFullYear() + 1);
      return ymd(d);
    }
  }
  return null;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Extrai HH:mm do texto. */
export function resolveEventTime(text: string): string | null {
  const t = lower(text);
  const m = t.match(/\b(\d{1,2})(?::|h)(\d{2})\b/) || t.match(/\b(\d{1,2})h\b/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}
