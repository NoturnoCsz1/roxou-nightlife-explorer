/**
 * Promoter Central Service — Fase GAP B/C
 *
 * Agrega dados para a Central do Promoter SEM criar tabelas nem RPCs.
 * Reutiliza: partner_promoters, partner_vip_list_entries, partner_vip_lists, events.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  getStartOfTodaySP,
  getDateKeySP,
} from "@/lib/dateUtils";

export interface PromoterRankingRow {
  promoter_id: string | null;
  promoter_name: string;
  total_entries: number;
  checked_in: number;
  approved: number;
  pending: number;
  conversion_rate: number;
  commission_brl: number;
}

export interface ActivityRow {
  kind: "vip_entry" | "vip_checkin";
  at: string;
  title: string;
  subtitle: string;
}

export interface CampaignSummary {
  event_id: string | null;
  vip_list_id: string;
  list_title: string;
  event_title: string | null;
  event_slug: string | null;
  list_public_slug: string;
  starts_at: string | null;
  total_entries: number;
  checked_in: number;
  goal: number;
}

type EntryRow = {
  id: string;
  vip_list_id: string;
  event_id: string | null;
  promoter_id: string | null;
  promoter_name_snapshot: string | null;
  status: string;
  people_count: number | null;
  created_at: string;
  checked_in_at: string | null;
  name: string | null;
};

async function loadEntries(partnerId: string, sinceIso?: string): Promise<EntryRow[]> {
  let q = supabase
    .from("partner_vip_list_entries")
    .select(
      "id, vip_list_id, event_id, promoter_id, promoter_name_snapshot, status, people_count, created_at, checked_in_at, name",
    )
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (sinceIso) q = q.gte("created_at", sinceIso);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as EntryRow[];
}

/** Ranking de promoters no mês corrente (SP). */
export async function getPromoterRanking(
  partnerId: string,
  commissionPerEntryBRL: number,
): Promise<PromoterRankingRow[]> {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const entries = await loadEntries(partnerId, start.toISOString());

  const byPromoter = new Map<string, PromoterRankingRow>();
  for (const e of entries) {
    const key = e.promoter_id ?? "__none__";
    const name = e.promoter_name_snapshot ?? "Sem promoter";
    const row =
      byPromoter.get(key) ??
      ({
        promoter_id: e.promoter_id,
        promoter_name: name,
        total_entries: 0,
        checked_in: 0,
        approved: 0,
        pending: 0,
        conversion_rate: 0,
        commission_brl: 0,
      } as PromoterRankingRow);
    const people = e.people_count ?? 1;
    row.total_entries += people;
    if (e.status === "checked_in") row.checked_in += people;
    else if (e.status === "approved") row.approved += people;
    else if (e.status === "pending") row.pending += people;
    byPromoter.set(key, row);
  }

  const rows = Array.from(byPromoter.values()).map((r) => ({
    ...r,
    conversion_rate: r.total_entries
      ? Math.round((r.checked_in / r.total_entries) * 100)
      : 0,
    commission_brl: r.checked_in * commissionPerEntryBRL,
  }));
  rows.sort((a, b) => b.checked_in - a.checked_in || b.total_entries - a.total_entries);
  return rows;
}

/** Resumo do promoter logado (ou de uma seleção). Usa o mesmo cálculo. */
export async function getPromoterScorecard(
  partnerId: string,
  promoterId: string | null,
  commissionPerEntryBRL: number,
): Promise<PromoterRankingRow | null> {
  const ranking = await getPromoterRanking(partnerId, commissionPerEntryBRL);
  return (
    ranking.find((r) => (promoterId ? r.promoter_id === promoterId : !r.promoter_id)) ??
    null
  );
}

/** Campanhas = listas VIP ativas/abertas do parceiro (1 por evento). */
export async function getCampaigns(
  partnerId: string,
  perEventGoal: number,
): Promise<CampaignSummary[]> {
  const todayIso = getStartOfTodaySP().toISOString();
  const { data: lists, error } = await supabase
    .from("partner_vip_lists")
    .select(
      "id, title, status, public_slug, starts_at, event_id, max_entries",
    )
    .eq("partner_id", partnerId)
    .in("status", ["open", "draft", "closed"])
    .order("starts_at", { ascending: false, nullsFirst: false })
    .limit(50);
  if (error) throw error;
  const listRows = (lists ?? []) as Array<{
    id: string;
    title: string;
    status: string;
    public_slug: string;
    starts_at: string | null;
    event_id: string | null;
    max_entries: number | null;
  }>;
  if (!listRows.length) return [];

  const eventIds = listRows
    .map((l) => l.event_id)
    .filter((x): x is string => !!x);
  const eventsMap = new Map<string, { title: string; slug: string | null }>();
  if (eventIds.length) {
    const { data: evs } = await supabase
      .from("events")
      .select("id, title, slug")
      .in("id", eventIds);
    for (const e of evs ?? []) eventsMap.set(e.id, { title: e.title, slug: e.slug });
  }

  const listIds = listRows.map((l) => l.id);
  const { data: entries } = await supabase
    .from("partner_vip_list_entries")
    .select("vip_list_id, status, people_count")
    .in("vip_list_id", listIds);

  const counts = new Map<string, { total: number; checkedIn: number }>();
  for (const e of (entries ?? []) as Array<{
    vip_list_id: string;
    status: string;
    people_count: number | null;
  }>) {
    const c = counts.get(e.vip_list_id) ?? { total: 0, checkedIn: 0 };
    const people = e.people_count ?? 1;
    c.total += people;
    if (e.status === "checked_in") c.checkedIn += people;
    counts.set(e.vip_list_id, c);
  }

  void todayIso; // kept for future filtering hook
  return listRows.map((l) => {
    const ev = l.event_id ? eventsMap.get(l.event_id) : null;
    const c = counts.get(l.id) ?? { total: 0, checkedIn: 0 };
    return {
      vip_list_id: l.id,
      event_id: l.event_id,
      list_title: l.title,
      event_title: ev?.title ?? null,
      event_slug: ev?.slug ?? null,
      list_public_slug: l.public_slug,
      starts_at: l.starts_at,
      total_entries: c.total,
      checked_in: c.checkedIn,
      goal: l.max_entries ?? perEventGoal,
    };
  });
}

/** Feed unificado de últimas atividades (entradas e check-ins). */
export async function getRecentActivity(partnerId: string, limit = 20): Promise<ActivityRow[]> {
  const entries = await loadEntries(partnerId);
  const rows: ActivityRow[] = [];
  for (const e of entries) {
    rows.push({
      kind: "vip_entry",
      at: e.created_at,
      title: e.name ?? "Convidado",
      subtitle: `Entrou na lista${e.promoter_name_snapshot ? ` via ${e.promoter_name_snapshot}` : ""}`,
    });
    if (e.checked_in_at) {
      rows.push({
        kind: "vip_checkin",
        at: e.checked_in_at,
        title: e.name ?? "Convidado",
        subtitle: `Check-in confirmado${e.promoter_name_snapshot ? ` (${e.promoter_name_snapshot})` : ""}`,
      });
    }
  }
  rows.sort((a, b) => (a.at < b.at ? 1 : -1));
  return rows.slice(0, limit);
}

/** Série diária de check-ins nos últimos N dias para mini-chart. */
export async function getDailyCheckInsSeries(partnerId: string, days = 14) {
  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  since.setHours(0, 0, 0, 0);
  const entries = await loadEntries(partnerId, since.toISOString());
  const map = new Map<string, number>();
  for (const e of entries) {
    if (!e.checked_in_at) continue;
    const key = getDateKeySP(new Date(e.checked_in_at));
    map.set(key, (map.get(key) ?? 0) + (e.people_count ?? 1));
  }
  const out: Array<{ date: string; checkins: number }> = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = getDateKeySP(d);
    out.push({ date: key.slice(5), checkins: map.get(key) ?? 0 });
  }
  return out;
}
