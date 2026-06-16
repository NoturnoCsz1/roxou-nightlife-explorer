/**
 * Partner Access Requests service — Fase 10A.
 *
 * Camada cliente para o fluxo "Solicitar acesso ao Partner Pro".
 * Lê e escreve apenas em `partner_access_requests` + RPCs `request_partner_access`,
 * `approve_partner_access_request`, `reject_partner_access_request`.
 *
 * NÃO cria cadastro paralelo de estabelecimento; a fonte continua sendo `partners`.
 */
import { supabase } from "@/integrations/supabase/client";

export type PartnerAccessRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export interface PartnerAccessRequest {
  id: string;
  user_id: string;
  partner_id: string;
  requested_name: string | null;
  requested_email: string | null;
  requested_phone: string | null;
  message: string | null;
  status: PartnerAccessRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerSearchResult {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  type: string | null;
  instagram: string | null;
  logo_url: string | null;
  address: string | null;
}



/** Busca estabelecimentos existentes (somente leitura). */
export async function searchPartnersForOnboarding(
  query: string,
  limit = 20,
): Promise<PartnerSearchResult[]> {
  const q = query.trim();
  let req = supabase
    .from("partners")
    .select(
      "id, name, slug, city, type, instagram, logo_url, cover_url, address",
    )
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
  return (data ?? []) as PartnerSearchResult[];
}

export async function listMyAccessRequests(): Promise<PartnerAccessRequest[]> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return [];
  const { data, error } = await supabase
    .from("partner_access_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PartnerAccessRequest[];
}

export async function createAccessRequest(
  partnerId: string,
  payload: {
    requested_name?: string;
    requested_email?: string;
    requested_phone?: string;
    message?: string;
  },
): Promise<PartnerAccessRequest> {
  const { data, error } = await supabase.rpc("request_partner_access", {
    _partner_id: partnerId,
    _payload: payload,
  });
  if (error) throw error;
  return data as unknown as PartnerAccessRequest;
}

export async function cancelMyAccessRequest(id: string): Promise<void> {
  const { error } = await supabase
    .from("partner_access_requests")
    .update({ status: "cancelled" })
    .eq("id", id);
  if (error) throw error;
}

// =================== Admin ===================

export interface PartnerAccessRequestAdminRow extends PartnerAccessRequest {
  partner: { id: string; name: string; city: string | null; instagram: string | null } | null;
}

export async function listAllAccessRequests(
  status?: PartnerAccessRequestStatus,
): Promise<PartnerAccessRequestAdminRow[]> {
  let req = supabase
    .from("partner_access_requests")
    .select(
      `*, partner:partner_id ( id, name, city, instagram )`,
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) req = req.eq("status", status);
  const { data, error } = await req;
  if (error) throw error;
  return (data ?? []) as unknown as PartnerAccessRequestAdminRow[];
}

export async function approveAccessRequest(id: string): Promise<PartnerAccessRequest> {
  const { data, error } = await supabase.rpc("approve_partner_access_request", {
    _request_id: id,
  });
  if (error) throw error;
  return data as unknown as PartnerAccessRequest;
}

export async function rejectAccessRequest(id: string): Promise<PartnerAccessRequest> {
  const { data, error } = await supabase.rpc("reject_partner_access_request", {
    _request_id: id,
  });
  if (error) throw error;
  return data as unknown as PartnerAccessRequest;
}
