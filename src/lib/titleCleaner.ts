/**
 * Limpa e padroniza títulos detectados pelo Radar IA.
 * Sem IA: regex + Title Case + remoção de spam.
 * Nunca inventa artistas nem informações.
 */

const SPAM_PHRASES = [
  "hoje tem", "sextou", "sabadou", "domingou", "imperdivel", "imperdível",
  "corre", "corra", "bora", "vamoo", "vamoooo", "vamos", "ultima chance",
  "última chance", "ingresso garantido", "lote promocional", "ultimos ingressos",
  "últimos ingressos", "promocao", "promoção", "open bar liberado",
  "atencao", "atenção", "aviso", "novidade", "novidades",
];

const PROMO_REGEX = /\b(r\$\s?\d+|\d+\s?reais?|combo|promo|desconto|gratis|grátis|free|happy hour)\b/gi;
const PHONE_REGEX = /(\+?\d{2}\s?)?\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/g;
const HASHTAG_REGEX = /#\w+/g;
const MENTION_REGEX = /@\w+/g;
const URL_REGEX = /https?:\/\/\S+/g;
const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/gu;
const REPEATED_PUNCT = /([!?.])\1{1,}/g;
const REPEATED_CHARS = /(.)\1{2,}/g;

const LOWER_WORDS = new Set([
  "de", "da", "do", "das", "dos", "e", "o", "a", "os", "as", "no", "na",
  "nos", "nas", "em", "com", "por", "para", "um", "uma", "ao", "à",
]);

function toTitleCase(input: string): string {
  return input
    .toLowerCase()
    .split(/\s+/)
    .map((word, i) => {
      if (!word) return "";
      // mantém siglas curtas em caixa alta se originalmente curtas (DJ, MC, etc)
      if (/^(dj|mc|vip|rj|sp|pp)$/i.test(word)) return word.toUpperCase();
      if (i > 0 && LOWER_WORDS.has(word)) return word;
      // capitaliza após hífen também
      return word
        .split("-")
        .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : ""))
        .join("-");
    })
    .filter(Boolean)
    .join(" ");
}

function stripSpamPhrases(input: string): string {
  let out = input;
  for (const phrase of SPAM_PHRASES) {
    const re = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    out = out.replace(re, " ");
  }
  return out;
}

export function cleanEventTitle(raw: string | null | undefined): string {
  if (!raw) return "";
  let s = String(raw);

  // Remove URLs, hashtags, menções, telefones, emojis
  s = s.replace(URL_REGEX, " ");
  s = s.replace(HASHTAG_REGEX, " ");
  s = s.replace(MENTION_REGEX, " ");
  s = s.replace(PHONE_REGEX, " ");
  s = s.replace(EMOJI_REGEX, " ");

  // Remove promoções e spam de marketing
  s = s.replace(PROMO_REGEX, " ");
  s = stripSpamPhrases(s);

  // Normaliza pontuação e caracteres repetidos
  s = s.replace(REPEATED_PUNCT, "$1");
  s = s.replace(REPEATED_CHARS, "$1$1");

  // Remove pontuação solta no início/fim e espaços extras
  s = s.replace(/[\-–—|•·:;,.!?]+/g, " ");
  s = s.replace(/\s+/g, " ").trim();

  if (!s) return "";

  // Caixa alta excessiva → Title Case
  const upperRatio = (s.match(/[A-ZÀ-Ý]/g) || []).length / Math.max(s.replace(/\s/g, "").length, 1);
  if (upperRatio > 0.5) {
    s = toTitleCase(s);
  } else {
    // mesmo assim aplica Title Case leve na primeira palavra
    s = s.charAt(0).toUpperCase() + s.slice(1);
  }

  // Limita comprimento (SEO-friendly)
  if (s.length > 80) {
    s = s.slice(0, 77).replace(/\s+\S*$/, "") + "…";
  }

  return s;
}

/**
 * Retorna true se a limpeza realmente alterou o título de forma significativa.
 */
export function wasTitleOptimized(original: string | null | undefined, cleaned: string): boolean {
  if (!original || !cleaned) return false;
  const a = original.trim().toLowerCase();
  const b = cleaned.trim().toLowerCase();
  if (a === b) return false;
  // diferença mínima de 3 chars ou redução >15%
  return Math.abs(a.length - b.length) >= 3 || (1 - b.length / a.length) > 0.15;
}
