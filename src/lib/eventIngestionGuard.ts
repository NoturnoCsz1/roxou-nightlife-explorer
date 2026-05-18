/**
 * Roxou — Guard único do pipeline de ingestão.
 *
 * Tudo que publica/cria evento (Radar IA, Bulk, Form admin, cron) chama
 * `validateBeforePublish` antes do insert. Sem IA. Sem chamadas externas.
 *
 * Bloqueios DUROS:
 *  - DATA_DIVERGENTE     (OCR detectou dia diferente do form)
 *  - EVENTO_NO_PASSADO   (data_time < hoje SP)
 *  - FORA_DO_ESCOPO      (keyword bloqueada de evento não-entretenimento)
 *  - DUPLICATA           (mesmo flyer + mesmo parceiro + <2h)
 *  - MESMO_FLYER         (flyer_fingerprint já existe nos últimos 14 dias)
 *
 * Bloqueios SUAVES (forçam status=draft + needs_review=true, não negam):
 *  - BAIXO_SCORE_ENTRETENIMENTO
 *  - OCR_INVALIDO
 *  - REVISAO_NECESSARIA
 */

import { supabase } from "@/integrations/supabase/client";
import { getStartOfTodaySP, getDateKeySP } from "./dateUtils";
import {
  findPossibleDuplicateEvent,
  generateFlyerFingerprint,
  type DuplicateConfidenceInput,
  type DuplicateConfidenceExisting,
} from "./eventDuplicateDetector";

// =====================================================================
// Tipos
// =====================================================================

export type GuardSource = "radar" | "bulk" | "form" | "cron";

export type GuardBlockReason =
  | "DATA_DIVERGENTE"
  | "EVENTO_NO_PASSADO"
  | "FORA_DO_ESCOPO"
  | "DUPLICATA"
  | "MESMO_FLYER";

export type GuardWarning =
  | "BAIXO_SCORE_ENTRETENIMENTO"
  | "OCR_INVALIDO"
  | "REVISAO_NECESSARIA"
  | "POSSIVEL_DUPLICATA";

export interface GuardInput {
  source: GuardSource;
  /** Data do form/IA já como ISO. */
  date_time: string | null | undefined;
  title?: string | null;
  description?: string | null;
  venue_name?: string | null;
  category?: string | null;
  sub_category?: string | null;
  partner_id?: string | null;
  image_url?: string | null;
  image_hash?: string | null;
  flyer_fingerprint?: string | null;
  /** Texto extraído do flyer (OCR + caption). */
  raw_ocr?: string | null;
  raw_caption?: string | null;
  /** Texto livre adicional que a IA já extraiu. */
  extra_text?: string | null;
  /** Evento existente quando for update. */
  current_event_id?: string | null;
  scan_id?: string | null;
}

export interface GuardResult {
  ok: boolean;
  /** Bloqueios duros (impedem publicação automática). */
  blockReasons: GuardBlockReason[];
  warnings: GuardWarning[];
  badges: string[];
  entertainmentScore: number;
  /** Data detectada via OCR (apenas dia, ancorada 12h SP). */
  ocrDate: Date | null;
  /** Score do melhor candidato a duplicata (0-100). */
  duplicateScore: number;
  matchedEventId: string | null;
  /** Sugestão final ao caller. */
  recommendedStatus: "published" | "draft";
  recommendedNeedsReview: boolean;
  /** Linha pronta para `event_validation_logs`. */
  validationLog: ValidationLogRow;
}

interface ValidationLogRow {
  event_id: string | null;
  scan_id: string | null;
  flyer_hash: string | null;
  detected_ocr: string | null;
  detected_date: string | null;
  ai_date: string | null;
  form_date: string | null;
  similarity_score: number | null;
  entertainment_score: number | null;
  validation_status: "ok" | "blocked" | "review";
  block_reasons: string[];
  warnings: string[];
  source: GuardSource;
}

// =====================================================================
// Listas de classificação de entretenimento
// =====================================================================

export const BLOCKED_KEYWORDS = [
  "workshop", "congresso", "seminário", "seminario", "simpósio", "simposio",
  "curso", "palestra", "palestrante", "científico", "cientifico", "ciência", "ciencia",
  "networking", "corporativo", "empresarial", "mesa redonda", "feira acadêmica",
  "feira academica", "missa", "culto", "comício", "comicio", "reunião empresarial",
  "reuniao empresarial", "treinamento", "capacitação", "capacitacao",
];

export const POSITIVE_KEYWORDS = [
  "show", "festa", "balada", "dj", "open bar", "openbar", "pagode", "sertanejo",
  "eletrônico", "eletronico", "música ao vivo", "musica ao vivo", "futebol",
  "universitária", "universitaria", "lounge", "barzinho", "rave", "funk",
  "rock", "samba", "axé", "axe", "forró", "forro", "carnaval", "festival",
  "happy hour", "after", "matinê", "matine", "boate", "boteco",
];

// =====================================================================
// OCR de data
// =====================================================================

const MONTHS_PT: Record<string, number> = {
  jan: 1, janeiro: 1,
  fev: 2, fevereiro: 2,
  mar: 3, "março": 3, marco: 3,
  abr: 4, abril: 4,
  mai: 5, maio: 5,
  jun: 6, junho: 6,
  jul: 7, julho: 7,
  ago: 8, agosto: 8,
  set: 9, setembro: 9,
  out: 10, outubro: 10,
  nov: 11, novembro: 11,
  dez: 12, dezembro: 12,
};

const WEEKDAYS_PT: Record<string, number> = {
  // 0=dom .. 6=sab
  domingo: 0, dom: 0,
  segunda: 1, seg: 1, "segunda-feira": 1,
  terça: 2, terca: 2, "terça-feira": 2, "terca-feira": 2, ter: 2,
  quarta: 3, "quarta-feira": 3, qua: 3,
  quinta: 4, "quinta-feira": 4, qui: 4,
  sexta: 5, "sexta-feira": 5, sex: 5, sextou: 5,
  sábado: 6, sabado: 6, sab: 6, "sabadou": 6,
  domingou: 0,
};

function spYmd(date: Date): { y: number; m: number; d: number; dow: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  const wmap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    y: Number(get("year")),
    m: Number(get("month")),
    d: Number(get("day")),
    dow: wmap[get("weekday")] ?? 0,
  };
}

function buildSpDate(y: number, m: number, d: number): Date {
  return new Date(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T12:00:00-03:00`);
}

/**
 * Tenta extrair data principal do flyer a partir de texto livre.
 * Devolve `Date` ancorada às 12h SP (ou null).
 */
export function detectOcrDate(rawText: string | null | undefined, referenceNow = new Date()): Date | null {
  if (!rawText) return null;
  const text = rawText.toLowerCase();
  const today = spYmd(referenceNow);
  const todayDate = buildSpDate(today.y, today.m, today.d);

  // 1) "hoje" / "amanhã"
  if (/\bhoje\b/.test(text)) return todayDate;
  if (/\bamanh[aã]\b/.test(text)) {
    return new Date(todayDate.getTime() + 24 * 3600 * 1000);
  }

  // 2) dd/mm ou dd-mm ou dd.mm
  const numeric = text.match(/\b(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?\b/);
  if (numeric) {
    const d = Number(numeric[1]);
    const m = Number(numeric[2]);
    let y = numeric[3] ? Number(numeric[3]) : today.y;
    if (y < 100) y += 2000;
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      const candidate = buildSpDate(y, m, d);
      // Se ano não foi explicitado e candidato é mais de 6 meses atrás, assume próximo ano
      if (!numeric[3] && candidate.getTime() < todayDate.getTime() - 180 * 86400000) {
        return buildSpDate(y + 1, m, d);
      }
      return candidate;
    }
  }

  // 3) "16 de maio" / "16 maio" / "16/mai"
  const named = text.match(/\b(\d{1,2})\s*(?:de\s+)?([a-zç]{3,9})\b/);
  if (named) {
    const d = Number(named[1]);
    const monthKey = named[2].normalize("NFD").replace(/[\u0300-\u036f]/g, "").slice(0, 9);
    const monthShort = monthKey.slice(0, 3);
    const m = MONTHS_PT[monthKey] ?? MONTHS_PT[monthShort];
    if (d >= 1 && d <= 31 && m) {
      let y = today.y;
      const candidate = buildSpDate(y, m, d);
      if (candidate.getTime() < todayDate.getTime() - 180 * 86400000) {
        return buildSpDate(y + 1, m, d);
      }
      return candidate;
    }
  }

  // 4) dia da semana (próxima ocorrência)
  for (const [word, dow] of Object.entries(WEEKDAYS_PT)) {
    const re = new RegExp(`\\b${word.replace(/-/g, "\\-")}\\b`, "i");
    if (re.test(text)) {
      const delta = (dow - today.dow + 7) % 7 || 7;
      return new Date(todayDate.getTime() + delta * 86400000);
    }
  }

  return null;
}

// =====================================================================
// Score de entretenimento
// =====================================================================

export function computeEntertainmentScore(text: string): {
  score: number;
  hasBlocked: boolean;
  matchedPositive: string[];
  matchedNegative: string[];
} {
  const norm = (text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let score = 50;
  const matchedPositive: string[] = [];
  const matchedNegative: string[] = [];

  for (const kw of POSITIVE_KEYWORDS) {
    const base = kw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (norm.includes(base)) {
      score += 10;
      matchedPositive.push(kw);
    }
  }

  let hasBlocked = false;
  for (const kw of BLOCKED_KEYWORDS) {
    const base = kw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (norm.includes(base)) {
      score -= 25;
      matchedNegative.push(kw);
      hasBlocked = true;
    }
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    hasBlocked,
    matchedPositive,
    matchedNegative,
  };
}

// =====================================================================
// Validação principal
// =====================================================================

export async function validateBeforePublish(input: GuardInput): Promise<GuardResult> {
  const blockReasons: GuardBlockReason[] = [];
  const warnings: GuardWarning[] = [];
  const badges: string[] = [];

  const fullText = [
    input.title, input.description, input.venue_name,
    input.raw_caption, input.raw_ocr, input.extra_text,
  ].filter(Boolean).join("\n");

  // 1. OCR data
  const ocrSourceText = [input.raw_caption, input.raw_ocr, input.title, input.description]
    .filter(Boolean).join("\n");
  const ocrDate = detectOcrDate(ocrSourceText);
  const formDate = input.date_time ? new Date(input.date_time) : null;

  // 2. Data divergente
  if (ocrDate && formDate && !isNaN(formDate.getTime())) {
    const a = getDateKeySP(ocrDate);
    const b = getDateKeySP(formDate);
    if (a !== b) {
      const diffMs = Math.abs(ocrDate.getTime() - formDate.getTime());
      if (diffMs >= 24 * 3600 * 1000) {
        blockReasons.push("DATA_DIVERGENTE");
        badges.push("DATA DIVERGENTE");
      }
    }
  }

  // 3. Evento no passado
  if (formDate && !isNaN(formDate.getTime())) {
    const todayStart = new Date(getStartOfTodaySP());
    if (formDate.getTime() < todayStart.getTime()) {
      blockReasons.push("EVENTO_NO_PASSADO");
      badges.push("EVENTO NO PASSADO");
    }
  }

  // 4. Score de entretenimento
  const ent = computeEntertainmentScore(fullText);
  if (ent.hasBlocked) {
    blockReasons.push("FORA_DO_ESCOPO");
    badges.push("FORA DO ESCOPO");
  } else if (ent.score < 70) {
    warnings.push("BAIXO_SCORE_ENTRETENIMENTO");
    badges.push("BAIXO SCORE");
  }

  // 5. OCR ausente quando deveria existir (apenas radar)
  if (input.source === "radar" || input.source === "cron") {
    if (!input.raw_caption && !input.raw_ocr) {
      warnings.push("OCR_INVALIDO");
      badges.push("OCR INVÁLIDO");
    }
  }

  // 6. Mesmo flyer nos últimos 14 dias (hard block)
  const fingerprint =
    input.flyer_fingerprint ||
    generateFlyerFingerprint({
      image_hash: input.image_hash,
      image_url: input.image_url,
    });

  let duplicateScore = 0;
  let matchedEventId: string | null = null;

  if (fingerprint) {
    const since = new Date(Date.now() - 14 * 86400000).toISOString();
    const q = supabase
      .from("events")
      .select("id,title,date_time,venue_name,partner_id,image_hash,flyer_fingerprint,dedupe_key,status,description")
      .eq("flyer_fingerprint", fingerprint)
      .gte("created_at", since)
      .limit(5);
    const { data } = input.current_event_id ? await q.neq("id", input.current_event_id) : await q;
    if (data && data.length) {
      const samePartner = !!input.partner_id && data.some((e) => e.partner_id === input.partner_id);
      if (samePartner) {
        blockReasons.push("MESMO_FLYER");
        badges.push("POSSÍVEL DUPLICATA");
        matchedEventId = data[0].id;
        duplicateScore = 100;
      }
    }
  }

  // 7. Detecção de duplicidade por título/data/local
  if (!blockReasons.includes("MESMO_FLYER") && formDate && !isNaN(formDate.getTime())) {
    const day = getDateKeySP(formDate);
    const fromDate = new Date(new Date(`${day}T00:00:00-03:00`).getTime() - 7 * 86400000).toISOString();
    const toDate = new Date(new Date(`${day}T23:59:59-03:00`).getTime() + 7 * 86400000).toISOString();
    const q = supabase
      .from("events")
      .select("id,title,date_time,venue_name,partner_id,image_hash,flyer_fingerprint,dedupe_key,status,description")
      .gte("date_time", fromDate)
      .lte("date_time", toDate)
      .limit(50);
    const { data } = input.current_event_id ? await q.neq("id", input.current_event_id) : await q;
    if (data && data.length) {
      const candidate: DuplicateConfidenceInput & { dedupe_key?: string | null } = {
        title: input.title || "",
        date_time: input.date_time || null,
        venue_name: input.venue_name || null,
        partner_id: input.partner_id || null,
        image_hash: input.image_hash || null,
        flyer_fingerprint: fingerprint,
        description: input.description || null,
      } as any;
      const dup = findPossibleDuplicateEvent(candidate, data as unknown as DuplicateConfidenceExisting[]);
      duplicateScore = Math.max(duplicateScore, dup.duplicate_score);
      if (dup.matched_event_id) matchedEventId = matchedEventId || dup.matched_event_id;
      const samePartner = !!input.partner_id && data.some((e) => e.id === dup.matched_event_id && e.partner_id === input.partner_id);
      const matched = data.find((e) => e.id === dup.matched_event_id);
      const dateDistanceHours = matched
        ? Math.abs(new Date(matched.date_time).getTime() - (formDate?.getTime() ?? 0)) / 3_600_000
        : Infinity;

      if (dup.duplicate_score >= 90 && samePartner && dateDistanceHours < 2) {
        blockReasons.push("DUPLICATA");
        badges.push("POSSÍVEL DUPLICATA");
      } else if (dup.duplicate_score >= 60) {
        warnings.push("POSSIVEL_DUPLICATA");
        if (!badges.includes("POSSÍVEL DUPLICATA")) badges.push("POSSÍVEL DUPLICATA");
      }
    }
  }

  if (warnings.length && !blockReasons.length) {
    warnings.push("REVISAO_NECESSARIA");
    if (!badges.includes("REVISÃO NECESSÁRIA")) badges.push("REVISÃO NECESSÁRIA");
  }

  const ok = blockReasons.length === 0;
  const recommendedNeedsReview = !ok || warnings.length > 0;
  const recommendedStatus: "published" | "draft" = ok && !recommendedNeedsReview ? "published" : "draft";

  const validationLog: ValidationLogRow = {
    event_id: input.current_event_id ?? null,
    scan_id: input.scan_id ?? null,
    flyer_hash: fingerprint ?? null,
    detected_ocr: ocrSourceText ? ocrSourceText.slice(0, 2000) : null,
    detected_date: ocrDate ? ocrDate.toISOString() : null,
    ai_date: input.date_time ?? null,
    form_date: input.date_time ?? null,
    similarity_score: duplicateScore || null,
    entertainment_score: ent.score,
    validation_status: ok ? (warnings.length ? "review" : "ok") : "blocked",
    block_reasons: blockReasons,
    warnings,
    source: input.source,
  };

  return {
    ok,
    blockReasons,
    warnings,
    badges,
    entertainmentScore: ent.score,
    ocrDate,
    duplicateScore,
    matchedEventId,
    recommendedStatus,
    recommendedNeedsReview,
    validationLog,
  };
}

/**
 * Persiste o log de validação. Falha silenciosa — não pode quebrar a publicação.
 */
export async function persistValidationLog(
  log: GuardResult["validationLog"],
  eventId: string | null = null,
): Promise<void> {
  try {
    await supabase.from("event_validation_logs" as any).insert({
      ...log,
      event_id: eventId ?? log.event_id,
    } as any);
  } catch {
    // ignore — log is best-effort
  }
}

/**
 * Mapeia reason → label PT-BR para badge/UI.
 */
export const REASON_LABELS: Record<string, string> = {
  DATA_DIVERGENTE: "Data divergente",
  EVENTO_NO_PASSADO: "Evento no passado",
  FORA_DO_ESCOPO: "Fora do escopo Roxou",
  DUPLICATA: "Possível duplicata",
  MESMO_FLYER: "Mesmo flyer já existe",
  BAIXO_SCORE_ENTRETENIMENTO: "Baixo score de entretenimento",
  OCR_INVALIDO: "OCR ausente",
  REVISAO_NECESSARIA: "Revisão necessária",
  POSSIVEL_DUPLICATA: "Possível duplicata",
};
