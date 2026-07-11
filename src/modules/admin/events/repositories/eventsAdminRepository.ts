/* eslint-disable @typescript-eslint/no-explicit-any -- preservado do original (Fase 3C1); migração Onda 13 sem mudança de forma. */
/**
 * Repository administrativo de Eventos (Onda 13).
 *
 * Encapsula EXATAMENTE as chamadas Supabase que hoje vivem inline em
 * `eventoFormSubmit.ts` e `eventoFormActions.ts`. Tabelas, colunas,
 * filtros, payloads e tratamento de erro permanecem idênticos.
 *
 * Não faz toast, não navega, não chama React, não importa páginas.
 */
import { supabase } from "@/integrations/supabase/client";

type DuplicateSelectRow = {
  id: string;
  title: string;
  slug: string;
  date_time: string;
  venue_name: string | null;
};

const DUPLICATE_SELECT = "id, title, slug, date_time, venue_name";

/** INSERT em `events`, retorna id inserido. Preserva o `.select("id").single()`. */
export async function insertEvent(payload: any): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("events")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string } | null) ?? null;
}

/** UPDATE em `events` filtrado por id. */
export async function updateEvent(id: string, payload: any): Promise<void> {
  const { error } = await supabase.from("events").update(payload).eq("id", id);
  if (error) throw error;
}

/** Soft delete = archived + featured=false + needs_review=false. */
export async function softArchiveEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from("events")
    .update({ status: "archived", featured: false, needs_review: false })
    .eq("id", id);
  if (error) throw error;
}

/** Marca `eventou_imports` como aprovado apontando para o evento salvo. */
export async function linkEventouImport(
  importId: string,
  eventId: string,
): Promise<void> {
  const { error } = await supabase
    .from("eventou_imports")
    .update({ import_status: "approved", event_id: eventId })
    .eq("id", importId);
  if (error) throw error;
}

/** Registro do post ROXOU preparado após import aprovado. */
export async function insertContentGenerationPost(row: {
  source_id: string;
  title: string;
  generated_text: string;
  image_url: string | null;
}): Promise<void> {
  const { error } = await supabase.from("content_generations").insert({
    type: "post",
    source_type: "event",
    source_id: row.source_id,
    title: row.title,
    generated_text: row.generated_text,
    image_url: row.image_url,
  });
  if (error) throw error;
}

/** Log de feedback quando categoria/sub/descrição são corrigidas em edição. */
export async function logAiEventFeedback(row: {
  venue_name: string | null;
  original_category: string;
  corrected_category: string;
  original_sub_category: string | null;
  corrected_sub_category: string | null;
  original_description: string | null;
  corrected_description: string | null;
}): Promise<void> {
  const { error } = await (supabase.from as any)("ai_event_feedback_memory").insert(row);
  if (error) throw error;
}

/** Duplicidade por `image_hash`; opcionalmente ignora `excludeId` (edição). */
export async function findDuplicateByImageHash(
  imageHash: string,
  excludeId?: string,
): Promise<DuplicateSelectRow | null> {
  const q = supabase
    .from("events")
    .select(DUPLICATE_SELECT)
    .eq("image_hash", imageHash)
    .limit(1);
  const { data } = excludeId ? await q.neq("id", excludeId) : await q;
  return (data?.[0] as DuplicateSelectRow) ?? null;
}

/** Duplicidade por título + local + dia (janela -03:00). */
export async function findDuplicateByTitleVenueDay(args: {
  title: string;
  venueName: string;
  dateTime: string;
  excludeId?: string;
}): Promise<DuplicateSelectRow | null> {
  const dayStart = `${args.dateTime.slice(0, 10)}T00:00:00-03:00`;
  const dayEnd = `${args.dateTime.slice(0, 10)}T23:59:59-03:00`;
  const q = supabase
    .from("events")
    .select(DUPLICATE_SELECT)
    .ilike("title", args.title.trim())
    .ilike("venue_name", args.venueName.trim())
    .gte("date_time", dayStart)
    .lte("date_time", dayEnd)
    .limit(1);
  const { data } = args.excludeId ? await q.neq("id", args.excludeId) : await q;
  return (data?.[0] as DuplicateSelectRow) ?? null;
}

export type { DuplicateSelectRow };
