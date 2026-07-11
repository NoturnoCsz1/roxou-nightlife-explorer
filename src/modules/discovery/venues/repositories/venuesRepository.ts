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
