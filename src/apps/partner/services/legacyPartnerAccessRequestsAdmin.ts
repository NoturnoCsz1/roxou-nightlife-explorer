/**
 * LEGACY — Admin Roxou: vínculos antigos em `partner_access_requests`.
 *
 * Mantido intacto (Supabase legado) apenas para a aba "Vínculos" do Admin.
 * O fluxo novo de onboarding do Partner Pro NÃO usa este arquivo.
 */
import { supabase } from "@/integrations/supabase/client";

export type LegacyAccessRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export interface LegacyPartnerAccessRequest {
  id: string;
  user_id: string;
  partner_id: string;
  requested_name: string | null;
  requested_email: string | null;
  requested_phone: string | null;
  message: string | null;
  status: LegacyAccessRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerAccessRequestAdminRow extends LegacyPartnerAccessRequest {
  partner: {
    id: string;
    name: string;
    city: string | null;
    instagram: string | null;
  } | null;
}

export async function listAllAccessRequests(
  status?: LegacyAccessRequestStatus,
): Promise<PartnerAccessRequestAdminRow[]> {
  let req = supabase
    .from("partner_access_requests")
    .select(`*, partner:partner_id ( id, name, city, instagram )`)
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) req = req.eq("status", status);
  const { data, error } = await req;
  if (error) throw error;
  return (data ?? []) as unknown as PartnerAccessRequestAdminRow[];
}

export async function approveAccessRequest(
  id: string,
): Promise<LegacyPartnerAccessRequest> {
  const { data, error } = await supabase.rpc("approve_partner_access_request", {
    _request_id: id,
  });
  if (error) throw error;
  return data as unknown as LegacyPartnerAccessRequest;
}

export async function rejectAccessRequest(
  id: string,
): Promise<LegacyPartnerAccessRequest> {
  const { data, error } = await supabase.rpc("reject_partner_access_request", {
    _request_id: id,
  });
  if (error) throw error;
  return data as unknown as LegacyPartnerAccessRequest;
}
