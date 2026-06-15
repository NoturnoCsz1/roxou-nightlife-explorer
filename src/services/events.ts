/**
 * services/events.ts — acesso a dados da tabela `events`.
 *
 * ADITIVO na Fase 2: nenhum consumidor existente foi migrado.
 * As assinaturas refletem padrões já usados nas páginas atuais
 * (EventosList, EventoForm, V3Home, V3Agenda).
 *
 * Regras:
 * - Timezone: usar helpers de `@/lib/dateUtils` para qualquer corte de dia SP.
 * - Paginação: `listEventsAll` usa `fetchAllRows` (bypass do limite de 1000).
 */
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabaseFetchAll";
import { getStartOfTodaySP } from "@/lib/dateUtils";

export type EventRow = Record<string, any>;

const PUBLISHED_SELECT = "*";

/** Busca um evento publicado pelo slug. */
export async function getEventBySlug(slug: string): Promise<EventRow | null> {
  const { data, error } = await supabase
    .from("events")
    .select(PUBLISHED_SELECT)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/** Eventos publicados a partir de hoje (SP), ordenados por data crescente. */
export async function listUpcomingPublishedEvents(opts?: {
  limit?: number;
  city?: string;
}): Promise<EventRow[]> {
  const startISO = getStartOfTodaySP().toISOString();
  let q = supabase
    .from("events")
    .select(PUBLISHED_SELECT)
    .eq("published", true)
    .gte("date", startISO)
    .order("date", { ascending: true });
  if (opts?.city) q = q.eq("city", opts.city);
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/** Lista TODOS os eventos (admin, bypass 1k). */
export async function listEventsAll(filter?: {
  published?: boolean;
  city?: string;
}): Promise<EventRow[]> {
  return fetchAllRows<EventRow>(() => {
    let q = supabase.from("events").select("*").order("date", { ascending: false });
    if (typeof filter?.published === "boolean") q = q.eq("published", filter.published);
    if (filter?.city) q = q.eq("city", filter.city);
    return q;
  });
}

/** Insere/atualiza um evento. `id` opcional. */
export async function upsertEvent(payload: EventRow): Promise<EventRow> {
  const { data, error } = await supabase
    .from("events")
    .upsert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Remove um evento por id. */
export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
}
