/**
 * services/partners.ts — leitura de parceiros.
 * ADITIVO: ninguém é migrado nesta fase.
 */
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabaseFetchAll";

export type PartnerRow = Record<string, any>;

/** Busca um parceiro público pelo slug. */
export async function getPublicPartnerBySlug(slug: string): Promise<PartnerRow | null> {
  const { data, error } = await supabase
    .from("public_partners")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/** Lista parceiros públicos. */
export async function listPublicPartners(opts?: {
  city?: string;
  type?: string;
  limit?: number;
}): Promise<PartnerRow[]> {
  let q = supabase.from("public_partners").select("*").order("name", { ascending: true });
  if (opts?.city) q = q.eq("city", opts.city);
  if (opts?.type) q = q.eq("type", opts.type);
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/** Lista TODOS os parceiros (admin). */
export async function listAllPartnersAdmin(): Promise<PartnerRow[]> {
  return fetchAllRows<PartnerRow>(() =>
    supabase.from("partners").select("*").order("updated_at", { ascending: false }),
  );
}

/** Busca parceiro admin por id. */
export async function getPartnerById(id: string): Promise<PartnerRow | null> {
  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}
