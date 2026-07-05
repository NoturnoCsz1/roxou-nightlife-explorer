/**
 * Sanitiza texto/HTML de usuário antes de renderizar.
 * Remove scripts, iframes, on* handlers, javascript: URLs, data: URIs perigosos.
 * Para textos puros (chat, comentários), use sanitizeText() — mais agressivo.
 */

export function sanitizeText(input: string | null | undefined, maxLen = 500): string {
  if (!input) return "";
  let s = String(input).slice(0, maxLen);
  // Remove tags HTML completamente
  s = s.replace(/<[^>]*>/g, "");
  // Remove protocolos perigosos em links inline
  s = s.replace(/javascript:/gi, "");
  s = s.replace(/data:text\/html/gi, "");
  // Normaliza espaços
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Sanitização leve para HTML que precisa preservar tags básicas (negrito, listas).
 * Remove apenas vetores claramente maliciosos.
 */
export function sanitizeRichHTML(input: string | null | undefined, maxLen = 5000): string {
  if (!input) return "";
  let s = String(input).slice(0, maxLen);
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
  s = s.replace(/<embed[\s\S]*?>/gi, "");
  s = s.replace(/<object[\s\S]*?<\/object>/gi, "");
  s = s.replace(/\son\w+\s*=\s*"[^"]*"/gi, "");
  s = s.replace(/\son\w+\s*=\s*'[^']*'/gi, "");
  s = s.replace(/javascript:/gi, "");
  return s;
}

/**
 * Valida se uma URL é segura (http/https/mailto/tel).
 */
export function isSafeUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url, window.location.origin);
    return ["http:", "https:", "mailto:", "tel:"].includes(u.protocol);
  } catch {
    return false;
  }
}
