/**
 * Adapter — Feature Engine → Suggestion Engine.
 *
 * Prepara sugestões de features a partir de sinais externos (texto de
 * bio, tags do Instagram, etc.). NÃO integra fontes reais nesta onda —
 * apenas expõe a fábrica.
 */
import { FEATURE_CATALOG } from "../../features";
import type { SuggestionInput, FeatureSuggestion } from "../types/suggestion";
import type { SuggestionSource } from "../types/source";

export interface FeatureSuggestionSeed {
  featureSlug: string;
  add?: boolean;
  targetId?: string | null;
  targetSlug?: string | null;
  source: SuggestionSource;
  confidence: number;
  evidence?: string[];
  rationale?: string;
}

/**
 * Cria a entrada de sugestão sem persistir. Valida se o slug existe no
 * catálogo — slugs desconhecidos retornam `null`.
 */
export function buildFeatureSuggestionInput(
  seed: FeatureSuggestionSeed,
): SuggestionInput<FeatureSuggestion> | null {
  const known = FEATURE_CATALOG.some((f) => f.slug === seed.featureSlug);
  if (!known) return null;
  return {
    kind: "feature",
    source: seed.source,
    confidence: seed.confidence,
    targetId: seed.targetId ?? null,
    targetSlug: seed.targetSlug ?? null,
    rationale: seed.rationale ?? null,
    payload: {
      featureSlug: seed.featureSlug,
      add: seed.add ?? true,
      evidence: seed.evidence,
    },
  };
}
