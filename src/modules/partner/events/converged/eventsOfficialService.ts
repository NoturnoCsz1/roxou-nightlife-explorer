/**
 * Eventos — camada CONVERTIDA (interface do Partner Pro sobre o módulo
 * de eventos OFICIAL da Roxou).
 *
 * Fonte de verdade: tabela `events` do Supabase oficial
 * (venue_id + organization_id). NÃO existe tabela paralela de eventos.
 *
 * Regras:
 * - Parceiro nunca publica: criação entra como `pending_review`.
 * - Edição livre apenas em `draft` / `pending_review`.
 * - Evento `published` é somente leitura no Partner Pro (a alteração
 *   editorial continua sendo do Admin Roxou).
 * - Autorização real é da RLS do backend oficial; o escopo aqui é
 *   apenas guarda-corpo de UI.
 */
import { officialClient } from "@modules/partner/converged/client";
import {
  requireOrganization,
  requireVenue,
  type PartnerScope,
} from "@modules/partner/converged/tenancy";

export const EVENTS_TABLE = "events" as const;

export type OfficialEventStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "rejected"
  | "archived"
  | "cancelled";

export interface OfficialEvent {
  id: string;
  venue_id: string | null;
  organization_id: string | null;
  title: string;
  slug: string | null;
  description: string | null;
  short_description: string | null;
  category: string | null;
  status: string;
  banner_url: string | null;
  cover_image: string | null;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  ticket_url: string | null;
  official_url: string | null;
  is_free: boolean | null;
  min_ticket_price: number | null;
  featured: boolean | null;
  published_at: string | null;
  created_at: string;
  updated_at: string | null;
}

const SELECT_COLS =
  "id, venue_id, organization_id, title, slug, description, short_description, category, status, banner_url, cover_image, start_date, end_date, start_time, end_time, ticket_url, official_url, is_free, min_ticket_price, featured, published_at, created_at, updated_at";

/** Campos que o parceiro pode enviar. Qualquer outro é descartado. */
export interface OfficialEventInput {
  title: string;
  start_date: string;
  end_date?: string | null;
  category?: string | null;
  description?: string | null;
  short_description?: string | null;
  banner_url?: string | null;
  ticket_url?: string | null;
  official_url?: string | null;
  is_free?: boolean;
  min_ticket_price?: number | null;
}

const EDITABLE_KEYS: (keyof OfficialEventInput)[] = [
  "title",
  "start_date",
  "end_date",
  "category",
  "description",
  "short_description",
  "banner_url",
  "ticket_url",
  "official_url",
  "is_free",
  "min_ticket_price",
];

function sanitize(input: Partial<OfficialEventInput>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of EDITABLE_KEYS) {
    if (!(key in input)) continue;
    const value = (input as Record<string, unknown>)[key];
    if (value === undefined) continue;
    if (typeof value === "string") {
      const trimmed = value.trim();
      out[key] = trimmed.length ? trimmed : null;
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Status em que o parceiro ainda pode editar livremente. */
export function isPartnerEditable(status: string): boolean {
  return status === "draft" || status === "pending_review" || status === "rejected";
}

export async function listVenueEvents(
  scope: PartnerScope,
): Promise<OfficialEvent[]> {
  const venueId = requireVenue(scope);
  const { data, error } = await officialClient()
    .from(EVENTS_TABLE)
    .select(SELECT_COLS)
    .eq("venue_id", venueId)
    .order("start_date", { ascending: false })
    .limit(300);
  if (error) throw error;
  return (data ?? []) as unknown as OfficialEvent[];
}

/**
 * Envia um novo evento para análise da Roxou.
 * Sempre `status = pending_review`. Nunca publica.
 */
export async function submitVenueEvent(
  scope: PartnerScope,
  input: OfficialEventInput,
  createdBy: string | null,
): Promise<OfficialEvent> {
  const organizationId = requireOrganization(scope);
  const venueId = requireVenue(scope);
  const clean = sanitize(input);
  if (!clean.title) throw new Error("Título é obrigatório.");
  if (!clean.start_date) throw new Error("Data de início é obrigatória.");

  const payload = {
    ...clean,
    venue_id: venueId,
    organization_id: organizationId,
    status: "pending_review",
    slug: `${slugify(String(clean.title))}-${Date.now().toString(36)}`,
    created_by: createdBy,
  };

  const { data, error } = await officialClient()
    .from(EVENTS_TABLE)
    .insert(payload)
    .select(SELECT_COLS)
    .single();
  if (error) throw error;
  return data as unknown as OfficialEvent;
}

/**
 * Atualiza um evento ainda não publicado do próprio estabelecimento.
 * Mantém `pending_review` — o parceiro nunca altera status para published.
 */
export async function updateVenueEvent(
  scope: PartnerScope,
  eventId: string,
  input: Partial<OfficialEventInput>,
): Promise<OfficialEvent> {
  const venueId = requireVenue(scope);
  const clean = sanitize(input);
  if (Object.keys(clean).length === 0) throw new Error("Nada para atualizar.");

  const { data, error } = await officialClient()
    .from(EVENTS_TABLE)
    .update({ ...clean, status: "pending_review" })
    .eq("id", eventId)
    .eq("venue_id", venueId)
    .in("status", ["draft", "pending_review", "rejected"])
    .select(SELECT_COLS)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new Error(
      "Evento não encontrado, pertence a outro estabelecimento ou já está publicado.",
    );
  }
  return data as unknown as OfficialEvent;
}
