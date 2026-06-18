// Utilities for the Roxou Global Search experience.

export const normalizeText = (s: string | null | undefined): string =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

// Synonyms dictionary - expands user query into related keywords.
const SYNONYMS: Record<string, string[]> = {
  pagode: ["pagode", "samba", "roda de samba", "roda", "samba raiz"],
  samba: ["samba", "pagode", "roda de samba"],
  funk: ["funk", "baile", "mc", "baile funk", "favela"],
  baile: ["baile", "funk", "balada"],
  sertanejo: ["sertanejo", "modao", "country", "moda de viola", "viola"],
  modao: ["modao", "sertanejo"],
  bar: ["bar", "barzinho", "pub", "cervejaria", "boteco"],
  pub: ["pub", "bar"],
  show: ["show", "evento", "festa", "atracao"],
  festa: ["festa", "show", "balada", "evento"],
  hoje: ["hoje", "agenda de hoje", "o que fazer hoje"],
  futebol: ["futebol", "jogos", "copa", "transmissao", "jogo"],
  jogo: ["jogo", "jogos", "futebol", "copa"],
  balada: ["balada", "festa", "noite", "club"],
  rock: ["rock", "rock and roll", "banda"],
  eletronica: ["eletronica", "techno", "house", "rave"],
  forro: ["forro", "piseiro", "arrocha"],
  musica: ["musica", "show", "ao vivo"],
  ao: ["ao vivo"],
  vivo: ["ao vivo", "show"],
};

// Common typo corrections (lightweight, no full Levenshtein).
const TYPO_MAP: Record<string, string> = {
  prudnte: "prudente",
  prudent: "prudente",
  gauchos: "gauchos",
  sertaneijo: "sertanejo",
  sertanejos: "sertanejo",
  pagodi: "pagode",
  pagodes: "pagode",
  funks: "funk",
  baladas: "balada",
  bares: "bar",
  jogos: "jogo",
  shows: "show",
};

export const expandQuery = (raw: string): string[] => {
  const base = normalizeText(raw);
  if (!base) return [];
  const tokens = base.split(/\s+/).filter(Boolean);
  const expanded = new Set<string>([base]);
  tokens.forEach((tok) => {
    const corrected = TYPO_MAP[tok] || tok;
    expanded.add(corrected);
    const syns = SYNONYMS[corrected];
    if (syns) syns.forEach((s) => expanded.add(normalizeText(s)));
  });
  return Array.from(expanded);
};

// Levenshtein distance (small inputs, bounded).
const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 3) return 99;
  const dp = Array.from({ length: m + 1 }, (_, i) => i);
  for (let j = 1; j <= n; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= m; i++) {
      const tmp = dp[i];
      dp[i] = a[i - 1] === b[j - 1]
        ? prev
        : Math.min(prev, dp[i], dp[i - 1]) + 1;
      prev = tmp;
    }
  }
  return dp[m];
};

// Fuzzy match: returns true if any expanded variant matches haystack.
// Tolerates 1 typo per token (length >= 4).
export const fuzzyScore = (haystack: string, queryVariants: string[]): number => {
  const h = normalizeText(haystack);
  if (!h) return 0;
  let best = 0;
  for (const variant of queryVariants) {
    if (!variant) continue;
    if (h.includes(variant)) {
      // Higher score when prefix / exact word
      const idx = h.indexOf(variant);
      const score = idx === 0 ? 100 : 70 + Math.max(0, 30 - idx);
      if (score > best) best = score;
      continue;
    }
    // Token-level fuzzy
    const tokens = variant.split(" ").filter(Boolean);
    const hTokens = h.split(/\s+/);
    let tokenHits = 0;
    for (const t of tokens) {
      const hit = hTokens.some((ht) => {
        if (ht.includes(t)) return true;
        if (t.length >= 4 && levenshtein(t, ht.slice(0, t.length + 2)) <= 1) return true;
        return false;
      });
      if (hit) tokenHits++;
    }
    if (tokenHits === tokens.length && tokens.length > 0) {
      const score = 40 + tokenHits * 5;
      if (score > best) best = score;
    }
  }
  return best;
};

// Highlight matched terms inside text (returns array of {text, hit}).
export const highlightSegments = (
  text: string,
  queryVariants: string[],
): Array<{ text: string; hit: boolean }> => {
  if (!text || queryVariants.length === 0) return [{ text, hit: false }];
  const haystack = text;
  const norm = normalizeText(text);
  // Build set of variants ordered by length desc
  const variants = Array.from(new Set(queryVariants.filter((v) => v && v.length >= 2)))
    .sort((a, b) => b.length - a.length);
  if (variants.length === 0) return [{ text, hit: false }];

  const segments: Array<{ text: string; hit: boolean }> = [];
  let i = 0;
  while (i < haystack.length) {
    let matched = false;
    for (const v of variants) {
      // compare normalized substring
      const slice = norm.slice(i, i + v.length);
      if (slice === v) {
        segments.push({ text: haystack.slice(i, i + v.length), hit: true });
        i += v.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      // accumulate non-hit char
      if (segments.length && !segments[segments.length - 1].hit) {
        segments[segments.length - 1].text += haystack[i];
      } else {
        segments.push({ text: haystack[i], hit: false });
      }
      i++;
    }
  }
  return segments;
};

export type SearchResultType = "event" | "news" | "partner" | "category" | "match";

export interface SearchResultItem {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  href: string;
  image?: string | null;
  score: number;
}
