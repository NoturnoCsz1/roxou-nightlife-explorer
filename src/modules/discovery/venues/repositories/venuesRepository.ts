/**
 * Repository — Discovery / Venues (leituras públicas).
 *
 * Concentra as chamadas Supabase usadas pelas páginas públicas de local
 * (LocalDetail, LocalEventos) e a busca por id feita por EventDetail.
 * Preserva o comportamento atual (base table `partners`, filtro
 * `active = true` onde aplicável).
 */
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type PublicVenueRow = Tables<"partners">;

/** Parceiro ativo pelo slug (LocalDetail). */
export async function fetchActiveVenueBySlug(
  slug: string,
): Promise<PublicVenueRow | null> {
  const { data } = await supabase
    .from("partners")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .single();
  return data ?? null;
}

/** Identificação mínima do parceiro ativo — usado por LocalEventos. */
export async function fetchActiveVenueIdentityBySlug(
  slug: string,
): Promise<Pick<PublicVenueRow, "id" | "name"> | null> {
  const { data } = await supabase
    .from("partners")
    .select("id, name")
    .eq("slug", slug)
    .eq("active", true)
    .single();
  return (data as Pick<PublicVenueRow, "id" | "name"> | null) ?? null;
}

/** Parceiro pelo id (EventDetail resolve o local do evento). */
export async function fetchVenueById(
  id: string,
): Promise<PublicVenueRow | null> {
  const { data } = await supabase
    .from("partners")
    .select("*")
    .eq("id", id)
    .single();
  return data ?? null;
}

// ────────────────────────────────────────────────────────────────────
// Onda 8 — helpers usados pelas superfícies públicas de maior tráfego.
// Preservam 1:1 select/filtros atuais.
// ────────────────────────────────────────────────────────────────────

/** Mapeamento id→slug para parceiros — Home/Hoje/Semana. */
export async function fetchPartnerSlugsByIds(
  ids: string[],
): Promise<Array<Pick<PublicVenueRow, "id" | "slug">>> {
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from("partners")
    .select("id, slug")
    .in("id", ids);
  return (data as Array<Pick<PublicVenueRow, "id" | "slug">> | null) ?? [];
}

/** Coordenadas dos parceiros — PertoDeMim (fallback quando o evento não tem lat/lng). */
export async function fetchPartnerCoordsByIds(
  ids: string[],
): Promise<Array<Pick<PublicVenueRow, "id" | "latitude" | "longitude">>> {
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from("partners")
    .select("id,latitude,longitude")
    .in("id", ids);
  return (
    (data as Array<Pick<PublicVenueRow, "id" | "latitude" | "longitude">> | null) ??
    []
  );
}

/** GlobalSearchOverlay: índice compacto de parceiros ativos. */
export async function searchPublicVenues(
  limit = 300,
): Promise<PublicVenueRow[]> {
  const { data } = await supabase
    .from("partners")
    .select("id,slug,name,type,neighborhood,logo_url,short_description")
    .eq("active", true)
    .eq("status", "ativo")
    .limit(limit);
  return (data as PublicVenueRow[] | null) ?? [];
}

