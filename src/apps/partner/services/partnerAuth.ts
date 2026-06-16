/**
 * Partner Auth Service (Fase 9C).
 *
 * Camada de acesso do Roxou Partner Pro.
 * Lê apenas tabelas criadas na Fase 9B (partner_users, partner_subscriptions)
 * e o estabelecimento real em `partners`.
 *
 * NÃO cria perfis paralelos. NÃO altera RLS. NÃO registra rotas.
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  PartnerRole,
  PartnerSubscriptionPlan,
  PartnerSubscriptionStatus,
} from "../types";

export interface PartnerSummary {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  cover_url: string | null;
  city: string | null;
  partner_type: string | null;
}

export interface PartnerAccess {
  partner: PartnerSummary;
  role: PartnerRole;
  isActive: boolean;
  linkId: string;
}

export interface PartnerSubscription {
  id: string;
  partner_id: string;
  plan: PartnerSubscriptionPlan;
  status: PartnerSubscriptionStatus;
  started_at: string | null;
  expires_at: string | null;
}

/**
 * Retorna o usuário autenticado atual (revalidado no servidor de Auth).
 * Retorna `null` quando não há sessão.
 */
export async function getCurrentPartnerUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    // Sem sessão é cenário esperado — não propagar como erro.
    if (error.message?.toLowerCase().includes("session")) return null;
    throw error;
  }
  return data?.user ?? null;
}

/**
 * Lista todos os estabelecimentos (`partners`) que o usuário atual pode administrar,
 * via vínculos ativos em `partner_users`.
 */
export async function listMyPartners(): Promise<PartnerAccess[]> {
  const user = await getCurrentPartnerUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("partner_users")
    .select(
      `id, role, is_active, partner_id,
       partners:partner_id ( id, name, slug, logo_url, cover_url, city, partner_type )`,
    )
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (error) throw error;

  const rows = (data ?? []) as Array<{
    id: string;
    role: PartnerRole;
    is_active: boolean;
    partner_id: string;
    partners: PartnerSummary | null;
  }>;

  return rows
    .filter((r) => r.partners !== null)
    .map((r) => ({
      linkId: r.id,
      role: r.role,
      isActive: r.is_active,
      partner: r.partners as PartnerSummary,
    }));
}

/**
 * Retorna o acesso do usuário atual a um partner específico, ou `null` se não houver.
 */
export async function getPartnerAccess(
  partnerId: string,
): Promise<PartnerAccess | null> {
  if (!partnerId) return null;
  const all = await listMyPartners();
  return all.find((a) => a.partner.id === partnerId) ?? null;
}

/**
 * Retorna a assinatura atual do partner (única linha esperada).
 */
export async function getCurrentPartnerSubscription(
  partnerId: string,
): Promise<PartnerSubscription | null> {
  if (!partnerId) return null;

  const { data, error } = await supabase
    .from("partner_subscriptions")
    .select("id, partner_id, plan, status, started_at, expires_at")
    .eq("partner_id", partnerId)
    .order("started_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as PartnerSubscription | null) ?? null;
}

/**
 * `true` quando o usuário atual é owner ou admin do partner indicado.
 */
export async function isPartnerOwnerOrAdmin(
  partnerId: string,
): Promise<boolean> {
  const access = await getPartnerAccess(partnerId);
  if (!access || !access.isActive) return false;
  return access.role === "owner" || access.role === "admin";
}

/**
 * Garante que o usuário tem ao menos vínculo ativo no partner.
 * Lança se não tiver — para uso em loaders/guards futuros.
 */
export async function requirePartnerAccess(
  partnerId: string,
): Promise<PartnerAccess> {
  const access = await getPartnerAccess(partnerId);
  if (!access || !access.isActive) {
    throw new Error("Sem acesso a este estabelecimento.");
  }
  return access;
}
