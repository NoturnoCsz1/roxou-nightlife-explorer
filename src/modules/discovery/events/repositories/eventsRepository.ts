/**
 * Repository — Discovery / Events (leituras públicas).
 *
 * Concentra as chamadas Supabase usadas hoje pelas páginas públicas de
 * eventos (EventDetail, LocalDetail, LocalEventos). Cada função preserva
 * 1:1 o select, filtros e ordenação atualmente presentes na página que
 * a consome — nenhuma alteração de comportamento.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type PublicEventRow = Tables<"events">;

/** Evento publicado pelo slug (mesmo shape do EventDetail atual). */
export async function fetchPublishedEventBySlug(
  slug: string,
): Promise<PublicEventRow | null> {
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  return data ?? null;
}

/** Similares por categoria — usado pelo EventDetail. */
export async function fetchSimilarByCategory(
  currentEventId: string,
  category: string,
  limit = 4,
): Promise<PublicEventRow[]> {
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .eq("category", category)
    .neq("id", currentEventId)
    .gte("date_time", new Date().toISOString())
    .order("date_time", { ascending: true })
    .limit(limit);
  return data ?? [];
}

/** Similares pelo mesmo dia civil — usado pelo EventDetail. */
export async function fetchSimilarByDate(
  currentEventId: string,
  dateKey: string,
  limit = 4,
): Promise<PublicEventRow[]> {
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .neq("id", currentEventId)
    .gte("date_time", `${dateKey}T00:00:00`)
    .lte("date_time", `${dateKey}T23:59:59`)
    .order("date_time", { ascending: true })
    .limit(limit);
  return data ?? [];
}

/** Colunas usadas pelos cards das páginas de local. */
const LOCAL_EVENT_COLUMNS =
  "id, title, slug, description, date_time, category, sub_category, venue_name, address, instagram, image_url, featured, status, partner_id";

/** Próximos eventos do parceiro — usado por LocalDetail. */
export async function fetchUpcomingEventsByPartner(
  partnerId: string,
  limit = 6,
): Promise<PublicEventRow[]> {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("events")
    .select(LOCAL_EVENT_COLUMNS)
    .eq("status", "published")
    .eq("partner_id", partnerId)
    .gte("date_time", now)
    .order("date_time", { ascending: true })
    .limit(limit);
  return (data as PublicEventRow[] | null) ?? [];
}

/** Eventos passados do parceiro — usado por LocalDetail (limit) e LocalEventos (range). */
export async function fetchPastEventsByPartner(
  partnerId: string,
  opts: { limit?: number; range?: [number, number] } = {},
): Promise<PublicEventRow[]> {
  const now = new Date().toISOString();
  let q = supabase
    .from("events")
    .select(LOCAL_EVENT_COLUMNS)
    .eq("status", "published")
    .eq("partner_id", partnerId)
    .lt("date_time", now)
    .order("date_time", { ascending: false });
  if (opts.range) q = q.range(opts.range[0], opts.range[1]);
  else if (opts.limit) q = q.limit(opts.limit);
  const { data } = await q;
  return (data as PublicEventRow[] | null) ?? [];
}

/** Contagem de eventos passados do parceiro — usado por LocalDetail e LocalEventos. */
export async function countPastEventsByPartner(
  partnerId: string,
): Promise<number> {
  const now = new Date().toISOString();
  const { count } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("status", "published")
    .eq("partner_id", partnerId)
    .lt("date_time", now);
  return count ?? 0;
}
