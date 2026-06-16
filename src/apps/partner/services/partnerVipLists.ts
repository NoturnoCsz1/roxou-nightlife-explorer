/**
 * Partner VIP Lists Service — Fase 9I
 *
 * Tabelas:
 *   - partner_vip_lists
 *   - partner_vip_list_entries
 *
 * Todas as mutations passam por RPCs SECURITY DEFINER:
 *   - create_partner_vip_list / update_partner_vip_list
 *   - open_partner_vip_list / close_partner_vip_list / archive_partner_vip_list
 *   - add_partner_vip_entry / update_partner_vip_entry
 *   - check_in_partner_vip_entry / cancel_partner_vip_entry
 *
 * SELECT: cobertos pelas policies "Partner staff read own vip ..."
 * (qualquer membro ativo do parceiro pode ler).
 */
import { supabase } from "@/integrations/supabase/client";

export type VipListStatus = "draft" | "open" | "closed" | "archived";
export type VipEntryStatus =
  | "pending"
  | "approved"
  | "checked_in"
  | "cancelled"
  | "no_show";

export interface PartnerVipList {
  id: string;
  partner_id: string;
  event_id: string | null;
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  max_entries: number | null;
  status: VipListStatus;
  created_at: string;
  updated_at: string;
}

export interface PartnerVipEntry {
  id: string;
  vip_list_id: string;
  partner_id: string;
  event_id: string | null;
  user_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  people_count: number;
  status: VipEntryStatus;
  checked_in_at: string | null;
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
  status?: VipListStatus;
}

export interface VipEntryPayload {
  name?: string;
  phone?: string | null;
  email?: string | null;
  people_count?: number;
  status?: VipEntryStatus;
}

const LISTS = "partner_vip_lists" as const;
const ENTRIES = "partner_vip_list_entries" as const;

// ---------- Lists ----------

export async function listVipLists(
  partnerId: string,
): Promise<PartnerVipList[]> {
  if (!partnerId) return [];
  const { data, error } = await supabase
    .from(LISTS)
    .select("*")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as PartnerVipList[];
}

export async function getVipList(
  listId: string,
): Promise<PartnerVipList | null> {
  if (!listId) return null;
  const { data, error } = await supabase
    .from(LISTS)
    .select("*")
    .eq("id", listId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as PartnerVipList) ?? null;
}

export async function createVipList(
  partnerId: string,
  payload: VipListPayload,
): Promise<PartnerVipList> {
  if (!partnerId) throw new Error("partnerId obrigatório.");
  if (!payload.title?.trim()) throw new Error("Título é obrigatório.");
  const { data, error } = await supabase.rpc("create_partner_vip_list", {
    _partner_id: partnerId,
    _payload: payload as unknown as never,
  });
  if (error) throw error;
  if (!data) throw new Error("Não foi possível criar a lista.");
  return data as unknown as PartnerVipList;
}

export async function updateVipList(
  listId: string,
  payload: VipListPayload,
): Promise<PartnerVipList> {
  const { data, error } = await supabase.rpc("update_partner_vip_list", {
    _list_id: listId,
    _payload: payload as unknown as never,
  });
  if (error) throw error;
  if (!data) throw new Error("Sem permissão ou lista não encontrada.");
  return data as unknown as PartnerVipList;
}

async function callListAction(
  fn:
    | "open_partner_vip_list"
    | "close_partner_vip_list"
    | "archive_partner_vip_list",
  listId: string,
): Promise<PartnerVipList> {
  const { data, error } = await supabase.rpc(fn, { _list_id: listId });
  if (error) throw error;
  if (!data) throw new Error("Sem permissão.");
  return data as unknown as PartnerVipList;
}

export const openVipList = (id: string) =>
  callListAction("open_partner_vip_list", id);
export const closeVipList = (id: string) =>
  callListAction("close_partner_vip_list", id);
export const archiveVipList = (id: string) =>
  callListAction("archive_partner_vip_list", id);

// ---------- Entries ----------

export async function listVipEntries(
  listId: string,
): Promise<PartnerVipEntry[]> {
  if (!listId) return [];
  const { data, error } = await supabase
    .from(ENTRIES)
    .select("*")
    .eq("vip_list_id", listId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as unknown as PartnerVipEntry[];
}

export async function addVipEntry(
  listId: string,
  payload: VipEntryPayload,
): Promise<PartnerVipEntry> {
  if (!payload.name?.trim()) throw new Error("Nome é obrigatório.");
  const { data, error } = await supabase.rpc("add_partner_vip_entry", {
    _list_id: listId,
    _payload: payload as unknown as never,
  });
  if (error) throw error;
  if (!data) throw new Error("Não foi possível adicionar a entrada.");
  return data as unknown as PartnerVipEntry;
}

export async function updateVipEntry(
  entryId: string,
  payload: VipEntryPayload,
): Promise<PartnerVipEntry> {
  const { data, error } = await supabase.rpc("update_partner_vip_entry", {
    _entry_id: entryId,
    _payload: payload as unknown as never,
  });
  if (error) throw error;
  if (!data) throw new Error("Sem permissão.");
  return data as unknown as PartnerVipEntry;
}

export async function checkInVipEntry(
  entryId: string,
): Promise<PartnerVipEntry> {
  const { data, error } = await supabase.rpc("check_in_partner_vip_entry", {
    _entry_id: entryId,
  });
  if (error) throw error;
  if (!data) throw new Error("Sem permissão.");
  return data as unknown as PartnerVipEntry;
}

export async function cancelVipEntry(
  entryId: string,
): Promise<PartnerVipEntry> {
  const { data, error } = await supabase.rpc("cancel_partner_vip_entry", {
    _entry_id: entryId,
  });
  if (error) throw error;
  if (!data) throw new Error("Sem permissão.");
  return data as unknown as PartnerVipEntry;
}

// ---------- Stats ----------

export interface VipListStatsResult {
  total: number;
  approved: number;
  checkedIn: number;
  noShow: number;
  capacityUsed: number; // %
  peopleTotal: number;
}

export function computeVipListStats(
  entries: PartnerVipEntry[],
  maxEntries: number | null,
): VipListStatsResult {
  let total = 0;
  let approved = 0;
  let checkedIn = 0;
  let noShow = 0;
  let peopleTotal = 0;

  for (const e of entries) {
    if (e.status === "cancelled") continue;
    total += 1;
    peopleTotal += e.people_count;
    if (e.status === "approved" || e.status === "checked_in") approved += 1;
    if (e.status === "checked_in") checkedIn += 1;
    if (e.status === "no_show") noShow += 1;
  }

  const capacityUsed =
    maxEntries && maxEntries > 0
      ? Math.min(100, Math.round((peopleTotal / maxEntries) * 100))
      : 0;

  return { total, approved, checkedIn, noShow, capacityUsed, peopleTotal };
}
