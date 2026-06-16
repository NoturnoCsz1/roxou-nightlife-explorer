/**
 * Partner Analytics Service — FIX real metrics
 *
 * Lê dados reais das tabelas operacionais do parceiro e calcula:
 * - KPIs principais (views, clicks, favorites, signups, check-ins, leads, ...)
 * - Lista VIP (ativas/fechadas/encerradas, presença)
 * - Leads / CRM (consentimento LGPD)
 * - Ranking de promoters
 *
 * Não cria nem altera tabelas. Não toca em RLS.
 */
import { supabase } from "@/integrations/supabase/client";

export type AnalyticsPeriod = "7d" | "30d" | "all";

export interface AnalyticsKpis {
  views: number;
  clicks: number;
  favorites: number;
  vipLists: number;
  vipSignups: number;
  checkins: number;
  noShows: number;
  attendanceRate: number; // 0..100
  leads: number;
  leadsConsent: number;
  promotersActive: number;
  reservations: number;
  eventsLinked: number;
}

export interface VipListBreakdown {
  active: number;
  closed: number;
  ended: number;
  signups: number;
  checkins: number;
  attendanceRate: number;
}

export interface LeadsBreakdown {
  total: number;
  whatsapp: number;
  email: number;
  noConsent: number;
  newInPeriod: number;
}

export interface PromoterRankRow {
  promoterId: string | null;
  name: string;
  signups: number;
  checkins: number;
  noShows: number;
  conversion: number; // 0..100
}

export interface PartnerAnalytics {
  period: AnalyticsPeriod;
  kpis: AnalyticsKpis;
  vip: VipListBreakdown;
  leads: LeadsBreakdown;
  promoters: PromoterRankRow[];
  hasAnyData: boolean;
}

function sinceIso(period: AnalyticsPeriod): string | null {
  if (period === "all") return null;
  const days = period === "7d" ? 7 : 30;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function sinceDate(period: AnalyticsPeriod): string | null {
  const iso = sinceIso(period);
  return iso ? iso.slice(0, 10) : null;
}

async function fetchAggregatedMetrics(
  partnerId: string,
  period: AnalyticsPeriod,
): Promise<{ views: number; clicks: number; favorites: number }> {
  let q = supabase
    .from("partner_metrics_daily")
    .select("views, clicks, favorites")
    .eq("partner_id", partnerId);
  const since = sinceDate(period);
  if (since) q = q.gte("date", since);
  const { data, error } = await q;
  if (error) return { views: 0, clicks: 0, favorites: 0 };
  const rows = data ?? [];
  return {
    views: rows.reduce((a, r) => a + (Number(r.views) || 0), 0),
    clicks: rows.reduce((a, r) => a + (Number(r.clicks) || 0), 0),
    favorites: rows.reduce((a, r) => a + (Number(r.favorites) || 0), 0),
  };
}

async function fetchPageViewsFallback(
  partnerId: string,
  period: AnalyticsPeriod,
): Promise<number> {
  let q = supabase
    .from("page_views")
    .select("id", { count: "exact", head: true })
    .eq("partner_id", partnerId);
  const since = sinceIso(period);
  if (since) q = q.gte("created_at", since);
  const { count } = await q;
  return count ?? 0;
}

export async function getPartnerAnalytics(
  partnerId: string,
  period: AnalyticsPeriod = "7d",
): Promise<PartnerAnalytics> {
  const empty: PartnerAnalytics = {
    period,
    kpis: {
      views: 0,
      clicks: 0,
      favorites: 0,
      vipLists: 0,
      vipSignups: 0,
      checkins: 0,
      noShows: 0,
      attendanceRate: 0,
      leads: 0,
      leadsConsent: 0,
      promotersActive: 0,
      reservations: 0,
      eventsLinked: 0,
    },
    vip: {
      active: 0,
      closed: 0,
      ended: 0,
      signups: 0,
      checkins: 0,
      attendanceRate: 0,
    },
    leads: {
      total: 0,
      whatsapp: 0,
      email: 0,
      noConsent: 0,
      newInPeriod: 0,
    },
    promoters: [],
    hasAnyData: false,
  };
  if (!partnerId) return empty;

  const sinceTs = sinceIso(period);

  // VIP entries (full set) — sem limites para conseguir agrupar e contar.
  let entriesQ = supabase
    .from("partner_vip_list_entries")
    .select(
      "id, status, created_at, checked_in_at, promoter_id, promoter_name_snapshot",
    )
    .eq("partner_id", partnerId)
    .limit(5000);
  if (sinceTs) entriesQ = entriesQ.gte("created_at", sinceTs);

  // Listas VIP (todas, para breakdown)
  const listsQ = supabase
    .from("partner_vip_lists")
    .select("id, status, event_id")
    .eq("partner_id", partnerId)
    .limit(1000);

  // Leads
  let leadsQ = supabase
    .from("partner_leads")
    .select(
      "id, whatsapp_consent, email_consent, marketing_consent, first_seen_at",
      { count: "exact" },
    )
    .eq("partner_id", partnerId)
    .limit(5000);
  if (sinceTs) leadsQ = leadsQ.gte("first_seen_at", sinceTs);

  // Promoters ativos
  const promotersQ = supabase
    .from("partner_promoters")
    .select("id, name, is_active")
    .eq("partner_id", partnerId)
    .eq("is_active", true)
    .limit(1000);

  // Reservas
  let reservationsQ = supabase
    .from("partner_reservations")
    .select("id, event_id", { count: "exact", head: false })
    .eq("partner_id", partnerId)
    .limit(5000);
  if (sinceTs) reservationsQ = reservationsQ.gte("created_at", sinceTs);

  // Leads totais (para mostrar total geral também — sem filtro de período)
  const leadsTotalQ = supabase
    .from("partner_leads")
    .select("id, whatsapp_consent, email_consent, marketing_consent", {
      count: "exact",
    })
    .eq("partner_id", partnerId)
    .limit(5000);

  const [
    agg,
    entriesRes,
    listsRes,
    leadsRes,
    leadsTotalRes,
    promotersRes,
    reservationsRes,
  ] = await Promise.all([
    fetchAggregatedMetrics(partnerId, period),
    entriesQ,
    listsQ,
    leadsQ,
    leadsTotalQ,
    promotersQ,
    reservationsQ,
  ]);

  const entries = (entriesRes.data ?? []) as Array<{
    id: string;
    status: string;
    created_at: string;
    checked_in_at: string | null;
    promoter_id: string | null;
    promoter_name_snapshot: string | null;
  }>;
  const lists = (listsRes.data ?? []) as Array<{
    id: string;
    status: string;
    event_id: string | null;
  }>;
  const leadsRows = (leadsRes.data ?? []) as Array<{
    id: string;
    whatsapp_consent: boolean;
    email_consent: boolean;
    marketing_consent: boolean;
    first_seen_at: string;
  }>;
  const leadsTotalRows = (leadsTotalRes.data ?? []) as Array<{
    whatsapp_consent: boolean;
    email_consent: boolean;
    marketing_consent: boolean;
  }>;
  const promoters = (promotersRes.data ?? []) as Array<{
    id: string;
    name: string;
  }>;
  const reservationsCount = reservationsRes.count ?? 0;
  const eventsLinked = new Set(
    [
      ...lists.map((l) => l.event_id),
      ...((reservationsRes.data ?? []) as Array<{ event_id: string | null }>)
        .map((r) => r.event_id),
    ].filter(Boolean) as string[],
  ).size;

  // Fallback de views
  let views = agg.views;
  if (views === 0) {
    views = await fetchPageViewsFallback(partnerId, period);
  }

  const signups = entries.filter((e) => e.status !== "cancelled").length;
  const checkins = entries.filter((e) => e.status === "checked_in").length;
  const noShows = entries.filter((e) => e.status === "no_show").length;
  const attendanceBase = checkins + noShows;
  const attendanceRate =
    attendanceBase > 0 ? Math.round((checkins / attendanceBase) * 100) : 0;

  const vipActive = lists.filter((l) =>
    ["open", "draft"].includes(l.status),
  ).length;
  const vipClosed = lists.filter((l) => l.status === "closed").length;
  const vipEnded = lists.filter((l) =>
    ["ended", "archived"].includes(l.status),
  ).length;

  // Promoter ranking
  const map = new Map<string, PromoterRankRow>();
  for (const p of promoters) {
    map.set(p.id, {
      promoterId: p.id,
      name: p.name,
      signups: 0,
      checkins: 0,
      noShows: 0,
      conversion: 0,
    });
  }
  for (const e of entries) {
    if (e.status === "cancelled") continue;
    const key = e.promoter_id ?? "__none__";
    if (!map.has(key)) {
      map.set(key, {
        promoterId: e.promoter_id,
        name: e.promoter_name_snapshot ?? "Sem promoter",
        signups: 0,
        checkins: 0,
        noShows: 0,
        conversion: 0,
      });
    }
    const row = map.get(key)!;
    row.signups += 1;
    if (e.status === "checked_in") row.checkins += 1;
    if (e.status === "no_show") row.noShows += 1;
  }
  const promoterRanking = Array.from(map.values())
    .map((r) => ({
      ...r,
      conversion: r.signups > 0 ? Math.round((r.checkins / r.signups) * 100) : 0,
    }))
    .filter((r) => r.signups > 0 || r.promoterId)
    .sort((a, b) => b.signups - a.signups);

  const leadsTotal = leadsTotalRes.count ?? leadsTotalRows.length;
  const leadsConsent = leadsTotalRows.filter(
    (l) => l.whatsapp_consent || l.email_consent || l.marketing_consent,
  ).length;
  const leadsNoConsent = Math.max(leadsTotal - leadsConsent, 0);
  const leadsWhatsapp = leadsTotalRows.filter((l) => l.whatsapp_consent).length;
  const leadsEmail = leadsTotalRows.filter((l) => l.email_consent).length;
  const newInPeriod = leadsRes.count ?? leadsRows.length;

  const kpis: AnalyticsKpis = {
    views,
    clicks: agg.clicks,
    favorites: agg.favorites,
    vipLists: lists.length,
    vipSignups: signups,
    checkins,
    noShows,
    attendanceRate,
    leads: leadsTotal,
    leadsConsent,
    promotersActive: promoters.length,
    reservations: reservationsCount,
    eventsLinked,
  };

  const hasAnyData =
    kpis.views > 0 ||
    kpis.clicks > 0 ||
    kpis.favorites > 0 ||
    kpis.vipLists > 0 ||
    kpis.vipSignups > 0 ||
    kpis.leads > 0 ||
    kpis.reservations > 0 ||
    kpis.promotersActive > 0;

  return {
    period,
    kpis,
    vip: {
      active: vipActive,
      closed: vipClosed,
      ended: vipEnded,
      signups,
      checkins,
      attendanceRate,
    },
    leads: {
      total: leadsTotal,
      whatsapp: leadsWhatsapp,
      email: leadsEmail,
      noConsent: leadsNoConsent,
      newInPeriod,
    },
    promoters: promoterRanking,
    hasAnyData,
  };
}
