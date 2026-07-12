/**
 * Onda 20 — Venue Features Repository.
 *
 * Fonte: `public.partners.features` (JSONB array).
 * Escrita via RPC `set_partner_features` (SECURITY DEFINER).
 *
 * Reutiliza o cliente Supabase existente. Não cria nova tabela.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  FeatureSource,
  VenueFeatureAssignment,
} from "../types/feature";

/**
 * Normaliza qualquer valor bruto vindo de `partners.features` para
 * `VenueFeatureAssignment[]`. Tolera arrays de strings (slugs) e objetos
 * parciais.
 */
export function parseVenueFeaturesJson(
  raw: unknown,
): VenueFeatureAssignment[] {
  if (!Array.isArray(raw)) return [];
  const out: VenueFeatureAssignment[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      out.push({
        featureId: item,
        featureSlug: item,
        source: "manual_admin",
        approved: true,
      });
      continue;
    }
    if (item && typeof item === "object") {
      const rec = item as Record<string, unknown>;
      const slug =
        typeof rec.featureSlug === "string"
          ? rec.featureSlug
          : typeof rec.slug === "string"
            ? rec.slug
            : null;
      if (!slug) continue;
      out.push({
        featureId:
          typeof rec.featureId === "string" ? rec.featureId : slug,
        featureSlug: slug,
        source: (rec.source as FeatureSource) ?? "manual_admin",
        approved: rec.approved === false ? false : true,
        confidence:
          typeof rec.confidence === "number" ? rec.confidence : undefined,
        suggested: rec.suggested === true ? true : undefined,
        createdAt:
          typeof rec.createdAt === "string" ? rec.createdAt : undefined,
        updatedAt:
          typeof rec.updatedAt === "string" ? rec.updatedAt : undefined,
      });
    }
  }
  return out;
}

export interface VenueFeaturesRepository {
  fetch(partnerId: string): Promise<VenueFeatureAssignment[]>;
  save(
    partnerId: string,
    slugs: string[],
    source: "manual_partner" | "manual_admin",
  ): Promise<VenueFeatureAssignment[]>;
}

export const venueFeaturesRepository: VenueFeaturesRepository = {
  async fetch(partnerId) {
    if (!partnerId) return [];
    const { data, error } = await supabase
      .from("partners")
      .select("features")
      .eq("id", partnerId)
      .maybeSingle();
    if (error) throw error;
    return parseVenueFeaturesJson((data as { features?: unknown } | null)?.features);
  },

  async save(partnerId, slugs, source) {
    if (!partnerId) throw new Error("partnerId obrigatório.");
    const cleaned = Array.from(
      new Set(
        (slugs ?? [])
          .map((s) => (typeof s === "string" ? s.trim() : ""))
          .filter(Boolean),
      ),
    );
    const { data, error } = await supabase.rpc("set_partner_features", {
      _partner_id: partnerId,
      _slugs: cleaned,
      _source: source,
    });
    if (error) throw error;
    return parseVenueFeaturesJson(data);
  },
};
