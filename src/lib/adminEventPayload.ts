import type { TablesInsert } from "@/integrations/supabase/types";

export type AdminEventFormInput = {
  title: string;
  slug: string;
  date_time: string;
  category: string;
  partner_id?: string;
  venue_name?: string;
  address?: string;
  instagram?: string;
  description?: string;
  status?: string;
  verification_source?: string;
  featured?: boolean;
  image_url?: string;
  video_url?: string;
  ticket_url?: string;
  image_hash?: string;
  _sub?: string;
  opportunity_tags?: string[];
  ai_confidence?: string;
  needs_review?: boolean;
  is_sports_transmission?: boolean;
  sports_match_id?: string | null;
  transmission_channel?: string | null;
  transmission_url?: string | null;
  transmission_notes?: string | null;
};

interface BuildEventPayloadOptions {
  city?: string | null;
  status?: "draft" | "published";
}

export function buildEventPayload(
  form: AdminEventFormInput,
  options: BuildEventPayloadOptions = {},
): TablesInsert<"events"> {
  const payload: Record<string, unknown> = {
    title: form.title,
    slug: form.slug,
    date_time: `${form.date_time}:00-03:00`,
    category: form.category,
    partner_id: form.partner_id || null,
    venue_name: form.venue_name || null,
    address: form.address || null,
    instagram: form.instagram || null,
    description: form.description || null,
    status: options.status ?? form.status ?? "draft",
    verification_source: form.verification_source || null,
    featured: Boolean(form.featured),
    image_url: form.image_url || null,
    video_url: form.video_url || null,
    image_hash: form.image_hash || null,
    ticket_url: form.ticket_url || null,
    sub_category: form._sub || null,
    opportunity_tags: form.opportunity_tags || [],
    ai_confidence: form.ai_confidence || "medium",
    needs_review: Boolean(form.needs_review),
    is_sports_transmission: Boolean(form.is_sports_transmission),
    sports_match_id: form.sports_match_id || null,
    transmission_channel: form.transmission_channel || null,
    transmission_url: form.transmission_url || null,
    transmission_notes: form.transmission_notes || null,
  };

  if (options.city) {
    payload.city = options.city;
  }

  return payload as TablesInsert<"events">;
}
