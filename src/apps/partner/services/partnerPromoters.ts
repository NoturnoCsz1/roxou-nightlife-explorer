/**
 * Partner Promoters Service — Fase 9L
 *
 * CRUD para promoters de um parceiro. Usado pela Lista VIP para registrar
 * quem trouxe cada convidado (com snapshot de nome para histórico).
 *
 * RLS: gerenciado por owner/admin/editor; leitura por qualquer membro ativo.
 */
import { supabase } from "@/integrations/supabase/client";

export interface PartnerPromoter {
  id: string;
  partner_id: string;
  name: string;
  phone: string | null;
  instagram: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromoterPayload {
  name?: string;
  phone?: string | null;
  instagram?: string | null;
  is_active?: boolean;
}

const TABLE = "partner_promoters" as const;

export async function listPromoters(
  partnerId: string,
  options: { includeInactive?: boolean } = {},
): Promise<PartnerPromoter[]> {
  if (!partnerId) return [];
  let q = supabase
    .from(TABLE)
    .select("*")
    .eq("partner_id", partnerId)
    .order("name", { ascending: true })
    .limit(500);
  if (!options.includeInactive) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as PartnerPromoter[];
}

export async function createPromoter(
  partnerId: string,
  payload: PromoterPayload,
): Promise<PartnerPromoter> {
  if (!partnerId) throw new Error("partnerId obrigatório.");
  const name = payload.name?.trim();
  if (!name) throw new Error("Nome do promoter é obrigatório.");
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      partner_id: partnerId,
      name,
      phone: payload.phone?.trim() || null,
      instagram: payload.instagram?.trim() || null,
      is_active: payload.is_active ?? true,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as PartnerPromoter;
}

export async function updatePromoter(
  promoterId: string,
  payload: PromoterPayload,
): Promise<PartnerPromoter> {
  const patch: Record<string, unknown> = {};
  if (payload.name !== undefined) patch.name = payload.name?.trim();
  if (payload.phone !== undefined) patch.phone = payload.phone?.trim() || null;
  if (payload.instagram !== undefined)
    patch.instagram = payload.instagram?.trim() || null;
  if (payload.is_active !== undefined) patch.is_active = payload.is_active;
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("id", promoterId)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as PartnerPromoter;
}

export async function deactivatePromoter(
  promoterId: string,
): Promise<PartnerPromoter> {
  return updatePromoter(promoterId, { is_active: false });
}
