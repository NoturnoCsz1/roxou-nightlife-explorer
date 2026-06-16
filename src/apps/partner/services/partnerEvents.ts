/**
 * Partner Events Service — Fase 9G
 *
 * Fonte única: tabela `events`. NÃO cria `partner_events`.
 * Mutations passam por RPCs `SECURITY DEFINER` com whitelist server-side.
 *
 * SELECT é coberto pela policy "Partner staff read own partner events"
 * (qualquer membro ativo do parceiro pode ler eventos do próprio parceiro).
 */
import { supabase } from "@/integrations/supabase/client";

export type PartnerEventStatus =
  | "draft"
  | "pending"
  | "published"
  | "archived"
  | "rejected";

export interface PartnerEventRow {
  id: string;
  partner_id: string | null;
  title: string;
  slug: string;
  status: string;
  date_time: string;
  category: string;
  sub_category: string | null;
  venue_name: string | null;
  image_url: string | null;
  description: string | null;
  short_summary: string | null;
  instagram_caption: string | null;
  ticket_url: string | null;
  opportunity_tags: string[];
  submitted_by_partner?: boolean | null;
  city: string;
  created_at: string;
}

/** Payload aceito pelos RPCs. Chaves fora desta lista são ignoradas no SQL. */
export interface PartnerEventPayload {
  title?: string;
  description?: string | null;
  short_summary?: string | null;
  image_url?: string | null;
  date_time?: string;
  venue_name?: string | null;
  category?: string;
  sub_category?: string | null;
  instagram_caption?: string | null;
  ticket_url?: string | null;
  opportunity_tags?: string[];
}

const SELECT_COLS =
  "id, partner_id, title, slug, status, date_time, category, sub_category, venue_name, image_url, description, short_summary, instagram_caption, ticket_url, opportunity_tags, submitted_by_partner, city, created_at";

function sanitize(payload: PartnerEventPayload): PartnerEventPayload {
  const out: PartnerEventPayload = {};
  const keys = [
    "title",
    "description",
    "short_summary",
    "image_url",
    "date_time",
    "venue_name",
    "category",
    "sub_category",
    "instagram_caption",
    "ticket_url",
    "opportunity_tags",
  ] as const;
  for (const k of keys) {
    if (!(k in payload)) continue;
    const v = (payload as Record<string, unknown>)[k];
    if (v === undefined) continue;
    if (k === "opportunity_tags") {
      if (Array.isArray(v)) {
        out.opportunity_tags = v
          .map((t) => String(t).trim())
          .filter(Boolean);
      }
      continue;
    }
    if (typeof v === "string") {
      const trimmed = v.trim();
      (out as Record<string, unknown>)[k] = trimmed.length ? trimmed : null;
    } else if (v === null) {
      (out as Record<string, unknown>)[k] = null;
    }
  }
  return out;
}

export interface ListPartnerEventsOptions {
  status?: PartnerEventStatus | "all";
  search?: string;
  limit?: number;
}

export async function listMyEvents(
  partnerId: string,
  opts: ListPartnerEventsOptions = {},
): Promise<PartnerEventRow[]> {
  if (!partnerId) return [];
  let q = supabase
    .from("events")
    .select(SELECT_COLS)
    .eq("partner_id", partnerId)
    .order("date_time", { ascending: false })
    .limit(opts.limit ?? 200);

  if (opts.status && opts.status !== "all") {
    q = q.eq("status", opts.status);
  }
  if (opts.search?.trim()) {
    q = q.ilike("title", `%${opts.search.trim()}%`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as PartnerEventRow[];
}

export async function getMyEvent(
  eventId: string,
  partnerId: string,
): Promise<PartnerEventRow | null> {
  if (!eventId || !partnerId) return null;
  const { data, error } = await supabase
    .from("events")
    .select(SELECT_COLS)
    .eq("id", eventId)
    .eq("partner_id", partnerId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as PartnerEventRow) ?? null;
}

export async function createPartnerEvent(
  partnerId: string,
  payload: PartnerEventPayload,
): Promise<PartnerEventRow> {
  if (!partnerId) throw new Error("partnerId obrigatório.");
  const clean = sanitize(payload);
  if (!clean.title) throw new Error("Título é obrigatório.");
  if (!clean.date_time) throw new Error("Data/hora é obrigatória.");

  const { data, error } = await supabase.rpc("create_partner_event", {
    _partner_id: partnerId,
    _payload: clean as unknown as never,
  });
  if (error) throw error;
  if (!data) throw new Error("Não foi possível criar o evento.");
  return data as unknown as PartnerEventRow;
}

export async function updatePartnerEvent(
  eventId: string,
  partnerId: string,
  payload: PartnerEventPayload,
): Promise<PartnerEventRow> {
  if (!eventId) throw new Error("eventId obrigatório.");
  // partnerId é validado server-side via lookup; mantido na assinatura
  // por simetria com listMyEvents/getMyEvent.
  void partnerId;
  const clean = sanitize(payload);
  if (Object.keys(clean).length === 0) {
    throw new Error("Nada para atualizar.");
  }
  const { data, error } = await supabase.rpc("update_partner_event", {
    _event_id: eventId,
    _payload: clean as unknown as never,
  });
  if (error) throw error;
  if (!data) throw new Error("Sem permissão ou evento não encontrado.");
  return data as unknown as PartnerEventRow;
}

export async function duplicatePartnerEvent(
  eventId: string,
): Promise<PartnerEventRow> {
  if (!eventId) throw new Error("eventId obrigatório.");
  const { data, error } = await supabase.rpc("duplicate_partner_event", {
    _event_id: eventId,
  });
  if (error) throw error;
  if (!data) throw new Error("Não foi possível duplicar.");
  return data as unknown as PartnerEventRow;
}

export async function archivePartnerEvent(
  eventId: string,
): Promise<PartnerEventRow> {
  if (!eventId) throw new Error("eventId obrigatório.");
  const { data, error } = await supabase.rpc("archive_partner_event", {
    _event_id: eventId,
  });
  if (error) throw error;
  if (!data) throw new Error("Não foi possível arquivar.");
  return data as unknown as PartnerEventRow;
}
