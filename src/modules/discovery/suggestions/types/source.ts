/**
 * Fonte que produziu uma sugestão. Determina prioridade, confiança
 * padrão e políticas de expiração em ondas futuras.
 */
export type SuggestionSource =
  | "partner"
  | "admin"
  | "google"
  | "instagram"
  | "facebook"
  | "website"
  | "manual"
  | "ai";

export const SUGGESTION_SOURCES: readonly SuggestionSource[] = [
  "partner",
  "admin",
  "google",
  "instagram",
  "facebook",
  "website",
  "manual",
  "ai",
] as const;

/** True se a fonte é considerada humana (não requer confidence alta). */
export function isHumanSource(source: SuggestionSource): boolean {
  return source === "partner" || source === "admin" || source === "manual";
}
