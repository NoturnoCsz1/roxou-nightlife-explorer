/**
 * Partner Pro — contrato público de Bio/Menu.
 *
 * Renderização pública consumida por Descobertas (`/bio/:slug`,
 * `/bio/:slug/menu`).
 */

export interface PublicBio {
  slug: string;
  partnerId: string;
  displayName: string;
  headline?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  themeColor?: string | null;
  /** URLs pré-formatadas para CTAs (WhatsApp, IG, cardápio, reserva). */
  ctas: {
    whatsappUrl?: string | null;
    instagramUrl?: string | null;
    menuUrl?: `/bio/${string}/menu` | null;
    reservationUrl?: `/reserva/${string}` | null;
    vipUrl?: `/vip/${string}` | `/${string}/vip` | null;
  };
}
