/**
 * Score Roxou e flags de qualidade.
 * Extraído de src/pages/admin/EstabelecimentosAudit.tsx — Fase 3A.
 * Lógica idêntica ao original (sem mudança de comportamento).
 */
import type { Establishment, FlagKey } from "./types";
import { SCORE_WEIGHTS } from "./types";

export function computeScore(e: Establishment): number {
  let s = 0;
  if (e.logo_url?.trim()) s += SCORE_WEIGHTS.logo;
  if (e.latitude != null && e.longitude != null) s += SCORE_WEIGHTS.coordinates;
  if (e.address?.trim()) s += SCORE_WEIGHTS.address;
  if (e.instagram?.trim()) s += SCORE_WEIGHTS.instagram;
  if (e.description?.trim()) s += SCORE_WEIGHTS.description;
  if (e.type?.trim()) s += SCORE_WEIGHTS.category;
  if (e.music_style_primary?.trim()) s += SCORE_WEIGHTS.music_style;
  if (e.instagram_validated) s += SCORE_WEIGHTS.instagram_validated;
  return Math.min(100, s);
}

export function scoreTone(score: number): { cls: string; label: string } {
  if (score >= 90) return { cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40", label: "Excelente" };
  if (score >= 70) return { cls: "bg-sky-500/15 text-sky-400 border-sky-500/40", label: "Bom" };
  if (score >= 50) return { cls: "bg-amber-500/15 text-amber-400 border-amber-500/40", label: "Atenção" };
  return { cls: "bg-destructive/15 text-destructive border-destructive/40", label: "Crítico" };
}

export function computeFlags(e: Establishment): FlagKey[] {
  const f: FlagKey[] = [];
  if (!e.address?.trim()) f.push("missing_address");
  if (!e.instagram?.trim()) f.push("missing_instagram");
  if (e.latitude == null || e.longitude == null) f.push("missing_coordinates");
  if (!e.type?.trim()) f.push("missing_category");
  return f;
}
