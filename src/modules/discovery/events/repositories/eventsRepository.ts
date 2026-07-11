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

// ────────────────────────────────────────────────────────────────────
// Onda 8 — superfícies públicas de maior tráfego
// (Index, Hoje, Semana, PertoDeMim, GlobalSearchOverlay).
// Cada função preserva 1:1 o select/filtros/ordenação/limite atual.
// ────────────────────────────────────────────────────────────────────

/** Colunas usadas pelos cards da Home / Hoje / Semana. */
const HOME_EVENT_COLUMNS =
  "id, title, slug, description, date_time, category, sub_category, venue_name, address, instagram, image_url, featured, status, partner_id";

/** Home (Index): todos os próximos eventos publicados, `gt(now)`. */
export async function fetchUpcomingPublishedEventsForHome(): Promise<PublicEventRow[]> {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("events")
    .select(HOME_EVENT_COLUMNS)
    .eq("status", "published")
    .gt("date_time", now)
    .order("date_time", { ascending: true });
  return (data as PublicEventRow[] | null) ?? [];
}

/** Hoje: eventos publicados no intervalo `[startOfDay, endOfDay)` (SP). */
export async function fetchTodayPublishedEvents(
  startOfDay: string,
  endOfDay: string,
): Promise<PublicEventRow[]> {
  const { data } = await supabase
    .from("events")
    .select(HOME_EVENT_COLUMNS)
    .eq("status", "published")
    .gte("date_time", startOfDay)
    .lt("date_time", endOfDay)
    .order("date_time", { ascending: true });
  return (data as PublicEventRow[] | null) ?? [];
}

/** Semana: eventos publicados nos próximos ~7 dias. */
export async function fetchWeekPublishedEvents(): Promise<PublicEventRow[]> {
  const now = new Date().toISOString();
  const weekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("events")
    .select(HOME_EVENT_COLUMNS)
    .eq("status", "published")
    .gte("date_time", now)
    .lte("date_time", weekLater)
    .order("date_time", { ascending: true });
  return (data as PublicEventRow[] | null) ?? [];
}

/** Colunas usadas pelo mapa/lista "Perto de Mim". */
const NEARBY_EVENT_COLUMNS =
  "id,title,slug,venue_name,date_time,latitude,longitude,partner_id,status,transport_reservation_enabled,category,sub_category,image_url,is_sports_transmission";

/** PertoDeMim: próximos eventos com geolocalização, limitados. */
export async function fetchUpcomingEventsForNearby(
  limit = 200,
): Promise<PublicEventRow[]> {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("events")
    .select(NEARBY_EVENT_COLUMNS)
    .eq("status", "published")
    .gt("date_time", now)
    .order("date_time", { ascending: true })
    .limit(limit);
  return (data as PublicEventRow[] | null) ?? [];
}

/** Colunas usadas pela busca global. */
const SEARCH_EVENT_COLUMNS =
  "id,slug,title,image_url,venue_name,category,sub_category,description,date_time";

/** GlobalSearchOverlay: próximos eventos para índice de busca. */
export async function searchPublicEvents(limit = 500): Promise<PublicEventRow[]> {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("events")
    .select(SEARCH_EVENT_COLUMNS)
    .eq("status", "published")
    .gte("date_time", now)
    .order("date_time", { ascending: true })
    .limit(limit);
  return (data as PublicEventRow[] | null) ?? [];
}

