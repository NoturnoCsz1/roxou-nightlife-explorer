/**
 * Partner Dashboard Service — Fase 9D
 *
 * Agrega o que o Dashboard MVP precisa, lendo APENAS:
 * - partners
 * - partner_awards
 * - events
 *
 * Nunca cria perfis paralelos.
 */
import { supabase } from "@/integrations/supabase/client";

export interface PartnerDetails {
  id: string;
  name: string;
  slug: string | null;
  type: string | null;
  logo_url: string | null;
  city: string | null;
  neighborhood: string | null;
  address: string | null;
  formatted_address: string | null;
  instagram: string | null;
  instagram_username: string | null;
  whatsapp: string | null;
  short_description: string | null;
  full_description: string | null;
  verified_partner: boolean | null;
  music_style_primary: string | null;
}

export interface PartnerAward {
  id: string;
  award_type: string;
  title: string;
  description: string | null;
  month: number | null;
  year: number | null;
  image_url: string | null;
}

export interface PartnerEventRow {
  id: string;
  title: string;
  slug: string | null;
  date_time: string;
  status: string | null;
  image_url: string | null;
  city: string | null;
}

export interface PartnerEventCounts {
  published: number;
  active: number;
  total: number;
}

export async function getPartnerDetails(
  partnerId: string,
): Promise<PartnerDetails | null> {
  if (!partnerId) return null;
  const { data, error } = await supabase
    .from("partners")
    .select(
      "id, name, slug, type, logo_url, city, neighborhood, address, formatted_address, instagram, instagram_username, whatsapp, short_description, full_description, verified_partner, music_style_primary",
    )
    .eq("id", partnerId)
    .maybeSingle();
  if (error) throw error;
  return (data as PartnerDetails | null) ?? null;
}

export async function getPartnerCurrentAward(
  partnerId: string,
): Promise<PartnerAward | null> {
  if (!partnerId) return null;
  const { data, error } = await supabase
    .from("partner_awards")
    .select("id, award_type, title, description, month, year, image_url")
    .eq("partner_id", partnerId)
    .eq("active", true)
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return (data as PartnerAward | null) ?? null;
}

export async function getPartnerRecentEvents(
  partnerId: string,
  limit = 5,
): Promise<PartnerEventRow[]> {
  if (!partnerId) return [];
  const { data, error } = await supabase
    .from("events")
    .select("id, title, slug, date_time, status, image_url, city")
    .eq("partner_id", partnerId)
    .order("date_time", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as PartnerEventRow[];
}

export async function getPartnerEventCounts(
  partnerId: string,
): Promise<PartnerEventCounts> {
  if (!partnerId) return { published: 0, active: 0, total: 0 };

  const nowIso = new Date().toISOString();

  const [{ count: totalCount }, { count: publishedCount }, { count: activeCount }] =
    await Promise.all([
      supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("partner_id", partnerId),
      supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("partner_id", partnerId)
        .eq("status", "published"),
      supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("partner_id", partnerId)
        .eq("status", "published")
        .gte("date_time", nowIso),
    ]);

  return {
    total: totalCount ?? 0,
    published: publishedCount ?? 0,
    active: activeCount ?? 0,
  };
}
