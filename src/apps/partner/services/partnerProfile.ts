/**
 * Partner Profile Service — Convergência (backend oficial)
 *
 * Fonte única: tabela `venues` do Supabase OFICIAL do Partner Pro, sempre
 * através do client dedicado (`partnerSupabase` / `partnerBackendQuery`).
 *
 * - Leitura direta em `venues` (RLS oficial).
 * - Escrita EXCLUSIVAMENTE via RPC `partner_update_venue_profile`.
 * - Upload de logo no bucket oficial `venues`, pasta `<organization_id>/`.
 *
 * Sem tabela `partners`, sem `update_partner_safe_profile`,
 * sem `set_partner_features`, sem bucket `uploads`, sem client legado.
 */
import {
  partnerBackendQuery,
  partnerSupabase,
} from "../backend/partnerSupabase";
import { normalizeInstagramHandle } from "@shared/utils/instagramHandle";

export type PartnerImageType = "logo" | "cover";

/** Campos do venue que o parceiro pode editar. */
export interface VenueEditablePayload {
  description?: string | null;
  instagram?: string | null;
  contact_phone?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  logo_url?: string | null;
  cover_image?: string | null;
  street?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capacity?: number | null;
  venue_type?: string | null;
  category?: string | null;
}

/** Alias mantido para os componentes existentes do Perfil. */
export type PartnerEditablePayload = VenueEditablePayload;

export interface VenueProfileRow extends VenueEditablePayload {
  id: string;
  organization_id: string | null;
  name: string;
  slug: string | null;
  city: string | null;
  verified: boolean | null;
  status: string | null;
}

export type PartnerProfileRow = VenueProfileRow;

const VENUE_SELECT =
  "id, organization_id, name, slug, city, description, instagram, contact_phone, whatsapp, website, logo_url, cover_image, street, address, latitude, longitude, capacity, venue_type, category, verified, status";

/**
 * Colunas permitidas na escrita. Campos administrativos
 * (id, organization_id, verified, status, slug, name, city) nunca entram.
 */
const EDITABLE_COLUMNS: (keyof VenueEditablePayload)[] = [
  "description",
  "instagram",
  "contact_phone",
  "whatsapp",
  "website",
  "logo_url",
  "cover_image",
  "street",
  "address",
  "latitude",
  "longitude",
  "capacity",
  "venue_type",
  "category",
];

export async function getVenueProfile(
  venueId: string,
): Promise<VenueProfileRow | null> {
  if (!venueId) return null;
  const { data, error } = await partnerBackendQuery()
    .from("venues")
    .select(VENUE_SELECT)
    .eq("id", venueId)
    .maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[PartnerProfile] getVenueProfile failed:", error);
    throw error;
  }
  return (data as unknown as VenueProfileRow | null) ?? null;
}

/** Compat: mesma função, nome antigo usado pela página. */
export const getPartnerProfile = getVenueProfile;

function sanitizePayload(raw: VenueEditablePayload): VenueEditablePayload {
  const out: Record<string, unknown> = {};
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
      if (key === "whatsapp" || key === "contact_phone") {
        out[key] = trimmed ? trimmed.replace(/[^\d+]/g, "") : null;
        continue;
      }
      out[key] = trimmed || null;
      continue;
    }
    out[key] = value;
  }
  return out as VenueEditablePayload;
}

export async function updateVenueProfile(
  venueId: string,
  payload: VenueEditablePayload,
): Promise<VenueProfileRow> {
  if (!venueId) throw new Error("venueId obrigatório.");
  const patch = sanitizePayload(payload);
  if (Object.keys(patch).length === 0) throw new Error("Nada para atualizar.");

  const { data: auth } = await partnerSupabase.auth.getUser();
  const callerId = auth?.user?.id ?? null;
  if (!callerId) throw new Error("Sessão expirada. Entre novamente.");

  const { error } = await partnerBackendQuery().rpc(
    "partner_update_venue_profile",
    {
      _caller_id: callerId,
      _venue_id: venueId,
      _patch: patch,
    },
  );
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[PartnerProfile] partner_update_venue_profile failed:", error);
    throw new Error(
      error.message ||
        "Sem permissão para atualizar este estabelecimento ou registro não encontrado.",
    );
  }

  const row = await getVenueProfile(venueId);
  if (!row) throw new Error("Perfil não encontrado após salvar.");
  return row;
}

/** Compat: nome antigo usado pelo editor. */
export const updatePartnerProfile = updateVenueProfile;

/**
 * Sobe uma imagem do venue no bucket oficial `venues`, isolada por
 * organização (`<organization_id>/<arquivo>`), e devolve a URL pública.
 */
export async function uploadVenueImage(
  organizationId: string,
  file: File,
  type: PartnerImageType = "logo",
): Promise<string> {
  if (!organizationId) throw new Error("organizationId obrigatório.");
  if (!file) throw new Error("Arquivo obrigatório.");
  if (!file.type.startsWith("image/")) {
    throw new Error("Envie um arquivo de imagem.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Imagem maior que 5 MB.");
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${organizationId}/${type}-${crypto.randomUUID()}.${ext}`;

  const { error } = await partnerSupabase.storage
    .from("venues")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
  if (error) throw error;

  const { data } = partnerSupabase.storage.from("venues").getPublicUrl(path);
  return data.publicUrl;
}
