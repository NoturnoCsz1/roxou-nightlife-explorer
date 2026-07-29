import { supabase } from "@/integrations/supabase/client";
import { getAdminAuthHeaders } from "@/lib/adminFetch";
import { BDA_DEFAULT_SETTINGS, type BdaSettings } from "@/components/bda/bdaConfig";


/**
 * Serviço do módulo Batalha de Aura (BDA).
 * Leitura pública restrita a views curadas; escrita sensível só via Edge Functions.
 */

const FUNCTIONS_BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.functions.supabase.co`;

export type BdaPartnerType = "patrocinio_oficial" | "apoio_oficial" | "realizacao";

export interface BdaPartner {
  id: string;
  name: string;
  slug: string;
  type: BdaPartnerType;
  logo_url: string;
  logo_alt: string;
  site_url: string | null;
  instagram_url: string | null;
  display_order: number;
  is_active?: boolean;
  is_featured: boolean;
}

export interface BdaPublicParticipant {
  id: string;
  public_name: string;
  category: "solo" | "dupla";
  team_name: string | null;
  city: string | null;
  photo_public_url: string | null;
}

export const BDA_PARTNER_TYPE_LABEL: Record<BdaPartnerType, string> = {
  realizacao: "Realização",
  patrocinio_oficial: "Patrocínio Oficial",
  apoio_oficial: "Apoio Oficial",
};

export const BDA_STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  aguardando_responsavel: "Aguardando responsável",
  aguardando_analise: "Aguardando análise",
  aprovada_privada: "Aprovada (privada)",
  aprovada_publica: "Aprovada (pública)",
  pendencia: "Pendência",
  recusada: "Recusada",
  cancelada: "Cancelada",
};

/* ============ PÚBLICO ============ */

export async function listPublicPartners(): Promise<BdaPartner[]> {
  const { data, error } = await (supabase as any)
    .from("public_bda_partners")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as BdaPartner[];
}

/** Configuração operacional (inscrições, data, local) — fonte única no banco. */
export async function fetchBdaSettings(): Promise<BdaSettings> {
  const { data, error } = await (supabase as any)
    .from("bda_settings")
    .select("registrations_open, public_list_enabled, event_date, event_location, event_city")
    .maybeSingle();
  if (error || !data) return BDA_DEFAULT_SETTINGS;
  return data as BdaSettings;
}

export interface BdaPublicEntry {
  registrationId: string;
  category: "solo" | "dupla";
  teamName: string | null;
  registeredAt: string;
  members: BdaPublicParticipant[];
}

export interface BdaPublicStats {
  total_registrations: number;
  solo_participants: number;
  duplas: number;
  total_participants: number;
}

export async function fetchPublicStats(): Promise<BdaPublicStats> {
  const { data, error } = await (supabase as any)
    .from("public_bda_stats")
    .select("*")
    .maybeSingle();
  if (error || !data) {
    return { total_registrations: 0, solo_participants: 0, duplas: 0, total_participants: 0 };
  }
  return data as BdaPublicStats;
}

const escapeLike = (s: string) => s.replace(/[%,()]/g, " ").trim();

/**
 * Listagem pública paginada.
 * Pagina por inscrição (nunca separa integrantes de uma dupla entre páginas)
 * e só consulta os campos autorizados da view curada.
 */
export async function listPublicEntries(opts: {
  search?: string;
  category?: "todos" | "solo" | "dupla";
  page?: number;
  pageSize?: number;
}): Promise<{ entries: BdaPublicEntry[]; total: number }> {
  const page = opts.page ?? 0;
  const pageSize = opts.pageSize ?? 12;
  const category = opts.category ?? "todos";
  const search = escapeLike(opts.search ?? "");

  let matchIds: string[] | null = null;
  if (search.length >= 2) {
    const { data: found, error: e1 } = await (supabase as any)
      .from("public_bda_participants")
      .select("registration_id")
      .or(`public_name.ilike.%${search}%,team_name.ilike.%${search}%`)
      .limit(500);
    if (e1) throw e1;
    matchIds = Array.from(new Set((found ?? []).map((r: any) => r.registration_id)));
    if (!matchIds.length) return { entries: [], total: 0 };
  }

  // Uma linha por inscrição (slot 1) → paginação estável.
  let head = (supabase as any)
    .from("public_bda_participants")
    .select("registration_id", { count: "exact" })
    .eq("slot", 1)
    .order("registered_at", { ascending: false })
    .range(page * pageSize, page * pageSize + pageSize - 1);
  if (category !== "todos") head = head.eq("category", category);
  if (matchIds) head = head.in("registration_id", matchIds);

  const { data: heads, count, error } = await head;
  if (error) throw error;
  const ids = (heads ?? []).map((r: any) => r.registration_id);
  if (!ids.length) return { entries: [], total: count ?? 0 };

  const { data: rows, error: e2 } = await (supabase as any)
    .from("public_bda_participants")
    .select("*")
    .in("registration_id", ids)
    .order("registered_at", { ascending: false })
    .order("slot", { ascending: true });
  if (e2) throw e2;

  const byReg = new Map<string, BdaPublicEntry>();
  for (const id of ids) {
    const members = (rows ?? []).filter((r: any) => r.registration_id === id);
    if (!members.length) continue;
    byReg.set(id, {
      registrationId: id,
      category: members[0].category,
      teamName: members[0].team_name ?? null,
      registeredAt: members[0].registered_at,
      members: members as BdaPublicParticipant[],
    });
  }

  return { entries: Array.from(byReg.values()), total: count ?? 0 };
}

/** Prévia curta usada na landing. */
export async function listPublicPreview(limit: number): Promise<BdaPublicEntry[]> {
  const { entries } = await listPublicEntries({ page: 0, pageSize: limit });
  return entries;
}


/* ============ INSCRIÇÃO PÚBLICA ============ */

export interface BdaConsentMap {
  participacao_evento?: boolean;
  tratamento_dados?: boolean;
  uso_imagem?: boolean;
  exibicao_publica?: boolean;
  comunicacoes?: boolean;
  exibicao_cidade?: boolean;
}

export interface BdaGuardianInput {
  fullName: string;
  cpf: string;
  birthDate?: string;
  phone: string;
  email: string;
  relationship: string;
  declarationAccepted: boolean;
  authorityConfirmed: boolean;
}

export interface BdaParticipantInput {
  fullName: string;
  publicName: string;
  birthDate: string;
  city?: string;
  phone: string;
  email: string;
  instagram?: string;
  notes?: string;
  photo?: string | null;
  photoPublic?: string | null;
  guardian?: BdaGuardianInput | null;
  consents: BdaConsentMap;
}

export async function submitRegistration(payload: {
  category: "solo" | "dupla";
  teamName?: string;
  participants: BdaParticipantInput[];
  elapsedMs: number;
  website?: string;
}) {
  const res = await fetch(`${FUNCTIONS_BASE}/bda-register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "Falha ao enviar inscrição.");
  return json as { ok: true; status: string; requiresGuardian: boolean; emailIntegrationPending: boolean };
}

/* ============ CONFIRMAÇÃO DO RESPONSÁVEL ============ */

export async function fetchGuardianConfirmation(token: string) {
  const res = await fetch(`${FUNCTIONS_BASE}/bda-guardian-confirm?token=${encodeURIComponent(token)}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "Link inválido.");
  return json;
}

export async function decideGuardianConfirmation(token: string, decision: "accept" | "refuse") {
  const res = await fetch(`${FUNCTIONS_BASE}/bda-guardian-confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, decision }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "Não foi possível registrar sua decisão.");
  return json;
}

/* ============ ADMIN — PARCEIROS ============ */

export async function adminListPartners(): Promise<BdaPartner[]> {
  const { data, error } = await (supabase as any)
    .from("bda_partners")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as BdaPartner[];
}

export async function adminSavePartner(partner: Partial<BdaPartner> & { name: string; logo_url: string }) {
  const payload = {
    name: partner.name,
    slug:
      partner.slug ||
      partner.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    type: partner.type ?? "apoio_oficial",
    logo_url: partner.logo_url,
    logo_alt: partner.logo_alt || partner.name,
    site_url: partner.site_url || null,
    instagram_url: partner.instagram_url || null,
    display_order: partner.display_order ?? 0,
    is_active: partner.is_active ?? true,
    is_featured: partner.is_featured ?? false,
  };
  const query = partner.id
    ? (supabase as any).from("bda_partners").update(payload).eq("id", partner.id)
    : (supabase as any).from("bda_partners").insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function adminDeletePartner(id: string) {
  const { error } = await (supabase as any).from("bda_partners").delete().eq("id", id);
  if (error) throw error;
}

/* ============ ADMIN — INSCRIÇÕES ============ */

export interface BdaAdminRegistration {
  id: string;
  category: "solo" | "dupla";
  team_name: string | null;
  status: string;
  admin_notes: string | null;
  submitted_at: string | null;
  created_at: string;
  participants: any[];
}

export async function adminListRegistrations(): Promise<BdaAdminRegistration[]> {
  const { data, error } = await (supabase as any)
    .from("bda_registrations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const regs = (data ?? []) as any[];
  if (!regs.length) return [];

  const ids = regs.map((r) => r.id);
  const { data: participants } = await (supabase as any)
    .from("bda_participants")
    .select("*")
    .in("registration_id", ids);
  const pIds = (participants ?? []).map((p: any) => p.id);
  const { data: guardians } = await (supabase as any)
    .from("bda_guardians")
    .select("id, participant_id, full_name, cpf_masked, email, phone, relationship, confirmed_at, refused_at, confirm_token_expires_at")
    .in("participant_id", pIds.length ? pIds : ["00000000-0000-0000-0000-000000000000"]);
  const { data: consents } = await (supabase as any)
    .from("bda_consents")
    .select("id, participant_id, consent_key, granted, granted_at, revoked_at, terms_version")
    .in("registration_id", ids);

  return regs.map((r) => ({
    ...r,
    participants: (participants ?? [])
      .filter((p: any) => p.registration_id === r.id)
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((p: any) => ({
        ...p,
        guardian: (guardians ?? []).find((g: any) => g.participant_id === p.id) ?? null,
        consents: (consents ?? []).filter((c: any) => c.participant_id === p.id),
      })),
  }));
}

async function adminAction(payload: Record<string, unknown>) {
  const headers = await getAdminAuthHeaders();
  const res = await fetch(`${FUNCTIONS_BASE}/bda-admin`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "Falha na ação administrativa.");
  return json;
}

export const adminSetRegistrationStatus = (registrationId: string, status: string, note?: string) =>
  adminAction({ action: "set_status", registrationId, status, note });

export const adminRemovePublicPhoto = (participantId: string) =>
  adminAction({ action: "remove_public_photo", participantId });

export const adminRevealCpf = (guardianId: string) =>
  adminAction({ action: "reveal_cpf", guardianId }) as Promise<{ cpf: string }>;

export const adminGuardianLink = (guardianId: string) =>
  adminAction({ action: "guardian_link", guardianId }) as Promise<{ token: string; expiresAt: string }>;

export const adminSaveNote = (registrationId: string, note: string) =>
  adminAction({ action: "admin_note", registrationId, note });

export const adminRevokeConsent = (consentId: string) =>
  adminAction({ action: "revoke_consent", consentId });

export async function adminListAuditLogs(limit = 100) {
  const { data, error } = await (supabase as any)
    .from("bda_admin_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
