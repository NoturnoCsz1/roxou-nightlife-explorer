/**
 * services/events.ts — acesso a dados da tabela `events`.
 *
 * ADITIVO na Fase 2: nenhum consumidor existente foi migrado.
 * Tipagem propositalmente fraca (`any`) nesta fase — será endurecida
 * quando `src/types/db.ts` for criado (Fase 3+).
 *
 * Schema real consultado em 15/06/2026:
 *  - coluna de data:    `date_time`
 *  - coluna de estado:  `status` (valores incluem 'published')
 */
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabaseFetchAll";
import { getStartOfTodaySP } from "@/lib/dateUtils";

export type EventRow = Record<string, any>;

/** Busca um evento publicado pelo slug. */
export async function getEventBySlug(slug: string): Promise<EventRow | null> {
  const { data, error } = await (supabase as any)
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return (data as EventRow) ?? null;
}

/** Eventos publicados a partir de hoje (SP), ordenados por data crescente. */
export async function listUpcomingPublishedEvents(opts?: {
  limit?: number;
  city?: string;
}): Promise<EventRow[]> {
  const startISO = getStartOfTodaySP(); // já é string ISO
  let q = (supabase as any)
    .from("events")
    .select("*")
    .eq("status", "published")
    .gte("date_time", startISO)
    .order("date_time", { ascending: true });
  if (opts?.city) q = q.eq("city", opts.city);
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data as EventRow[]) ?? [];
}

/** Lista TODOS os eventos (admin, bypass 1k). */
export async function listEventsAll(filter?: {
  status?: string;
  city?: string;
}): Promise<EventRow[]> {
  return fetchAllRows<EventRow>(() => {
    let q = (supabase as any)
      .from("events")
      .select("*")
      .order("date_time", { ascending: false });
    if (filter?.status) q = q.eq("status", filter.status);
    if (filter?.city) q = q.eq("city", filter.city);
    return q;
  });
}

/** Insere/atualiza um evento. `id` opcional. */
export async function upsertEvent(payload: EventRow): Promise<EventRow> {
  const { data, error } = await (supabase as any)
    .from("events")
    .upsert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data as EventRow;
}

/** Remove um evento por id. */
export async function deleteEvent(id: string): Promise<void> {
  const { error } = await (supabase as any).from("events").delete().eq("id", id);
  if (error) throw error;
}
