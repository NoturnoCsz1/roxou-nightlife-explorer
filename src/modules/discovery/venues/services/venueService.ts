/* eslint-disable @typescript-eslint/no-explicit-any -- bridge tipado fraco até src/types/db.ts (Fase 3) */
/**
 * services/partners.ts — leitura de parceiros.
 * ADITIVO.
 */
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabaseFetchAll";

export type PartnerRow = Record<string, any>;

export async function getPublicPartnerBySlug(slug: string): Promise<PartnerRow | null> {
  const { data, error } = await (supabase as any)
    .from("public_partners")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data as PartnerRow) ?? null;
}

export async function listPublicPartners(opts?: {
  city?: string;
  type?: string;
  limit?: number;
}): Promise<PartnerRow[]> {
  let q = (supabase as any)
    .from("public_partners")
    .select("*")
    .order("name", { ascending: true });
  if (opts?.city) q = q.eq("city", opts.city);
  if (opts?.type) q = q.eq("type", opts.type);
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data as PartnerRow[]) ?? [];
}

export async function listAllPartnersAdmin(): Promise<PartnerRow[]> {
  return fetchAllRows<PartnerRow>(() =>
    (supabase as any)
      .from("partners")
      .select("*")
      .order("updated_at", { ascending: false }),
  );
}

export async function getPartnerById(id: string): Promise<PartnerRow | null> {
  const { data, error } = await (supabase as any)
    .from("partners")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as PartnerRow) ?? null;
}
