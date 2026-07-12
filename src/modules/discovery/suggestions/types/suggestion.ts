/**
 * Contratos de sugestão do Suggestion Engine.
 *
 * Todas as sugestões compartilham `SuggestionBase`. Cada payload
 * especializado carrega o delta proposto — jamais é aplicado sem
 * aprovação humana.
 */
import type { SuggestionSource } from "./source";
import type { SuggestionStatus } from "./status";

export type SuggestionKind =
  | "feature"
  | "venue"
  | "summary"
  | "category"
  | "contact"
  | "photo";

/** Confidence 0–100. Fontes humanas costumam operar em 90+. */
export type SuggestionConfidence = number;

export interface SuggestionBase<K extends SuggestionKind, P> {
  /** Identificador único (uuid ou nanoid). Gerado pelo repositório. */
  id: string;
  /** Tipo do payload. */
  kind: K;
  /** Fonte responsável pela sugestão. */
  source: SuggestionSource;
  /** Confiança 0–100 (heurística determinística ou score da IA futura). */
  confidence: SuggestionConfidence;
  /** Estado atual. Nunca mutar diretamente — usar SuggestionService. */
  status: SuggestionStatus;
  /** Alvo da sugestão (ex.: partnerId, eventId). Opcional. */
  targetId?: string | null;
  /** Slug do alvo, quando aplicável (ex.: venue slug). */
  targetSlug?: string | null;
  /** Payload especializado. */
  payload: P;
  /** Justificativa curta e explicável ("why" do motor / da IA). */
  rationale?: string | null;
  /** Metadados livres (auditoria, hash da fonte, offsets, etc.). */
  metadata?: Record<string, unknown>;
  /** ISO. Momento de criação. */
  createdAt: string;
  /** ISO. Última mudança de status. */
  updatedAt: string;
  /** ISO. Momento de expiração (opcional). */
  expiresAt?: string | null;
  /** Usuário que revisou (Admin). Preenchido em approve/reject. */
  reviewedBy?: string | null;
  /** ISO. Momento da revisão. */
  reviewedAt?: string | null;
}

// ── Payloads especializados ─────────────────────────────────────────

export interface FeatureSuggestionPayload {
  /** Slug do Feature Engine (ex.: "area-kids"). */
  featureSlug: string;
  /** True = adicionar; false = remover. */
  add: boolean;
  /** Termos crus que dispararam a sugestão (para auditoria). */
  evidence?: string[];
}

export interface VenueSuggestionPayload {
  /** Diff proposto para o Venue Intelligence. */
  changes: Partial<{
    name: string;
    description: string;
    address: string;
    neighborhood: string;
    city: string;
    latitude: number;
    longitude: number;
    type: string;
    website: string;
    priceRange: string;
  }>;
}

export interface SummarySuggestionPayload {
  /** Resumo curto (ex.: bio, headline). */
  summary: string;
  /** Idioma ISO 639-1 (default "pt"). */
  language?: string;
}

export interface CategorySuggestionPayload {
  /** Slug/id de categoria proposta (Discovery Category). */
  categorySlug: string;
  /** Score interno da sugestão dentro da fonte. */
  score?: number;
}

export interface ContactSuggestionPayload {
  channel: "whatsapp" | "phone" | "email" | "instagram" | "website";
  value: string;
}

export interface PhotoSuggestionPayload {
  url: string;
  role?: "cover" | "logo" | "gallery" | "menu";
  attribution?: string | null;
  width?: number;
  height?: number;
}

// ── Tipos concretos ─────────────────────────────────────────────────

export type FeatureSuggestion = SuggestionBase<"feature", FeatureSuggestionPayload>;
export type VenueSuggestion = SuggestionBase<"venue", VenueSuggestionPayload>;
export type SummarySuggestion = SuggestionBase<"summary", SummarySuggestionPayload>;
export type CategorySuggestion = SuggestionBase<"category", CategorySuggestionPayload>;
export type ContactSuggestion = SuggestionBase<"contact", ContactSuggestionPayload>;
export type PhotoSuggestion = SuggestionBase<"photo", PhotoSuggestionPayload>;

export type Suggestion =
  | FeatureSuggestion
  | VenueSuggestion
  | SummarySuggestion
  | CategorySuggestion
  | ContactSuggestion
  | PhotoSuggestion;

/** Entrada para criação — id/status/timestamps são preenchidos pelo service. */
export type SuggestionInput<S extends Suggestion = Suggestion> = Omit<
  S,
  "id" | "status" | "createdAt" | "updatedAt" | "reviewedBy" | "reviewedAt"
> & {
  status?: SuggestionStatus;
};

/** Agrupamento por alvo/kind (para revisão em lote no Admin futuro). */
export interface SuggestionGroup {
  key: string;
  kind: SuggestionKind;
  targetId?: string | null;
  suggestions: Suggestion[];
}
