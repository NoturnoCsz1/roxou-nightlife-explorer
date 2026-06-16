/**
 * Public VIP List service — Fase 10F
 *
 * RPCs públicas (sem login):
 *   - get_public_vip_list(public_slug)
 *   - get_public_vip_list_by_partner(partner_slug)
 *   - submit_public_vip_entry(...) — 1 cadastro = 1 pessoa, com LGPD
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
  allow_multiple_people_per_entry: boolean;
  status: string;
  requires_approval: boolean;
  partner_id: string;
  partner_name: string | null;
  partner_city: string | null;
  partner_address: string | null;
  partner_slug: string | null;
  partner_logo_url: string | null;
  is_open: boolean;
}

export interface PublicVipSubmitResult {
  entry_id: string;
  public_token: string;
  status: string;
  qr_code_payload: string;
  list_title: string;
  name: string;
  phone: string | null;
  promoter_name: string | null;
  lead_id?: string;
}

export async function getPublicVipList(slug: string): Promise<PublicVipListInfo | null> {
  if (!slug) return null;
  const { data, error } = await supabase.rpc("get_public_vip_list", {
    p_public_slug: slug,
  });
  if (error) throw error;
  return (data as unknown as PublicVipListInfo) ?? null;
}

export async function getPublicVipListByPartner(
  partnerSlug: string,
): Promise<PublicVipListInfo | null> {
  if (!partnerSlug) return null;
  const { data, error } = await supabase.rpc("get_public_vip_list_by_partner", {
    p_partner_slug: partnerSlug,
  });
  if (error) throw error;
  return (data as unknown as PublicVipListInfo) ?? null;
}

export interface SubmitPublicVipInput {
  publicSlug: string;
  name: string;
  phone: string;
  email?: string | null;
  promoterSlug?: string | null;
  marketingConsent?: boolean;
  whatsappConsent?: boolean;
  emailConsent?: boolean;
}

export async function submitPublicVipEntry(
  input: SubmitPublicVipInput,
): Promise<PublicVipSubmitResult> {
  const { data, error } = await supabase.rpc("submit_public_vip_entry", {
    p_public_slug: input.publicSlug,
    p_name: input.name,
    p_phone: input.phone,
    p_email: input.email ?? null,
    p_promoter_slug: input.promoterSlug ?? null,
    p_marketing_consent: input.marketingConsent ?? false,
    p_whatsapp_consent: input.whatsappConsent ?? false,
    p_email_consent: input.emailConsent ?? false,
  });
  if (error) throw error;
  if (!data) throw new Error("Não foi possível concluir a inscrição.");
  return data as unknown as PublicVipSubmitResult;
}
