/**
 * Repository — Discovery / Recommendations.
 *
 * Reutiliza os repositórios de eventos e locais das Ondas 6-8.
 * Aplica apenas os filtros que hoje pertencem ao banco (cidade,
 * ativo/publicado). Filtros que não têm coluna equivalente (features,
 * priceRange, openNow) são deixados para o service pós-processar ou
 * ignorar, sem tocar em schema/RLS.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { getStartOfTodaySP } from "@/lib/dateUtils";
import type { DiscoveryQuery } from "../../shared/types/discoveryQuery";

export type DiscoveryVenueRow = Tables<"partners">;
export type DiscoveryEventRow = Tables<"events">;

/** Locais públicos filtrados por city/type (quando disponíveis). */
export async function fetchDiscoveryVenues(
  query: DiscoveryQuery,
  hardLimit = 200,
): Promise<DiscoveryVenueRow[]> {
  let q = supabase
    .from("partners")
    .select("*")
    .eq("active", true)
    .eq("status", "ativo");

  if (query.city) q = q.eq("city", query.city);
  // `cuisine` mapeia para `type` quando corresponder a tipo comercial.
  if (query.cuisine) q = q.eq("type", query.cuisine);

  q = q.limit(hardLimit);
  const { data } = await q;
  return (data as DiscoveryVenueRow[] | null) ?? [];
}

/** Eventos publicados a partir de hoje, opcionalmente por cidade. */
export async function fetchDiscoveryUpcomingEvents(
  query: DiscoveryQuery,
  hardLimit = 100,
): Promise<DiscoveryEventRow[]> {
  const startISO = getStartOfTodaySP();
  let q = supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .gte("date_time", startISO)
    .order("date_time", { ascending: true })
    .limit(hardLimit);

  if (query.city) q = q.eq("city", query.city);
  if (query.category) q = q.eq("category", query.category);

  const { data } = await q;
  return (data as DiscoveryEventRow[] | null) ?? [];
}

/** Ids de parceiros com pelo menos um evento publicado futuro. */
export async function fetchPartnerIdsWithUpcomingEvents(
  city?: string,
): Promise<Set<string>> {
  const startISO = getStartOfTodaySP();
  let q = supabase
    .from("events")
    .select("partner_id")
    .eq("status", "published")
    .gte("date_time", startISO)
    .not("partner_id", "is", null)
    .limit(1000);
  if (city) q = q.eq("city", city);
  const { data } = await q;
  const ids = new Set<string>();
  for (const row of (data as Array<{ partner_id: string | null }> | null) ?? []) {
    if (row.partner_id) ids.add(row.partner_id);
  }
  return ids;
}
