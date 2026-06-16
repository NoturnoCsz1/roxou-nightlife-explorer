/**
 * Partner VIP Lists Service — Fase 9I / 9L / 10E
 *
 * Tabelas:
 *   - partner_vip_lists
 *   - partner_vip_list_entries
 *
 * Mutations principais via RPCs SECURITY DEFINER:
 *   - create_partner_vip_list / update_partner_vip_list
 *   - open_partner_vip_list / close_partner_vip_list / archive_partner_vip_list
 *   - add_partner_vip_entry / update_partner_vip_entry
 *   - check_in_partner_vip_entry / cancel_partner_vip_entry / no_show_partner_vip_entry
 *   - set_partner_vip_list_public_enabled (Fase 10E)
 *   - get_vip_entry_by_token (Fase 10E)
 */
import { supabase } from "@/integrations/supabase/client";
import { getEndOfDaySPFromDate } from "@/lib/dateUtils";

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
  public_slug: string;
  public_enabled: boolean;
  public_title: string | null;
  public_description: string | null;
  public_cover_url: string | null;
  public_rules: string | null;
  max_entries_per_person: number;
  requires_approval: boolean;
  closes_at: string | null;
  auto_close_enabled: boolean;
  close_reason: string | null;
  allow_multiple_people_per_entry: boolean;
  created_at: string;
  updated_at: string;
}

/** Estado operacional derivado: visualização para portaria/parceiro. */
export type VipListOperationalState =
  | "open"
  | "sold_out"
  | "closed"
  | "ended"
  | "archived";

/**
 * Calcula o estado operacional client-side, refletindo `compute_partner_vip_list_state`
 * do banco. Não dispara fetch — recebe a data do evento já resolvida.
 *
 * Regras (timezone America/Sao_Paulo):
 *  - Lista nova NUNCA nasce como encerrada.
 *  - Só vira "ended" se o horário final for menor que o agora em SP.
 *  - Horário final = `ends_at` se houver; senão, fim do dia (SP) do evento/starts_at.
 *  - Se não há nenhuma referência temporal, a lista NÃO é encerrada por tempo.
 */
export function deriveVipListState(
  list: Pick<
    PartnerVipList,
    "status" | "closes_at" | "max_entries" | "starts_at" | "ends_at"
  > & { starts_at?: string | null; ends_at?: string | null },
  usedEntries: number,
  eventDate: string | null,
): VipListOperationalState {
  if (list.status === "archived") return "archived";
  const now = Date.now();

  // 1) Fechamento manual / por closes_at
  if (list.status === "closed") return "closed";
  if (list.closes_at && new Date(list.closes_at).getTime() < now)
    return "closed";

  // 2) Encerramento por tempo (apenas se houver referência temporal válida)
  const dayRef = eventDate ?? list.starts_at ?? null;
  let deadline: number | null = null;
  if (list.ends_at) {
    const t = new Date(list.ends_at).getTime();
    if (!Number.isNaN(t)) deadline = t;
  } else if (dayRef) {
    const eod = getEndOfDaySPFromDate(dayRef);
    const t = eod ? new Date(eod).getTime() : NaN;
    if (!Number.isNaN(t)) deadline = t;
  }
  if (deadline !== null && deadline < now) return "ended";

  // 3) Lotação
  if (list.max_entries != null && usedEntries >= list.max_entries)
    return "sold_out";

  return "open";
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
  promoter_id: string | null;
  promoter_name_snapshot: string | null;
  public_token: string;
  source: string;
  public_submitted_at: string | null;
  qr_code_payload: string | null;
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
  promoter_id?: string | null;
  promoter_name_snapshot?: string | null;
}

const LISTS = "partner_vip_lists" as const;
const ENTRIES = "partner_vip_list_entries" as const;

// ---------- Lists ----------

export async function listVipLists(partnerId: string): Promise<PartnerVipList[]> {
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

export async function getVipList(listId: string): Promise<PartnerVipList | null> {
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

export const openVipList = (id: string) => callListAction("open_partner_vip_list", id);
export const closeVipList = (id: string) => callListAction("close_partner_vip_list", id);
export const archiveVipList = (id: string) => callListAction("archive_partner_vip_list", id);

export async function setVipListPublicEnabled(
  listId: string,
  enabled: boolean,
): Promise<PartnerVipList> {
  const { data, error } = await supabase.rpc("set_partner_vip_list_public_enabled", {
    _list_id: listId,
    _enabled: enabled,
  });
  if (error) throw error;
  if (!data) throw new Error("Sem permissão.");
  return data as unknown as PartnerVipList;
}

// ---------- Entries ----------

export async function listVipEntries(listId: string): Promise<PartnerVipEntry[]> {
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

export async function checkInVipEntry(entryId: string): Promise<PartnerVipEntry> {
  const { data, error } = await supabase.rpc("check_in_partner_vip_entry", {
    _entry_id: entryId,
  });
  if (error) throw error;
  if (!data) throw new Error("Sem permissão.");
  return data as unknown as PartnerVipEntry;
}

export async function cancelVipEntry(entryId: string): Promise<PartnerVipEntry> {
  const { data, error } = await supabase.rpc("cancel_partner_vip_entry", {
    _entry_id: entryId,
  });
  if (error) throw error;
  if (!data) throw new Error("Sem permissão.");
  return data as unknown as PartnerVipEntry;
}

export async function noShowVipEntry(entryId: string): Promise<PartnerVipEntry> {
  const { data, error } = await supabase.rpc("no_show_partner_vip_entry", {
    _entry_id: entryId,
  });
  if (error) throw error;
  if (!data) throw new Error("Sem permissão.");
  return data as unknown as PartnerVipEntry;
}

export const markNoShowVipEntry = noShowVipEntry;

export async function getVipEntryByToken(
  publicToken: string,
): Promise<PartnerVipEntry | null> {
  const { data, error } = await supabase.rpc("get_vip_entry_by_token", {
    p_token: publicToken,
  });
  if (error) throw error;
  return (data as unknown as PartnerVipEntry) ?? null;
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

// ---------- Promoter stats helper (Fase 10E) ----------

export interface PromoterStatsResult {
  signups: number;
  people: number;
  checkedIn: number;
  noShow: number;
}

export function computePromoterStats(
  entries: PartnerVipEntry[],
  promoterId: string,
): PromoterStatsResult {
  let signups = 0;
  let people = 0;
  let checkedIn = 0;
  let noShow = 0;
  for (const e of entries) {
    if (e.promoter_id !== promoterId) continue;
    if (e.status === "cancelled") continue;
    signups += 1;
    people += e.people_count;
    if (e.status === "checked_in") checkedIn += 1;
    if (e.status === "no_show") noShow += 1;
  }
  return { signups, people, checkedIn, noShow };
}
