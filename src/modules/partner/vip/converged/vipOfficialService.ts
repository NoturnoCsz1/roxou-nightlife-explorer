/**
 * VIP — camada CONVERTIDA (Fase 3).
 *
 * Tenancy oficial: organization_id + venue_id.
 * Tabelas oficiais: vip_lists, vip_list_entries.
 *
 * Toda mutação sensível passa por RPC SECURITY DEFINER, que valida
 * membership e pertencimento do venue à organization.
 */
import { officialClient } from "@modules/partner/converged/client";
import {
  requireOrganization,
  requireVenue,
  type PartnerScope,
} from "@modules/partner/converged/tenancy";

export const VIP_LISTS_TABLE = "vip_lists" as const;
export const VIP_LIST_ENTRIES_TABLE = "vip_list_entries" as const;

export type VipListStatus = "draft" | "open" | "closed" | "archived";
export type VipEntryStatus =
  | "pending"
  | "approved"
  | "checked_in"
  | "cancelled"
  | "no_show";

export interface OfficialVipList {
  id: string;
  organization_id: string;
  venue_id: string;
  event_id: string | null;
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  max_entries: number | null;
  status: VipListStatus;
  public_slug: string;
  public_enabled: boolean;
  public_title: string | null;
  public_description: string | null;
  public_cover_url: string | null;
  rules: string | null;
  max_entries_per_person: number;
  requires_approval: boolean;
  allow_multiple_people_per_entry: boolean;
  closes_at: string | null;
  auto_close_enabled: boolean;
  close_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface OfficialVipEntry {
  id: string;
  vip_list_id: string;
  organization_id: string;
  venue_id: string;
  event_id: string | null;
  user_id: string | null;
  promoter_profile_id: string | null;
  promoter_name_snapshot: string | null;
  name: string;
  phone: string | null;
  normalized_phone: string | null;
  email: string | null;
  people_count: number;
  status: VipEntryStatus;
  checked_in_at: string | null;
  checked_in_by: string | null;
  public_token: string;
  qr_code_payload: string | null;
  source: string;
  public_submitted_at: string | null;
  marketing_consent: boolean;
  whatsapp_consent: boolean;
  email_consent: boolean;
  created_at: string;
  updated_at: string;
}

export interface VipListPayload {
  title?: string;
  description?: string | null;
  event_id?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  max_entries?: number | null;
  max_entries_per_person?: number;
  requires_approval?: boolean;
  allow_multiple_people_per_entry?: boolean;
  public_enabled?: boolean;
  public_title?: string | null;
  public_description?: string | null;
  public_cover_url?: string | null;
  rules?: string | null;
  closes_at?: string | null;
  auto_close_enabled?: boolean;
}

export interface VipEntryPayload {
  name?: string;
  phone?: string | null;
  email?: string | null;
  people_count?: number;
  promoter_profile_id?: string | null;
  status?: VipEntryStatus;
}

function unwrap<T>(result: { data: unknown; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data as T;
}

// ---------------------------------------------------------------- leitura

export async function listVipLists(
  scope: PartnerScope,
  opts: { status?: VipListStatus | "all"; limit?: number } = {},
): Promise<OfficialVipList[]> {
  const organizationId = requireOrganization(scope);
  const venueId = requireVenue(scope);
  let q = officialClient()
    .from(VIP_LISTS_TABLE)
    .select("*")
    .eq("organization_id", organizationId)
    .eq("venue_id", venueId)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.status && opts.status !== "all") q = q.eq("status", opts.status);
  return unwrap<OfficialVipList[]>(await q) ?? [];
}

export async function getVipList(
  scope: PartnerScope,
  listId: string,
): Promise<OfficialVipList | null> {
  const organizationId = requireOrganization(scope);
  const data = unwrap<OfficialVipList | null>(
    await officialClient()
      .from(VIP_LISTS_TABLE)
      .select("*")
      .eq("id", listId)
      .eq("organization_id", organizationId)
      .maybeSingle(),
  );
  return data ?? null;
}

export async function listVipEntries(
  scope: PartnerScope,
  listId: string,
): Promise<OfficialVipEntry[]> {
  const organizationId = requireOrganization(scope);
  return (
    unwrap<OfficialVipEntry[]>(
      await officialClient()
        .from(VIP_LIST_ENTRIES_TABLE)
        .select("*")
        .eq("organization_id", organizationId)
        .eq("vip_list_id", listId)
        .order("created_at", { ascending: false }),
    ) ?? []
  );
}

// ---------------------------------------------------------------- escrita

export async function createVipList(
  scope: PartnerScope,
  payload: VipListPayload,
): Promise<OfficialVipList> {
  const organizationId = requireOrganization(scope);
  const venueId = requireVenue(scope);
  if (!payload.title?.trim()) throw new Error("Título é obrigatório.");
  return unwrap<OfficialVipList>(
    await officialClient().rpc("partner_create_vip_list", {
      p_organization_id: organizationId,
      p_venue_id: venueId,
      p_payload: payload,
    }),
  );
}

export async function updateVipList(
  scope: PartnerScope,
  listId: string,
  payload: VipListPayload,
): Promise<OfficialVipList> {
  requireOrganization(scope);
  return unwrap<OfficialVipList>(
    await officialClient().rpc("partner_update_vip_list", {
      p_vip_list_id: listId,
      p_payload: payload,
    }),
  );
}

async function setVipListState(
  scope: PartnerScope,
  listId: string,
  state: "open" | "closed" | "archived",
  reason?: string | null,
): Promise<OfficialVipList> {
  requireOrganization(scope);
  return unwrap<OfficialVipList>(
    await officialClient().rpc("partner_set_vip_list_state", {
      p_vip_list_id: listId,
      p_state: state,
      p_reason: reason ?? null,
    }),
  );
}

export const openVipList = (s: PartnerScope, id: string) =>
  setVipListState(s, id, "open");
export const closeVipList = (s: PartnerScope, id: string, reason?: string | null) =>
  setVipListState(s, id, "closed", reason);
export const archiveVipList = (s: PartnerScope, id: string) =>
  setVipListState(s, id, "archived");

export async function addVipEntry(
  scope: PartnerScope,
  listId: string,
  payload: VipEntryPayload,
): Promise<OfficialVipEntry> {
  requireOrganization(scope);
  if (!payload.name?.trim()) throw new Error("Nome é obrigatório.");
  return unwrap<OfficialVipEntry>(
    await officialClient().rpc("partner_add_vip_entry", {
      p_vip_list_id: listId,
      p_payload: payload,
    }),
  );
}

export async function updateVipEntry(
  scope: PartnerScope,
  entryId: string,
  payload: VipEntryPayload,
): Promise<OfficialVipEntry> {
  requireOrganization(scope);
  return unwrap<OfficialVipEntry>(
    await officialClient().rpc("partner_update_vip_entry", {
      p_entry_id: entryId,
      p_payload: payload,
    }),
  );
}

async function setVipEntryStatus(
  scope: PartnerScope,
  entryId: string,
  status: "approved" | "checked_in" | "cancelled" | "no_show",
): Promise<OfficialVipEntry> {
  requireOrganization(scope);
  return unwrap<OfficialVipEntry>(
    await officialClient().rpc("partner_set_vip_entry_status", {
      p_entry_id: entryId,
      p_status: status,
    }),
  );
}

export const approveVipEntry = (s: PartnerScope, id: string) =>
  setVipEntryStatus(s, id, "approved");
export const checkInVipEntry = (s: PartnerScope, id: string) =>
  setVipEntryStatus(s, id, "checked_in");
export const cancelVipEntry = (s: PartnerScope, id: string) =>
  setVipEntryStatus(s, id, "cancelled");
export const noShowVipEntry = (s: PartnerScope, id: string) =>
  setVipEntryStatus(s, id, "no_show");

// ------------------------------------------------------- superfície pública

/** Consulta pública de lista por slug (sem PII, sem listagem de convidados). */
export async function getPublicVipListBySlug(
  slug: string,
): Promise<Record<string, unknown> | null> {
  if (!slug?.trim()) throw new Error("Slug inválido.");
  const data = unwrap<Record<string, unknown> | null>(
    await officialClient().rpc("public_get_vip_list_by_slug", { p_slug: slug.trim() }),
  );
  return data ?? null;
}

/** Inscrição pública numa lista VIP aberta. Rate limiting fica no backend. */
export async function submitPublicVipEntry(
  slug: string,
  payload: {
    name: string;
    phone: string;
    email?: string | null;
    people_count?: number;
    promoter_slug?: string | null;
    marketing_consent?: boolean;
    whatsapp_consent?: boolean;
    email_consent?: boolean;
  },
): Promise<{ public_token: string; status: VipEntryStatus }> {
  if (!slug?.trim()) throw new Error("Slug inválido.");
  if (!payload.name?.trim()) throw new Error("Nome é obrigatório.");
  if (!payload.phone?.trim()) throw new Error("Telefone é obrigatório.");
  return unwrap<{ public_token: string; status: VipEntryStatus }>(
    await officialClient().rpc("public_submit_vip_entry", {
      p_slug: slug.trim(),
      p_payload: payload,
    }),
  );
}

/** Comprovante público do convidado por token forte. */
export async function getPublicVipEntryByToken(
  token: string,
): Promise<Record<string, unknown> | null> {
  if (!token || token.length < 16) throw new Error("Token inválido.");
  const data = unwrap<Record<string, unknown> | null>(
    await officialClient().rpc("public_get_vip_entry_by_token", { p_token: token }),
  );
  return data ?? null;
}
