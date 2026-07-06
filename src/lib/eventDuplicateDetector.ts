/**
 * Roxou — Ferramenta central de detecção de duplicidade de eventos.
 *
 * Reutilizada por:
 *  - Radar IA (automatic-event-hunter + UI /admin/radar-ia)
 *  - EventoForm / EventoBulkForm
 *  - Instagram imports
 *
 * Regras: normalização forte + fingerprint + score 0–100.
 * Nenhuma IA. Nenhuma chamada externa.
 *
 * Thresholds:
 *  >= 80 → duplicado confirmado (bloquear criação automática)
 *  60–79 → possível duplicado (enviar p/ revisão)
 *  < 60  → permitir criar
 */

import {
  findPossibleDuplicateEvent as legacyFind,
  type DuplicateCandidate,
  type ExistingEvent,
  type DuplicateResult,
  normalizeText,
} from "./eventDuplicateValidator";
import { getDateKeySP } from "./dateUtils";

export type {
  DuplicateCandidate,
  ExistingEvent,
  DuplicateResult,
} from "./eventDuplicateValidator";

// =====================================================================
// Normalização específica para dedupe
// =====================================================================

const TITLE_SPAM_RE = /\b(hoje tem|sextou|sabadou|domingou|imperdivel|imperdível|ultima chance|última chance|corre|corra|promo[cç][aã]o|ingresso garantido|open bar)\b/gi;
const PHONE_RE = /(\+?\d{2}\s?)?\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/g;
const PRICE_RE = /\b(r\$\s?\d+[\.,]?\d*|\d+\s?reais?)\b/gi;
const HASHTAG_RE = /#\w+/g;
const MENTION_RE = /@\w+/g;
const URL_RE = /https?:\/\/\S+/g;

const VENUE_GENERIC_SUFFIX_RE = /\b(bar|club|clube|casa|pub|lounge|disco|boate|hall|arena|espa[çc]o)\b/g;

export function normalizeEventTitle(title: string | null | undefined): string {
  if (!title) return "";
  let s = String(title);
  s = s.replace(URL_RE, " ").replace(HASHTAG_RE, " ").replace(MENTION_RE, " ");
  s = s.replace(PHONE_RE, " ").replace(PRICE_RE, " ").replace(TITLE_SPAM_RE, " ");
  return normalizeText(s);
}

export function normalizeVenueName(venue: string | null | undefined): string {
  const base = normalizeText(venue);
  if (!base) return "";
  const cleaned = base.replace(VENUE_GENERIC_SUFFIX_RE, " ").replace(/\s+/g, " ").trim();
  // Se sobrar muito pouco, mantém o original normalizado.
  return cleaned.length >= 3 ? cleaned : base;
}

export function normalizeTextForDedupe(input: string | null | undefined): string {
  return normalizeText(input);
}

// =====================================================================
// Fingerprint do flyer (FNV-1a 32-bit, sem deps)
// =====================================================================

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function cleanImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    // remove query/hash (CDNs adicionam tokens que mudam o hash)
    return `${u.origin}${u.pathname}`.toLowerCase();
  } catch {
    return String(url).split("?")[0].toLowerCase();
  }
}

export interface FlyerFingerprintInput {
  image_hash?: string | null;
  image_url?: string | null;
  preview_image_url?: string | null;
  flyer_url?: string | null;
  media_id?: string | null;
  permalink?: string | null;
}

export function generateFlyerFingerprint(input: FlyerFingerprintInput): string | null {
  if (input.image_hash) return `h:${input.image_hash}`;
  const url = cleanImageUrl(input.image_url || input.preview_image_url || input.flyer_url);
  if (url) return `u:${fnv1a(url)}`;
  if (input.media_id) return `m:${fnv1a(String(input.media_id))}`;
  if (input.permalink) return `p:${fnv1a(cleanImageUrl(input.permalink))}`;
  return null;
}

// =====================================================================
// Dedupe key (chave canônica)
// =====================================================================

export interface DedupeKeyInput {
  partner_id?: string | null;
  title?: string | null;
  date_time?: string | null;
  venue_name?: string | null;
}

function dateKeySafe(iso: string | null | undefined): string {
  if (!iso) return "nodate";
  try {
    return getDateKeySP(new Date(iso));
  } catch {
    return iso.slice(0, 10) || "nodate";
  }
}

export function generateEventDedupeKey(input: DedupeKeyInput): string {
  const t = normalizeEventTitle(input.title).replace(/\s+/g, "-") || "notitle";
  const v = normalizeVenueName(input.venue_name).replace(/\s+/g, "-") || "novenue";
  const d = dateKeySafe(input.date_time);
  const p = input.partner_id || "nopartner";
  return `${p}|${t}|${d}|${v}`;
}

// =====================================================================
// Score de duplicidade detalhado
// =====================================================================

export interface DuplicateConfidenceInput extends DuplicateCandidate {
  flyer_fingerprint?: string | null;
  caption?: string | null;
}

export interface DuplicateConfidenceExisting extends ExistingEvent {
  flyer_fingerprint?: string | null;
  description?: string | null;
}

export interface DuplicateConfidenceResult extends DuplicateResult {
  /** "confirmed" >=80, "review" 60–79, "clear" <60 */
  decision: "confirmed" | "review" | "clear";
}

function hourDiff(a: string | null | undefined, b: string | null | undefined): number {
  if (!a || !b) return Infinity;
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (!Number.isFinite(da) || !Number.isFinite(db)) return Infinity;
  return Math.abs(da - db) / 3_600_000;
}

function captionSimilarity(a: string | null | undefined, b: string | null | undefined): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return 0;
  const minLen = Math.min(na.length, nb.length);
  if (minLen < 30) return 0;
  // Compara primeiros 200 chars normalizados
  const aa = na.slice(0, 200);
  const bb = nb.slice(0, 200);
  const shorter = aa.length < bb.length ? aa : bb;
  const longer = aa.length < bb.length ? bb : aa;
  return longer.includes(shorter) ? 1 : 0;
}

function decisionFor(score: number): DuplicateConfidenceResult["decision"] {
  if (score >= 80) return "confirmed";
  if (score >= 60) return "review";
  return "clear";
}

/**
 * Calcula score 0–100 entre um candidato e um evento existente.
 */
export function getDuplicateConfidence(
  candidate: DuplicateConfidenceInput,
  existing: DuplicateConfidenceExisting,
): DuplicateConfidenceResult {
  let score = 0;
  const fields: string[] = [];

  // Flyer / fingerprint
  const candFp =
    candidate.flyer_fingerprint ||
    generateFlyerFingerprint({
      image_hash: candidate.image_hash,
    });
  const exFp = existing.flyer_fingerprint;
  const sameHash = !!candidate.image_hash && candidate.image_hash === existing.image_hash;
  if (sameHash || (candFp && exFp && candFp === exFp)) {
    score += 40;
    fields.push("mesmo flyer");
  }

  // Título normalizado
  const tA = normalizeEventTitle(candidate.title);
  const tB = normalizeEventTitle(existing.title);
  if (tA && tB) {
    if (tA === tB) {
      score += 30;
      fields.push("título idêntico");
    } else if (tA.length >= 6 && (tA.includes(tB) || tB.includes(tA))) {
      score += 20;
      fields.push("título contém");
    }
  }

  // Data (dia civil SP) — Onda 5: datas diferentes conhecidas nunca são
  // duplicatas. Eventos recorrentes ("Segunda do Samba" em 06/07 e 13/07)
  // devem ser tratados como independentes. Se as datas são ambas conhecidas
  // e diferentes, cap absoluto abaixo do threshold "review" (60).
  const dA = dateKeySafe(candidate.date_time);
  const dB = dateKeySafe(existing.date_time);
  const datesKnown = dA !== "nodate" && dB !== "nodate";
  const differentDates = datesKnown && dA !== dB;
  if (datesKnown && dA === dB) {
    score += 25;
    fields.push("mesma data");
    const dh = hourDiff(candidate.date_time, existing.date_time);
    if (dh <= 3) {
      score += 15;
      fields.push("horário próximo");
    }
  } else if (differentDates) {
    // Sinal negativo forte; o cap final é aplicado abaixo.
    score -= 30;
  }

  // Local (venue normalizado)
  const vA = normalizeVenueName(candidate.venue_name);
  const vB = normalizeVenueName(existing.venue_name);
  if (vA && vB) {
    if (vA === vB) {
      score += 20;
      fields.push("mesmo local");
    } else {
      score -= 30;
    }
  }

  // Parceiro
  if (candidate.partner_id && existing.partner_id) {
    if (candidate.partner_id === existing.partner_id) {
      score += 20;
      fields.push("mesmo parceiro");
    } else {
      score -= 20;
    }
  }

  // Caption / descrição muito parecida
  if (captionSimilarity(candidate.description || (candidate as any).caption, existing.description)) {
    score += 10;
    fields.push("descrição similar");
  }

  score = Math.max(0, Math.min(100, score));
  const decision = decisionFor(score);

  return {
    is_duplicate: decision !== "clear",
    duplicate_score: score,
    level: score >= 90 ? "almost_certain" : score >= 70 ? "strong" : score >= 50 ? "possible" : "none",
    matched_event_id: existing.id,
    matched_event_title: existing.title,
    matched_event_date: existing.date_time,
    matched_fields: fields,
    reason: fields.length ? `Coincidências: ${fields.join(", ")}.` : "Sem coincidências fortes.",
    decision,
  };
}

/**
 * Encontra o melhor candidato a duplicata dentro de uma lista existente.
 * Prioriza match por `flyer_fingerprint` e `dedupe_key` exatos.
 */
export interface FindOptions {
  /** janela em dias para considerar (default 30) */
  maxDayWindow?: number;
}

export function findPossibleDuplicateEvent(
  candidate: DuplicateConfidenceInput & { dedupe_key?: string | null },
  existing: (DuplicateConfidenceExisting & { dedupe_key?: string | null })[],
  opts: FindOptions = {},
): DuplicateConfidenceResult {
  const empty: DuplicateConfidenceResult = {
    is_duplicate: false,
    duplicate_score: 0,
    level: "none",
    matched_event_id: null,
    matched_event_title: null,
    matched_event_date: null,
    matched_fields: [],
    reason: "Nenhum evento similar encontrado.",
    decision: "clear",
  };

  if (!candidate || !existing?.length) return empty;

  // 1) match exato por flyer_fingerprint
  const candFp =
    candidate.flyer_fingerprint ||
    generateFlyerFingerprint({ image_hash: candidate.image_hash });
  if (candFp) {
    const byFp = existing.find((e) => e.flyer_fingerprint && e.flyer_fingerprint === candFp);
    if (byFp) {
      return {
        ...getDuplicateConfidence(candidate, byFp),
        duplicate_score: 100,
        decision: "confirmed",
        is_duplicate: true,
        reason: "Mesmo flyer já processado.",
        matched_fields: ["flyer_fingerprint"],
      };
    }
  }

  // 2) match exato por dedupe_key
  const candKey =
    candidate.dedupe_key ||
    generateEventDedupeKey({
      partner_id: candidate.partner_id,
      title: candidate.title,
      date_time: candidate.date_time,
      venue_name: candidate.venue_name,
    });
  const byKey = existing.find((e) => (e.dedupe_key || "") === candKey && candKey);
  if (byKey) {
    return {
      ...getDuplicateConfidence(candidate, byKey),
      duplicate_score: Math.max(95, getDuplicateConfidence(candidate, byKey).duplicate_score),
      decision: "confirmed",
      is_duplicate: true,
      reason: "Mesma dedupe_key (partner + título + data + local).",
    };
  }

  // 3) fallback: score legado + reforço
  const legacy = legacyFind(candidate, existing, {
    maxDayWindow: opts.maxDayWindow ?? 30,
    threshold: 60,
  });

  let best: DuplicateConfidenceResult = { ...legacy, decision: decisionFor(legacy.duplicate_score) };
  for (const e of existing) {
    const r = getDuplicateConfidence(candidate, e);
    if (r.duplicate_score > best.duplicate_score) best = r;
  }
  best.is_duplicate = best.decision !== "clear";
  return best;
}

/**
 * Wrapper síncrono e simples para comparar dois eventos diretamente.
 */
export function compareEventsForDuplicate(
  a: DuplicateConfidenceInput,
  b: DuplicateConfidenceExisting,
): DuplicateConfidenceResult {
  return getDuplicateConfidence(a, b);
}
