/**
 * partnerProCrmService — camada de dados do CRM Partner Pro.
 * Todas as operações exigem admin (RLS).
 */
import { supabase } from "@/integrations/supabase/client";

export type Stage = "new" | "contacted" | "qualified" | "approved" | "rejected" | "converted";
export type Priority = "low" | "normal" | "high" | "urgent";
export type ActivityType =
  | "created"
  | "contacted"
  | "note_added"
  | "stage_changed"
  | "whatsapp_opened"
  | "approved"
  | "rejected"
  | "converted"
  | "follow_up_scheduled"
  | "priority_changed"
  | "assigned";

export interface PartnerProLead {
  id: string;
  estabelecimento: string;
  responsavel: string;
  whatsapp: string;
  phone_normalized: string | null;
  instagram: string | null;
  instagram_normalized: string | null;
  cidade: string | null;
  categoria: string | null;
  mensagem: string | null;
  status: string;
  stage: Stage;
  priority: Priority;
  lead_score: number;
  tags: string[];
  internal_notes: string | null;
  lost_reason: string | null;
  assigned_to: string | null;
  contacted_at: string | null;
  qualified_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  converted_at: string | null;
  next_follow_up_at: string | null;
  last_activity_at: string;
  converted_partner_id: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface PartnerProActivity {
  id: string;
  request_id: string;
  actor_id: string | null;
  type: ActivityType;
  message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function listLeads(): Promise<PartnerProLead[]> {
  const { data, error } = await supabase
    .from("partner_pro_requests")
    .select("*")
    .order("last_activity_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as unknown as PartnerProLead[];
}

export async function listActivities(requestId: string): Promise<PartnerProActivity[]> {
  const { data, error } = await supabase
    .from("partner_pro_request_activities")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PartnerProActivity[];
}

export async function updateLead(
  id: string,
  patch: Partial<
    Pick<
      PartnerProLead,
      | "stage"
      | "priority"
      | "tags"
      | "internal_notes"
      | "lost_reason"
      | "next_follow_up_at"
      | "assigned_to"
      | "status"
    >
  >,
): Promise<void> {
  const { error } = await supabase.from("partner_pro_requests").update(patch).eq("id", id);
  if (error) throw error;
}

export async function addActivity(
  requestId: string,
  type: ActivityType,
  message?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from("partner_pro_request_activities").insert([
    {
      request_id: requestId,
      actor_id: userData?.user?.id ?? undefined,
      type,
      message: message ?? undefined,
      metadata: (metadata ?? {}) as never,
    },
  ]);
  if (error) throw error;
}

export async function setStage(id: string, stage: Stage): Promise<void> {
  await updateLead(id, { stage });
}

export async function markContacted(id: string): Promise<void> {
  await updateLead(id, { stage: "contacted" });
}

export async function scheduleFollowUp(id: string, atIso: string, note?: string): Promise<void> {
  await updateLead(id, { next_follow_up_at: atIso });
  await addActivity(id, "follow_up_scheduled", note ?? `Agendado para ${new Date(atIso).toLocaleString("pt-BR")}`, {
    at: atIso,
  });
}

export async function logWhatsAppOpened(lead: PartnerProLead): Promise<void> {
  await addActivity(lead.id, "whatsapp_opened", "WhatsApp aberto pelo admin");
  if (lead.stage === "new") {
    await updateLead(lead.id, { stage: "contacted" });
  }
}

export async function addNote(id: string, note: string): Promise<void> {
  await addActivity(id, "note_added", note);
}

export interface ConvertPayload {
  name: string;
  slug: string;
  city: string | null;
  type: string | null;
  instagram: string | null;
}

/**
 * Cria registro em `partners` (se ainda não existir) e marca o lead como convertido.
 * Não toca em partner_users/beta_access — checklist manual no pós-conversão.
 */
export async function convertToPartner(lead: PartnerProLead, payload: ConvertPayload): Promise<string> {
  const insert = {
    name: payload.name,
    slug: payload.slug,
    city: payload.city,
    type: payload.type,
    instagram: payload.instagram,
  };
  const { data, error } = await supabase
    .from("partners")
    .insert(insert)
    .select("id")
    .single();
  if (error) throw error;
  const partnerId = data!.id as string;
  await updateLead(lead.id, { stage: "converted", status: "approved" });
  await supabase
    .from("partner_pro_requests")
    .update({ converted_partner_id: partnerId })
    .eq("id", lead.id);
  await addActivity(lead.id, "converted", `Convertido em parceiro: ${payload.name}`, {
    partner_id: partnerId,
  });
  return partnerId;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function whatsappLink(lead: PartnerProLead): string {
  const phone = lead.phone_normalized ?? lead.whatsapp.replace(/\D/g, "");
  const msg = `Olá, tudo bem? Aqui é da equipe Roxou.\nRecebemos sua solicitação para conhecer o Roxou Partner Pro.\nPodemos conversar sobre seu estabelecimento e liberar uma demonstração?`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

export function scoreBucket(score: number): { label: string; tone: string } {
  if (score >= 80) return { label: "Prioritário", tone: "bg-fuchsia-500/20 text-fuchsia-300" };
  if (score >= 60) return { label: "Quente", tone: "bg-red-500/20 text-red-300" };
  if (score >= 30) return { label: "Morno", tone: "bg-amber-500/20 text-amber-300" };
  return { label: "Frio", tone: "bg-sky-500/20 text-sky-300" };
}

export const STAGES: Array<{ value: Stage; label: string; tone: string }> = [
  { value: "new", label: "Novo lead", tone: "bg-sky-500/15 text-sky-300" },
  { value: "contacted", label: "Em contato", tone: "bg-amber-500/15 text-amber-300" },
  { value: "qualified", label: "Qualificado", tone: "bg-violet-500/15 text-violet-300" },
  { value: "approved", label: "Aprovado", tone: "bg-emerald-500/15 text-emerald-300" },
  { value: "rejected", label: "Recusado", tone: "bg-red-500/15 text-red-300" },
  { value: "converted", label: "Convertido", tone: "bg-primary/20 text-primary" },
];
