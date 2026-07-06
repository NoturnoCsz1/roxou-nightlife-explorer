/**
 * Roxou — Validador inteligente de eventos duplicados.
 *
 * Compara um evento candidato contra a base existente e retorna um score
 * 0–100 indicando a probabilidade de ser duplicata.
 *
 * NÃO BLOQUEIA publicação. Apenas detecta + retorna info para UI alertar.
 *
 * Sinais avaliados:
 *  - image_hash exato (peso muito alto)
 *  - similaridade textual de título (Jaccard sobre tokens normalizados)
 *  - mesma data (dia / hora)
 *  - mesmo local (partner_id, venue_name normalizado, instagram, endereço)
 *  - artistas / atrações em metadata
 *
 * Proteções contra falso positivo em eventos recorrentes (ex.: "quinta
 * universitária", "música ao vivo toda sexta") com flyer/data diferentes.
 */

// ============================================================
// Tipos
// ============================================================

export interface DuplicateCandidate {
  id?: string;
  title?: string | null;
  slug?: string | null;
  date_time?: string | null;
  venue_name?: string | null;
  address?: string | null;
  instagram?: string | null;
  partner_id?: string | null;
  image_hash?: string | null;
  attractions?: string[] | null;
  description?: string | null;
}

export interface ExistingEvent extends DuplicateCandidate {
  id: string;
  title: string;
  date_time: string;
}

export type DuplicateLevel =
  | "none"
  | "possible"
  | "strong"
  | "almost_certain";

export interface DuplicateResult {
  is_duplicate: boolean;
  duplicate_score: number; // 0..100
  level: DuplicateLevel;
  matched_event_id: string | null;
  matched_event_title: string | null;
  matched_event_date: string | null;
  matched_fields: string[];
  reason: string;
}

// ============================================================
// Normalização
// ============================================================

const STOPWORDS_PT = new Set([
  "a", "o", "as", "os", "um", "uma", "uns", "umas",
  "de", "do", "da", "dos", "das", "no", "na", "nos", "nas",
  "em", "para", "pra", "por", "com", "sem", "e", "ou", "que",
  "se", "ao", "à", "às", "aos", "the", "of", "and", "to", "feat",
  "ft", "vs", "x",
]);

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/gu;

export function normalizeText(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(EMOJI_RE, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(s: string | null | undefined): string[] {
  return normalizeText(s)
    .split(" ")
    .filter((t) => t.length >= 2 && !STOPWORDS_PT.has(t));
}

/** Jaccard similarity (0..1) */
function jaccard(a: string[], b: string[]): number {
  if (!a.length && !b.length) return 0;
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = A.size + B.size - inter;
  return union ? inter / union : 0;
}

/** "YYYY-MM-DD" em UTC do ISO (suficiente para comparar dia civil aproximado). */
function dayKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function hourOf(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const m = iso.match(/T(\d{2}):/);
  return m ? Number(m[1]) : null;
}

function diffDays(a: string | null | undefined, b: string | null | undefined): number {
  if (!a || !b) return Infinity;
  try {
    const da = new Date(a).getTime();
    const db = new Date(b).getTime();
    if (!Number.isFinite(da) || !Number.isFinite(db)) return Infinity;
    return Math.abs(da - db) / 86_400_000;
  } catch {
    return Infinity;
  }
}

/** Indícios de evento recorrente (semanal/mensal) no título. */
function looksRecurring(title: string | null | undefined): boolean {
  const t = normalizeText(title);
  // Onda 5 — regex ampliada: cobre "sextou", "sabadou", "domingou",
  // "segundou", "tercou", "quartou", "quintou", "domingueira",
  // "segunda do samba", "quarta cultural", "toda quinta", etc.
  return /\b(toda|todo|todas|todos|semanal|weekly|mensal|monthly|residencia|residência|domingueira|noite\s+\w+|(segunda|terca|quarta|quinta|sexta|sabado|domingo)(ou)?|(seg|ter|qua|qui|sex|sab|dom)ou)\b/.test(t);
}

// ============================================================
// API pública
// ============================================================

export interface FindDuplicateOptions {
  /** Filtra base: só compara eventos a ±N dias da data candidata. Default 45. */
  maxDayWindow?: number;
  /** Threshold mínimo para marcar como duplicado. Default 50. */
  threshold?: number;
}

/**
 * Encontra possível duplicata para `candidate` dentro de `existing`.
 * Sempre retorna o melhor match (mesmo abaixo do threshold), com is_duplicate
 * = score ≥ threshold.
 */
export function findPossibleDuplicateEvent(
  candidate: DuplicateCandidate,
  existing: ExistingEvent[],
  options: FindDuplicateOptions = {},
): DuplicateResult {
  const threshold = options.threshold ?? 50;
  const window = options.maxDayWindow ?? 45;

  const empty: DuplicateResult = {
    is_duplicate: false,
    duplicate_score: 0,
    level: "none",
    matched_event_id: null,
    matched_event_title: null,
    matched_event_date: null,
    matched_fields: [],
    reason: "Nenhum evento similar encontrado.",
  };

  if (!candidate || !existing?.length) return empty;

  const candTokens = tokenize(candidate.title);
  const candDay = dayKey(candidate.date_time);
  const candHour = hourOf(candidate.date_time);
  const candVenue = normalizeText(candidate.venue_name);
  const candAddr = normalizeText(candidate.address);
  const candIg = normalizeText(candidate.instagram).replace(/^@/, "");
  const candAttr = (candidate.attractions ?? []).map(normalizeText).filter(Boolean);
  const candIsRecurring = looksRecurring(candidate.title);

  // Pré-filtra: janela de data OU mesmo local (partner_id / venue / instagram)
  const pool = existing.filter((e) => {
    if (e.id && candidate.id && e.id === candidate.id) return false;
    const sameVenue =
      (candidate.partner_id && e.partner_id && candidate.partner_id === e.partner_id) ||
      (candVenue && normalizeText(e.venue_name) === candVenue) ||
      (candIg && normalizeText(e.instagram).replace(/^@/, "") === candIg);
    const close = diffDays(candidate.date_time, e.date_time) <= window;
    return sameVenue || close;
  });

  if (!pool.length) return empty;

  let best: DuplicateResult = empty;

  for (const e of pool) {
    const fields: string[] = [];
    let score = 0;

    // 1) image_hash exato — sinal mais forte
    if (candidate.image_hash && e.image_hash && candidate.image_hash === e.image_hash) {
      score += 60;
      fields.push("flyer (hash idêntico)");
    }

    // 2) Título — Jaccard sobre tokens normalizados (até 40 pts)
    const titleSim = jaccard(candTokens, tokenize(e.title));
    if (titleSim > 0) {
      const titlePts = Math.round(titleSim * 40);
      score += titlePts;
      if (titleSim >= 0.6) fields.push(`título (~${Math.round(titleSim * 100)}%)`);
      else if (titleSim >= 0.3) fields.push(`título parcial (~${Math.round(titleSim * 100)}%)`);
    }

    // 3) Data — mesmo dia +15, mesma hora ±2h +10
    const eDay = dayKey(e.date_time);
    const eHour = hourOf(e.date_time);
    if (candDay && eDay && candDay === eDay) {
      score += 15;
      fields.push("mesma data");
      if (
        candHour != null &&
        eHour != null &&
        Math.abs(candHour - eHour) <= 2
      ) {
        score += 10;
        fields.push("mesmo horário");
      }
    }

    // 4) Local — partner_id (forte) ou venue_name normalizado
    if (
      candidate.partner_id &&
      e.partner_id &&
      candidate.partner_id === e.partner_id
    ) {
      score += 15;
      fields.push("mesmo parceiro");
    } else if (candVenue && normalizeText(e.venue_name) === candVenue) {
      score += 12;
      fields.push("mesmo local");
    }

    // 5) Instagram do organizador
    const eIg = normalizeText(e.instagram).replace(/^@/, "");
    if (candIg && eIg && candIg === eIg) {
      score += 5;
      fields.push("mesmo @instagram");
    }

    // 6) Endereço (substring)
    const eAddr = normalizeText(e.address);
    if (
      candAddr.length >= 6 &&
      eAddr.length >= 6 &&
      (candAddr.includes(eAddr) || eAddr.includes(candAddr))
    ) {
      score += 5;
      fields.push("endereço similar");
    }

    // 7) Atrações em comum
    if (candAttr.length && Array.isArray(e.attractions) && e.attractions.length) {
      const eAttr = e.attractions.map(normalizeText);
      const overlap = candAttr.filter((a) => eAttr.includes(a)).length;
      if (overlap > 0) {
        score += Math.min(10, overlap * 5);
        fields.push(`${overlap} atração(ões) em comum`);
      }
    }

    // ─── Proteção contra falso-positivo: eventos recorrentes ───
    // Se ambos parecem recorrentes, datas diferem ≥ 5 dias e flyers
    // diferentes → reduz score (é a mesma série, não duplicata).
    const recurringBoth = candIsRecurring || looksRecurring(e.title);
    const sameHash =
      !!candidate.image_hash && candidate.image_hash === e.image_hash;
    const datesDiffer =
      candDay && eDay && candDay !== eDay && diffDays(candidate.date_time, e.date_time) >= 5;
    if (recurringBoth && datesDiffer && !sameHash) {
      score = Math.max(0, score - 25);
      fields.push("evento recorrente (penalizado)");
    }

    score = Math.min(100, score);

    if (score > best.duplicate_score) {
      const level: DuplicateLevel =
        score >= 90 ? "almost_certain" :
        score >= 70 ? "strong" :
        score >= 50 ? "possible" :
        "none";
      best = {
        is_duplicate: score >= threshold,
        duplicate_score: score,
        level,
        matched_event_id: e.id,
        matched_event_title: e.title,
        matched_event_date: e.date_time,
        matched_fields: fields,
        reason: fields.length
          ? `Coincidências: ${fields.join(", ")}.`
          : "Sem coincidências relevantes.",
      };
    }
  }

  return best;
}
