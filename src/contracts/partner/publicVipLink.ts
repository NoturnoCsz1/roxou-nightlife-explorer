/**
 * Partner Pro — contrato público de link de Lista VIP.
 */

export type PublicVipLinkStatus = "open" | "closed" | "waitlist";

export interface PublicVipLink {
  /** Slug único da lista VIP (`/vip/:listSlug`). */
  listSlug: string;
  /** Slug alternativo por parceiro (`/:partnerSlug/vip`). */
  partnerSlug?: string;
  partnerId: string;
  title: string;
  status: PublicVipLinkStatus;
  /** Evento vinculado, se houver. */
  eventId?: string | null;
  /** ISO8601 de encerramento das inscrições. */
  closesAtIso?: string | null;
  /** URL canônica pública. */
  url: `/vip/${string}` | `/${string}/vip`;
}
