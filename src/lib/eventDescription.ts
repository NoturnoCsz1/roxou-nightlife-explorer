/**
 * Helpers centralizados para detectar se um evento possui descrição válida.
 *
 * Por que existe: a regra antiga (`getChecklist().description`) exigia HTML
 * rico com marcador específico ("O QUE VOCÊ PRECISA SABER"), o que fazia
 * eventos com descrição perfeitamente válida (texto puro, HTML simples,
 * descrições da IA em outros campos) aparecerem como "Falta descrição".
 *
 * Use `hasEventDescription` para a regra "tem descrição alguma?".
 * Use a checagem antiga (renomeada para `descriptionRich`) para "está pronto
 * para publicar com qualidade editorial?".
 *
 * Sem dependências de banco; puro e síncrono.
 */

const MIN_USEFUL_CHARS = 20;

const INVALID_LITERALS = new Set(["", "null", "undefined", "<p></p>", "<br>", "<br/>", "<br />"]);

const CANDIDATE_FIELDS = [
  "description",
  "short_description",
  "short_summary",
  "generated_description",
  "ai_description",
  "caption",
  "social_caption",
  "instagram_caption",
  "meta_description",
] as const;

const METADATA_FIELDS = ["description", "ai_description", "generated_description"] as const;

export function stripHtml(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<\s*br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function pickRaw(event: Record<string, unknown> | null | undefined, key: string): string | null {
  if (!event) return null;
  const value = event[key];
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (INVALID_LITERALS.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

function isUseful(value: string | null): boolean {
  if (!value) return false;
  const plain = stripHtml(value);
  if (INVALID_LITERALS.has(plain.toLowerCase())) return false;
  return plain.length >= MIN_USEFUL_CHARS;
}

/**
 * Returns true if any known description field on the event holds at least
 * `MIN_USEFUL_CHARS` of useful text (after stripping HTML/whitespace).
 */
export function hasEventDescription(event: Record<string, unknown> | null | undefined): boolean {
  if (!event) return false;
  for (const field of CANDIDATE_FIELDS) {
    if (isUseful(pickRaw(event, field))) return true;
  }
  const metadata = event["metadata"];
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    for (const field of METADATA_FIELDS) {
      if (isUseful(pickRaw(metadata as Record<string, unknown>, field))) return true;
    }
  }
  return false;
}

/**
 * Returns the first useful description text found (raw, may contain HTML).
 * Useful as input for "Injetar hype" so we don't re-fetch from IA.
 */
export function getEventDescriptionText(
  event: Record<string, unknown> | null | undefined
): string | null {
  if (!event) return null;
  for (const field of CANDIDATE_FIELDS) {
    const raw = pickRaw(event, field);
    if (isUseful(raw)) return raw;
  }
  const metadata = event["metadata"];
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    for (const field of METADATA_FIELDS) {
      const raw = pickRaw(metadata as Record<string, unknown>, field);
      if (isUseful(raw)) return raw;
    }
  }
  return null;
}

/** Dev-only debug — never logs in production builds. */
export function debugEventDescription(event: Record<string, unknown> | null | undefined): void {
  if (!import.meta.env.DEV) return;
  if (!event) return;
  const present: Record<string, number> = {};
  for (const field of CANDIDATE_FIELDS) {
    const raw = pickRaw(event, field);
    if (raw) present[field] = stripHtml(raw).length;
  }
  // eslint-disable-next-line no-console
  console.debug("[hasEventDescription]", {
    id: event["id"],
    fields: present,
    result: hasEventDescription(event),
  });
}
