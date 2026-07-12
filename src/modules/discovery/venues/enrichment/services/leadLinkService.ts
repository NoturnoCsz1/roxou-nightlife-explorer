/**
 * Onda 16 — Lead Intelligence
 * Helpers puros para geração de URLs de leads.
 * Nenhum acesso externo. Nenhum side-effect.
 */
import {
  buildWhatsappLink as buildWhatsappLinkBase,
  buildWhatsappMessage as buildWhatsappMessageBase,
  normalizeWhatsappPhone,
} from "./whatsappLinkService";

export { buildWhatsappMessageBase as buildWhatsappMessage };
export { buildWhatsappLinkBase as buildWhatsappLink };

/** tel: link a partir de qualquer formato (mantém + inicial se presente). */
export function buildPhoneLink(phone: string): string {
  const raw = (phone ?? "").trim();
  const plus = raw.startsWith("+") ? "+" : "";
  const digits = normalizeWhatsappPhone(raw);
  return `tel:${plus}${digits}`;
}

/** Google Maps: por coordenadas, endereço ou placeId. */
export interface MapsLinkParams {
  placeId?: string | null;
  query?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  directions?: boolean;
}
export function buildMapsLink(params: MapsLinkParams): string {
  const base = params.directions
    ? "https://www.google.com/maps/dir/?api=1"
    : "https://www.google.com/maps/search/?api=1";
  const parts: string[] = [];
  if (params.placeId) parts.push(`query_place_id=${encodeURIComponent(params.placeId)}`);
  if (typeof params.latitude === "number" && typeof params.longitude === "number") {
    const dest = `${params.latitude},${params.longitude}`;
    parts.push(params.directions ? `destination=${dest}` : `query=${dest}`);
  } else if (params.query) {
    parts.push(
      params.directions
        ? `destination=${encodeURIComponent(params.query)}`
        : `query=${encodeURIComponent(params.query)}`,
    );
  }
  return parts.length ? `${base}&${parts.join("&")}` : base;
}

/** Instagram profile URL a partir de handle (@ opcional) ou URL completa. */
export function buildInstagramLink(handleOrUrl: string): string {
  const raw = (handleOrUrl ?? "").trim();
  if (!raw) return "https://www.instagram.com/";
  if (/^https?:\/\//i.test(raw)) return raw;
  const handle = raw.replace(/^@+/, "").replace(/\/+$/, "");
  return `https://www.instagram.com/${handle}/`;
}
