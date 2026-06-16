/**
 * Partner Pilot Service — Fase 10B.
 *
 * Camada admin para gerenciar o piloto fechado do Partner Pro com 2
 * estabelecimentos reais. Não cria parceiro novo; usa somente
 * `partners` existentes + helpers SECURITY DEFINER `admin_*`.
 */
import { supabase } from "@/integrations/supabase/client";

export interface PilotPartner {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  type: string | null;
  instagram: string | null;
  logo_url: string | null;
}

export interface PilotUserLookup {
  user_id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

export interface PilotTeamMember {
  partner_user_id: string;
  user_id: string;
  email: string | null;
  role: string;
  is_active: boolean;
  beta_enabled: boolean;
  last_sign_in_at: string | null;
  created_at: string;
}

export interface PilotSubscription {
  plan: "free" | "pro" | "premium" | "enterprise";
  status: "trial" | "active" | "past_due" | "canceled" | "expired";
  started_at: string | null;
  expires_at: string | null;
}

export interface PilotStatus {
  events_created: number;
  reservations_count: number;
  vip_lists_count: number;
  feedback_count: number;
  active_team: number;
  active_beta: number;
  last_sign_in_at: string | null;
  subscription: PilotSubscription | null;
}

export async function searchPilotPartners(query: string, limit = 30): Promise<PilotPartner[]> {
  const q = query.trim();
  let req = supabase
    .from("partners")
    .select("id, name, slug, city, type, instagram, logo_url")
    .order("name", { ascending: true })
    .limit(limit);

  if (q.length > 0) {
    const like = `%${q}%`;
    req = req.or(
      [
        `name.ilike.${like}`,
        `instagram.ilike.${like}`,
        `city.ilike.${like}`,
        `type.ilike.${like}`,
      ].join(","),
    );
  }
  const { data, error } = await req;
  if (error) throw error;
  return (data ?? []) as PilotPartner[];
}

export async function findUserByEmail(email: string): Promise<PilotUserLookup | null> {
  const { data, error } = await supabase.rpc("admin_find_user_by_email", { _email: email });
  if (error) throw error;
  const rows = (data ?? []) as PilotUserLookup[];
  return rows[0] ?? null;
}

export async function listPartnerTeam(partnerId: string): Promise<PilotTeamMember[]> {
  const { data, error } = await supabase.rpc("admin_list_partner_team", {
    _partner_id: partnerId,
  });
  if (error) throw error;
  return (data ?? []) as PilotTeamMember[];
}

export async function linkPartnerPilot(
  partnerId: string,
  userId: string,
  role: "owner" | "admin" | "editor" | "attendant" = "owner",
  notes = "Piloto Partner Pro",
): Promise<void> {
  const { error } = await supabase.rpc("admin_link_partner_pilot", {
    _partner_id: partnerId,
    _user_id: userId,
    _role: role,
    _notes: notes,
  });
  if (error) throw error;
}

export async function revokePartnerPilot(partnerId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_revoke_partner_pilot", {
    _partner_id: partnerId,
    _user_id: userId,
  });
  if (error) throw error;
}

export async function upsertPartnerSubscription(
  partnerId: string,
  plan: PilotSubscription["plan"],
  status: PilotSubscription["status"],
  expiresAt: string | null = null,
): Promise<void> {
  const { error } = await supabase.rpc("admin_upsert_partner_subscription", {
    _partner_id: partnerId,
    _plan: plan,
    _status: status,
    _expires_at: expiresAt,
  });
  if (error) throw error;
}

export async function getPilotStatus(partnerId: string): Promise<PilotStatus> {
  const { data, error } = await supabase.rpc("admin_partner_pilot_status", {
    _partner_id: partnerId,
  });
  if (error) throw error;
  return data as unknown as PilotStatus;
}
