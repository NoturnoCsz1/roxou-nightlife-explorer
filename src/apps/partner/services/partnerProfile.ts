/**
 * Partner Profile Service — Fase 9E
 *
 * Edição controlada do perfil do parceiro.
 * Fonte única: tabela `partners` (não cria perfis paralelos).
 *
 * Apenas um subconjunto de colunas é editável. Campos institucionais
 * (name, slug, city, address, lat/lng, status, featured) permanecem
 * sob curadoria do Admin.
 */
import { supabase } from "@/integrations/supabase/client";
import { normalizeInstagramHandle } from "@/lib/instagramHandle";

export type PartnerImageType = "logo";

/** Campos seguros que o parceiro pode editar. */
export interface PartnerEditablePayload {
  short_description?: string | null;
  full_description?: string | null;
  instagram?: string | null;
  whatsapp?: string | null;
  logo_url?: string | null;
}

export interface PartnerProfileRow extends PartnerEditablePayload {
  id: string;
  name: string;
  slug: string;
  city: string;
  type: string | null;
  address: string | null;
  formatted_address: string | null;
  instagram_username: string | null;
  verified_partner: boolean | null;
  updated_at: string | null;
}

/**
 * Lista de colunas brancas. Qualquer chave fora daqui é descartada
 * antes do UPDATE para evitar escalação acidental.
 */
const EDITABLE_COLUMNS = [
  "short_description",
  "full_description",
  "instagram",
  "whatsapp",
  "logo_url",
] as const;

export async function getPartnerProfile(
  partnerId: string,
): Promise<PartnerProfileRow | null> {
  if (!partnerId) return null;
  const { data, error } = await supabase
    .from("partners")
    .select(
      "id, name, slug, city, type, address, formatted_address, short_description, full_description, instagram, instagram_username, whatsapp, logo_url, verified_partner, updated_at",
    )
    .eq("id", partnerId)
    .maybeSingle();
  if (error) throw error;
  return (data as PartnerProfileRow | null) ?? null;
}

function sanitizePayload(
  raw: PartnerEditablePayload,
): PartnerEditablePayload {
  const out: PartnerEditablePayload = {};
  for (const key of EDITABLE_COLUMNS) {
    if (!(key in raw)) continue;
    const value = raw[key];
    if (value === undefined) continue;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (key === "instagram") {
        out.instagram = trimmed ? normalizeInstagramHandle(trimmed) : null;
        continue;
      }
      if (key === "whatsapp") {
        out.whatsapp = trimmed ? trimmed.replace(/[^\d+]/g, "") : null;
        continue;
      }
      out[key] = trimmed || null;
    } else {
      out[key] = value;
    }
  }
  return out;
}

export async function updatePartnerProfile(
  partnerId: string,
  payload: PartnerEditablePayload,
): Promise<PartnerProfileRow> {
  if (!partnerId) throw new Error("partnerId obrigatório.");
  const clean = sanitizePayload(payload);
  if (Object.keys(clean).length === 0) {
    throw new Error("Nada para atualizar.");
  }

  // Fase 9F: usa SECURITY DEFINER RPC com whitelist server-side.
  // O RLS de UPDATE em `partners` continua restrito ao Admin global;
  // owners/admins de parceiro passam exclusivamente por esta função.
  const { data, error } = await supabase.rpc("update_partner_safe_profile", {
    _partner_id: partnerId,
    _payload: clean as unknown as Record<string, unknown>,
  });

  if (error) throw error;
  if (!data) {
    throw new Error(
      "Sem permissão para atualizar este estabelecimento ou registro não encontrado.",
    );
  }
  return data as unknown as PartnerProfileRow;
}

/**
 * Sobe uma imagem do parceiro no bucket público `uploads` (pasta `partners/`)
 * e devolve a URL pública. Não altera a tabela — quem decide se grava em
 * `logo_url` é o chamador.
 */
export async function uploadPartnerImage(
  partnerId: string,
  file: File,
  type: PartnerImageType = "logo",
): Promise<string> {
  if (!partnerId) throw new Error("partnerId obrigatório.");
  if (!file) throw new Error("Arquivo obrigatório.");
  if (!file.type.startsWith("image/")) {
    throw new Error("Envie um arquivo de imagem.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Imagem maior que 5 MB.");
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `partners/${partnerId}/${type}-${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from("uploads").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;

  const { data } = supabase.storage.from("uploads").getPublicUrl(path);
  return data.publicUrl;
}
