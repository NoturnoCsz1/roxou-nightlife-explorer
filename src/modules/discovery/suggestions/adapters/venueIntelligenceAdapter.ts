/**
 * Adapter — Venue Intelligence → Suggestion Engine.
 *
 * Traduz diffs propostos para o perfil de um venue em `VenueSuggestion`.
 * Nenhum consumidor real nesta onda.
 */
import type {
  SuggestionInput,
  VenueSuggestion,
  VenueSuggestionPayload,
} from "../types/suggestion";
import type { SuggestionSource } from "../types/source";

export interface VenueSuggestionSeed {
  targetId: string;
  targetSlug?: string | null;
  source: SuggestionSource;
  confidence: number;
  changes: VenueSuggestionPayload["changes"];
  rationale?: string;
}

export function buildVenueSuggestionInput(
  seed: VenueSuggestionSeed,
): SuggestionInput<VenueSuggestion> | null {
  if (!seed.changes || Object.keys(seed.changes).length === 0) return null;
  return {
    kind: "venue",
    source: seed.source,
    confidence: seed.confidence,
    targetId: seed.targetId,
    targetSlug: seed.targetSlug ?? null,
    rationale: seed.rationale ?? null,
    payload: { changes: seed.changes },
  };
}
