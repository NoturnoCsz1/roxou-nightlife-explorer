import type { Tables } from "@/integrations/supabase/types";
import { emptyTransmission } from "@/components/admin/TransmissionSection";

export type Partner = Tables<"partners">;

/**
 * Forma exata do state `form` extraído de `EventoForm.tsx` (Fase 3C1).
 * Não alterar campos, ordem ou defaults — paridade total com o original.
 */
export type EventoFormState = {
  title: string;
  slug: string;
  date_time: string;
  category: string;
  partner_id: string;
  venue_name: string;
  address: string;
  instagram: string;
  description: string;
  status: string;
  verification_source: string;
  featured: boolean;
  image_url: string;
  video_url: string;
  ticket_url: string;
  image_hash: string;
  opportunity_tags: string[];
  transport_reservation_enabled: boolean;
  time_is_unknown: boolean;
  short_summary: string;
  meta_title: string;
  meta_description: string;
  instagram_caption: string;
  ai_confidence_score: number | null;
  ai_warnings: string[];
  flyer_text: string;
  artists: string[];
  price: string;
  official_source_url: string;
} & ReturnType<typeof emptyTransmission>;

export type DuplicateCandidate = {
  id: string;
  title: string;
  slug: string;
  date_time: string;
  venue_name: string | null;
} | null;

export type SectionsState = { venue: boolean; content: boolean; media: boolean };

export const INPUT_CLASS =
  "w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 transition";
