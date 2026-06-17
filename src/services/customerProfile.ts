/**
 * Customer Profile Service — área do cliente Roxou.
 *
 * Login Magic Link, vínculo de reservas/VIP via public_token,
 * leitura das próprias reservas/VIP (RLS por auth.uid()).
 */
import { supabase } from "@/integrations/supabase/client";

export interface CustomerProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  marketing_consent: boolean;
  whatsapp_consent: boolean;
  email_consent: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerReservationRow {
  id: string;
  partner_id: string;
  name: string;
  people_count: number;
  reservation_date: string;
  status: string;
  total_price: number | null;
  deposit_amount: number | null;
  public_token: string;
  code: string | null;
  created_at: string;
  partner?: { name: string; slug: string; logo_url: string | null } | null;
}

export interface CustomerVipEntryRow {
  id: string;
  partner_id: string;
  list_id: string;
  name: string;
  phone: string | null;
  status: string;
  public_token: string;
  created_at: string;
  checked_in_at: string | null;
  partner?: { name: string; slug: string; logo_url: string | null } | null;
}

type LinkKind = "reservation" | "vip_entry";

export async function getMyCustomerProfile(): Promise<CustomerProfile | null> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from("customer_profiles")
    .select(
      "id, full_name, phone, email, avatar_url, marketing_consent, whatsapp_consent, email_consent, created_at, updated_at",
    )
    .eq("id", uid)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as CustomerProfile) ?? null;
}

export async function updateMyCustomerProfile(
  patch: Partial<
    Pick<
      CustomerProfile,
      | "full_name"
      | "phone"
      | "avatar_url"
      | "marketing_consent"
      | "whatsapp_consent"
      | "email_consent"
    >
  >,
): Promise<CustomerProfile> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Não autenticado.");
  const { data, error } = await supabase
    .from("customer_profiles")
    .update(patch)
    .eq("id", uid)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as unknown as CustomerProfile;
}

export async function linkRecordToCustomer(
  kind: LinkKind,
  publicToken: string,
): Promise<{ linked: boolean; kind: LinkKind }> {
  const { data, error } = await supabase.rpc("link_record_to_customer", {
    _kind: kind,
    _public_token: publicToken,
  });
  if (error) throw error;
  return data as unknown as { linked: boolean; kind: LinkKind };
}

export async function listMyReservations(): Promise<CustomerReservationRow[]> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase
    .from("partner_reservations")
    .select(
      "id, partner_id, name, people_count, reservation_date, status, total_price, deposit_amount, public_token, code, created_at, partner:partners(name, slug, logo_url)",
    )
    .eq("customer_id", uid)
    .order("reservation_date", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as CustomerReservationRow[];
}

export async function listMyVipEntries(): Promise<CustomerVipEntryRow[]> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase
    .from("partner_vip_list_entries")
    .select(
      "id, partner_id, list_id, name, phone, status, public_token, created_at, checked_in_at, partner:partners(name, slug, logo_url)",
    )
    .eq("customer_id", uid)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as CustomerVipEntryRow[];
}
