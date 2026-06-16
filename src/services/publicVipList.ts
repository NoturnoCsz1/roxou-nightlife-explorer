/**
 * Public VIP List service — Fase 10E
 *
 * Wrappers para RPCs públicas (sem login):
 *   - get_public_vip_list
 *   - submit_public_vip_entry
 */
import { supabase } from "@/integrations/supabase/client";

export interface PublicVipListInfo {
  id: string;
  public_slug: string;
  title: string;
  public_title: string | null;
  public_description: string | null;
  public_cover_url: string | null;
  public_rules: string | null;
  starts_at: string | null;
  ends_at: string | null;
  max_entries: number | null;
  used_entries: number;
  max_entries_per_person: number;
  status: string;
  requires_approval: boolean;
  partner_name: string | null;
  partner_city: string | null;
  partner_address: string | null;
  is_open: boolean;
}

export interface PublicVipSubmitResult {
  entry_id: string;
  public_token: string;
  status: string;
  qr_code_payload: string;
  list_title: string;
  people_count: number;
  name: string;
}

export async function getPublicVipList(slug: string): Promise<PublicVipListInfo | null> {
  if (!slug) return null;
  const { data, error } = await supabase.rpc("get_public_vip_list", {
    p_public_slug: slug,
  });
  if (error) throw error;
  return (data as unknown as PublicVipListInfo) ?? null;
}

export async function submitPublicVipEntry(input: {
  publicSlug: string;
  name: string;
  phone: string;
  email?: string | null;
  peopleCount?: number;
  promoterSlug?: string | null;
}): Promise<PublicVipSubmitResult> {
  const { data, error } = await supabase.rpc("submit_public_vip_entry", {
    p_public_slug: input.publicSlug,
    p_name: input.name,
    p_phone: input.phone,
    p_email: input.email ?? null,
    p_people_count: input.peopleCount ?? 1,
    p_promoter_slug: input.promoterSlug ?? null,
  });
  if (error) throw error;
  if (!data) throw new Error("Não foi possível concluir a inscrição.");
  return data as unknown as PublicVipSubmitResult;
}
