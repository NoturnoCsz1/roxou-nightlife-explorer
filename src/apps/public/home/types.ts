// ─── Tipos compartilhados da Home pública (V3Home shell) ───
// Extraído de src/pages/v3/V3Home.tsx (Fase 5) — sem alteração de shape.

export interface Ev {
  id: string;
  slug: string;
  title: string;
  image_url: string | null;
  date_time: string;
  venue_name: string | null;
  category: string;
  sub_category?: string | null;
  featured: boolean;
  partner_id: string | null;
  ticket_url: string | null;
  video_url?: string | null;
  transport_reservation_enabled?: boolean;
}

export interface VenueRank {
  id: string;
  name: string;
  slug: string;
  type: string;
  logo_url: string | null;
  short_description: string | null;
  views: number;
  upcoming_events: number;
  verified_partner: boolean;
  follower_count?: number;
}
