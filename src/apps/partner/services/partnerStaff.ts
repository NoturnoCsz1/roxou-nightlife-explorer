/**
 * Partner Staff Service — FASE 6
 *
 * CRUD para contas temporárias da equipe operacional (validador, recepção,
 * caixa, gerente). Persiste em `partner_staff_accounts` (RLS controla acesso).
 */
import { supabase } from "@/integrations/supabase/client";

export type PartnerStaffRole = "validador" | "recepcao" | "caixa" | "gerente";

export interface PartnerStaffPermissions {
  scan_qr?: boolean;
  manual_reservations?: boolean;
  manage_waitlist?: boolean;
  manage_settings?: boolean;
  view_financial?: boolean;
  manage_types?: boolean;
}

export interface PartnerStaffAccount {
  id: string;
  partner_id: string;
  name: string;
  role: PartnerStaffRole;
  pin: string | null;
  permissions: PartnerStaffPermissions;
  expires_at: string | null;
  last_login_at: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerStaffPayload {
  name: string;
  role: PartnerStaffRole;
  pin?: string | null;
  permissions?: PartnerStaffPermissions;
  expires_at?: string | null;
  is_active?: boolean;
}

export const DEFAULT_PERMISSIONS: Record<PartnerStaffRole, PartnerStaffPermissions> = {
  validador: {
    scan_qr: true,
    manual_reservations: false,
    manage_waitlist: false,
    manage_settings: false,
    view_financial: false,
    manage_types: false,
  },
  recepcao: {
    scan_qr: true,
    manual_reservations: true,
    manage_waitlist: true,
    manage_settings: false,
    view_financial: false,
    manage_types: false,
  },
  caixa: {
    scan_qr: false,
    manual_reservations: false,
    manage_waitlist: false,
    manage_settings: false,
    view_financial: true,
    manage_types: false,
  },
  gerente: {
    scan_qr: true,
    manual_reservations: true,
    manage_waitlist: true,
    manage_settings: true,
    view_financial: true,
    manage_types: true,
  },
};

export const ROLE_LABEL: Record<PartnerStaffRole, string> = {
  validador: "Validador",
  recepcao: "Recepção",
  caixa: "Caixa",
  gerente: "Gerente",
};

export async function listStaffAccounts(
  partnerId: string,
): Promise<PartnerStaffAccount[]> {
  const { data, error } = await supabase
    .from("partner_staff_accounts")
    .select("*")
    .eq("partner_id", partnerId)
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PartnerStaffAccount[];
}

export async function createStaffAccount(
  partnerId: string,
  payload: PartnerStaffPayload,
): Promise<PartnerStaffAccount> {
  const permissions = payload.permissions ?? DEFAULT_PERMISSIONS[payload.role];
  const { data, error } = await supabase
    .from("partner_staff_accounts")
    .insert({
      partner_id: partnerId,
      name: payload.name,
      role: payload.role,
      pin: payload.pin ?? null,
      permissions: permissions as never,
      expires_at: payload.expires_at ?? null,
      is_active: payload.is_active ?? true,
    })
    .select()
    .single();
  if (error) throw error;
  return data as PartnerStaffAccount;
}

export async function updateStaffAccount(
  id: string,
  patch: Partial<PartnerStaffPayload>,
): Promise<PartnerStaffAccount> {
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.role !== undefined) update.role = patch.role;
  if (patch.pin !== undefined) update.pin = patch.pin;
  if (patch.permissions !== undefined) update.permissions = patch.permissions;
  if (patch.expires_at !== undefined) update.expires_at = patch.expires_at;
  if (patch.is_active !== undefined) update.is_active = patch.is_active;
  const { data, error } = await supabase
    .from("partner_staff_accounts")
    .update(update as never)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as PartnerStaffAccount;
}

export async function deleteStaffAccount(id: string): Promise<void> {
  const { error } = await supabase
    .from("partner_staff_accounts")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function revokeAllStaff(partnerId: string): Promise<number> {
  const { data, error } = await supabase
    .from("partner_staff_accounts")
    .update({ is_active: false })
    .eq("partner_id", partnerId)
    .eq("is_active", true)
    .select("id");
  if (error) throw error;
  return (data ?? []).length;
}

/** PIN aleatório no formato XXX-#### (ex: VAL-9382). */
export function generatePin(role: PartnerStaffRole): string {
  const prefix =
    role === "validador" ? "VAL" :
    role === "recepcao" ? "REC" :
    role === "caixa" ? "CAI" :
    "GER";
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${n}`;
}
