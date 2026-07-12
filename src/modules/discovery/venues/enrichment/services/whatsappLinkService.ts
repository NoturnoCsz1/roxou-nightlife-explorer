/**
 * Onda 15 — Venue Intelligence
 * Helper para geração de links WhatsApp com mensagem padrão Roxou.
 *
 * Não integra API oficial. Apenas monta URL wa.me com texto codificado.
 */

export interface WhatsappLinkParams {
  /** Telefone em qualquer formato — dígitos serão extraídos. */
  phone: string;
  /** URL da página que originou o clique (opcional, entra na mensagem). */
  url?: string;
  /** Substitui a mensagem padrão. */
  message?: string;
}

const DEFAULT_TEMPLATE =
  "Olá! Encontrei vocês através da Roxou e gostaria de obter mais informações.";

/** Normaliza o telefone deixando apenas dígitos (com DDI se presente). */
export function normalizeWhatsappPhone(phone: string): string {
  return (phone ?? "").replace(/\D+/g, "");
}

export function buildWhatsappMessage(url?: string, custom?: string): string {
  if (custom && custom.trim().length > 0) return custom;
  return url ? `${DEFAULT_TEMPLATE}\n\nPágina:\n${url}` : DEFAULT_TEMPLATE;
}

export function buildWhatsappLink(params: WhatsappLinkParams): string {
  const digits = normalizeWhatsappPhone(params.phone);
  const text = buildWhatsappMessage(params.url, params.message);
  const query = `?text=${encodeURIComponent(text)}`;
  return `https://wa.me/${digits}${query}`;
}
