/**
 * services/analytics.ts — leitura de telemetria.
 * Fonte primária: `analytics_events`. `page_views` e `visitor_sessions`
 * são considerados secundários (ver Fase 0 — riscos de cobertura dupla).
 * ADITIVO.
 */
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabaseFetchAll";

export type AnalyticsEventRow = Record<string, any>;

export async function listAnalyticsEventsSince(sinceISO: string): Promise<AnalyticsEventRow[]> {
  return fetchAllRows<AnalyticsEventRow>(() =>
    supabase
      .from("analytics_events")
      .select("*")
      .gte("created_at", sinceISO)
      .order("created_at", { ascending: false }),
  );
}

export async function countAnalyticsEventsSince(sinceISO: string): Promise<number> {
  const { count, error } = await supabase
    .from("analytics_events")
    .select("id", { count: "exact", head: true })
    .gte("created_at", sinceISO);
  if (error) throw error;
  return count ?? 0;
}

export async function countPageViewsSince(sinceISO: string): Promise<number> {
  const { count, error } = await supabase
    .from("page_views")
    .select("id", { count: "exact", head: true })
    .gte("created_at", sinceISO);
  if (error) throw error;
  return count ?? 0;
}
