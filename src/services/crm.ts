/**
 * CRM Roxou — Fase 1 (núcleo).
 * Sem campanhas. Sem disparo WhatsApp/e-mail. Apenas leitura, ingestão segura
 * e revelação auditada de dados completos.
 */
import { supabase } from "@/integrations/supabase/client";

export type CrmSourceType =
  | "reservation"
  | "vip_list"
  | "excursion"
  | "ride"
  | "checkin";

export interface CrmCustomer {
  id: string;
  full_name: string | null;
  phone: string | null;
  phone_normalized: string | null;
  email: string | null;
  cpf_hash: string | null;
  city: string | null;
  birth_date: string | null;
  source: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown> | null;
}

export interface CrmLink {
  id: string;
  customer_id: string;
  partner_id: string | null;
  event_id: string | null;
  source_type: string;
  source_id: string | null;
  created_at: string;
}

export interface CrmConsent {
  id: string;
  customer_id: string;
  channel: string;
  consent_type: string;
  granted_at: string | null;
  revoked_at: string | null;
  source: string | null;
  opt_out_token: string | null;
  created_at: string;
}

export interface CrmAuditLog {
  id: string;
  customer_id: string | null;
  actor_user_id: string | null;
  actor_partner_id: string | null;
  action: string;
  field: string | null;
  created_at: string;
}

// ────────────────────────────────────────────────────────────────
// Ingestão / dedupe
// ────────────────────────────────────────────────────────────────
export async function upsertCrmCustomer(input: {
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  source: string;
  partner_id?: string | null;
  event_id?: string | null;
  source_type: CrmSourceType;
  source_id?: string | null;
  marketing_consent?: boolean;
  consent_channel?: "whatsapp" | "email" | "sms" | "push";
}): Promise<string | null> {
  const { data, error } = await supabase.rpc("crm_upsert_customer_and_link", {
    _full_name: input.full_name ?? null,
    _phone: input.phone ?? null,
    _email: input.email ?? null,
    _city: input.city ?? null,
    _source: input.source,
    _partner_id: input.partner_id ?? null,
    _event_id: input.event_id ?? null,
    _source_type: input.source_type,
    _source_id: input.source_id ?? null,
    _marketing_consent: input.marketing_consent ?? false,
    _consent_channel: input.consent_channel ?? "whatsapp",
  });
  if (error) {
    console.error("[crm.upsert] error", error);
    return null;
  }
  return (data as string) ?? null;
}

// ────────────────────────────────────────────────────────────────
// Listagem / busca
// ────────────────────────────────────────────────────────────────
export async function listCrmCustomers(params?: {
  search?: string;
  source?: string;
  partnerId?: string;
  limit?: number;
}): Promise<CrmCustomer[]> {
  let q = supabase
    .from("crm_customers")
    .select("*")
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .limit(params?.limit ?? 100);

  if (params?.source) q = q.eq("source", params.source);
  if (params?.search) {
    const s = params.search.trim();
    q = q.or(
      `full_name.ilike.%${s}%,email.ilike.%${s}%,phone_normalized.ilike.%${s.replace(/\D/g, "")}%`,
    );
  }
  const { data, error } = await q;
  if (error) {
    console.error("[crm.list] error", error);
    return [];
  }
  return (data ?? []) as CrmCustomer[];
}

export async function listCrmLinks(customerId: string): Promise<CrmLink[]> {
  const { data, error } = await supabase
    .from("crm_customer_links")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as CrmLink[];
}

export async function listCrmConsents(customerId: string): Promise<CrmConsent[]> {
  const { data, error } = await supabase
    .from("crm_consents")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as CrmConsent[];
}

export async function listCrmAuditLogs(customerId: string): Promise<CrmAuditLog[]> {
  const { data, error } = await supabase
    .from("crm_customer_audit_logs")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return [];
  return (data ?? []) as CrmAuditLog[];
}

// ────────────────────────────────────────────────────────────────
// Reveal auditado
// ────────────────────────────────────────────────────────────────
export async function revealCustomerField(
  customerId: string,
  field: "phone" | "email" | "cpf_hash",
  partnerId?: string | null,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("crm_reveal_customer_field", {
    _customer_id: customerId,
    _field: field,
    _partner_id: partnerId ?? null,
  });
  if (error) {
    console.error("[crm.reveal] error", error);
    return null;
  }
  return (data as string) ?? null;
}

// ────────────────────────────────────────────────────────────────
// Partner: clientes vinculados ao partner_id
// ────────────────────────────────────────────────────────────────
export async function listPartnerCrmCustomers(partnerId: string): Promise<{
  customer: CrmCustomer;
  interactions: number;
  last_seen_at: string | null;
}[]> {
  const { data: links, error } = await supabase
    .from("crm_customer_links")
    .select("customer_id, created_at")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error || !links?.length) return [];

  const counts = new Map<string, { interactions: number; last: string | null }>();
  for (const l of links) {
    const cur = counts.get(l.customer_id) ?? { interactions: 0, last: null };
    cur.interactions += 1;
    if (!cur.last || (l.created_at && l.created_at > cur.last)) cur.last = l.created_at;
    counts.set(l.customer_id, cur);
  }
  const ids = Array.from(counts.keys());
  const { data: customers } = await supabase
    .from("crm_customers")
    .select("*")
    .in("id", ids);

  return (customers ?? []).map((c) => {
    const meta = counts.get(c.id)!;
    return {
      customer: c as CrmCustomer,
      interactions: meta.interactions,
      last_seen_at: meta.last,
    };
  });
}

// ────────────────────────────────────────────────────────────────
// Opt-out público
// ────────────────────────────────────────────────────────────────
export async function revokeConsentByToken(token: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("crm_revoke_consent_by_token", {
    _token: token,
  });
  if (error) return false;
  return !!data;
}
