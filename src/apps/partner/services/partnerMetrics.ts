/**
 * Partner Metrics Service — Fase 9D
 *
 * Lê métricas agregadas a partir de:
 * - partner_metrics_daily (fonte canônica diária)
 * - page_views (fallback / detalhe por dia)
 * - analytics_events (favorites, clicks)
 *
 * Não cria nem altera tabelas. Não toca em RLS.
 */
import { supabase } from "@/integrations/supabase/client";

export interface PartnerMetricsTotals {
  views: number;
  clicks: number;
  favorites: number;
  reservations: number;
  vipSignups: number;
}

export interface PartnerMetricsRange {
  last7: PartnerMetricsTotals;
  last30: PartnerMetricsTotals;
  daily: Array<{
    date: string;
    views: number;
    clicks: number;
    favorites: number;
  }>;
}

const EMPTY: PartnerMetricsTotals = {
  views: 0,
  clicks: 0,
  favorites: 0,
  reservations: 0,
  vipSignups: 0,
};

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function sum<T>(rows: T[], key: keyof T): number {
  return rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
}

export async function getPartnerMetrics(
  partnerId: string,
): Promise<PartnerMetricsRange> {
  if (!partnerId) {
    return { last7: { ...EMPTY }, last30: { ...EMPTY }, daily: [] };
  }

  const since30 = isoDaysAgo(30);
  const since7 = isoDaysAgo(7);

  const { data, error } = await supabase
    .from("partner_metrics_daily")
    .select("date, views, clicks, favorites, reservations, vip_signups")
    .eq("partner_id", partnerId)
    .gte("date", since30)
    .order("date", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as Array<{
    date: string;
    views: number;
    clicks: number;
    favorites: number;
    reservations: number;
    vip_signups: number;
  }>;

  const last30: PartnerMetricsTotals = {
    views: sum(rows, "views"),
    clicks: sum(rows, "clicks"),
    favorites: sum(rows, "favorites"),
    reservations: sum(rows, "reservations"),
    vipSignups: sum(rows, "vip_signups"),
  };

  const rows7 = rows.filter((r) => r.date >= since7);
  const last7: PartnerMetricsTotals = {
    views: sum(rows7, "views"),
    clicks: sum(rows7, "clicks"),
    favorites: sum(rows7, "favorites"),
    reservations: sum(rows7, "reservations"),
    vipSignups: sum(rows7, "vip_signups"),
  };

  return {
    last7,
    last30,
    daily: rows.map((r) => ({
      date: r.date,
      views: r.views ?? 0,
      clicks: r.clicks ?? 0,
      favorites: r.favorites ?? 0,
    })),
  };
}

/**
 * Fallback: conta page_views diretas do partner quando partner_metrics_daily
 * estiver vazio. Não escreve nada.
 */
export async function getPartnerPageViewsTotal(
  partnerId: string,
  days = 30,
): Promise<number> {
  if (!partnerId) return 0;
  const since = isoDaysAgo(days);
  const { count, error } = await supabase
    .from("page_views")
    .select("id", { count: "exact", head: true })
    .eq("partner_id", partnerId)
    .gte("created_at", `${since}T00:00:00.000Z`);
  if (error) return 0;
  return count ?? 0;
}
