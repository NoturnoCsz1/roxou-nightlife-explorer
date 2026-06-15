/**
 * Tipos e constantes compartilhadas da auditoria de estabelecimentos.
 * Extraído de src/pages/admin/EstabelecimentosAudit.tsx — Fase 3A.
 * Comportamento idêntico ao original.
 */

export type Status = "draft" | "ativo" | "destaque" | "oficial" | "bloqueado";

export interface Establishment {
  id: string;
  name: string;
  slug: string;
  type: string | null;
  city: string | null;
  address: string | null;
  neighborhood: string | null;
  instagram: string | null;
  whatsapp: string | null;
  active: boolean;
  status: Status | null;
  instagram_validated: boolean | null;
  latitude: number | null;
  longitude: number | null;
  maps_place_id?: string | null;
  formatted_address?: string | null;
  description?: string | null;
  logo_url?: string | null;
  music_style_primary?: string | null;
  music_styles_secondary?: string[] | null;
  updated_at: string | null;
  created_at: string;
}

export interface Metrics { eventCount: number; }

export type QualityFilter =
  | "all"
  | "needs_attention"
  | "no_coords"
  | "no_instagram"
  | "no_description"
  | "no_music_style"
  | "no_logo"
  | "ready_to_feature";

export type OrderBy = "recent" | "events_desc" | "events_asc" | "score_asc" | "score_desc";

export type FlagKey = "missing_address" | "missing_instagram" | "missing_coordinates" | "missing_category";

export const FLAG_LABELS: Record<string, string> = {
  missing_address: "sem endereço",
  missing_instagram: "sem instagram",
  missing_coordinates: "sem coordenadas",
  missing_category: "sem categoria",
};

export const SCORE_WEIGHTS = {
  logo: 15,
  coordinates: 15,
  address: 10,
  instagram: 15,
  description: 15,
  category: 10,
  music_style: 10,
  instagram_validated: 10,
} as const;

export const STATUS_META: Record<Status, { label: string; cls: string }> = {
  draft:      { label: "Rascunho",   cls: "bg-muted/40 text-muted-foreground" },
  ativo:      { label: "Ativo",      cls: "bg-green-500/10 text-green-400" },
  destaque:   { label: "Destaque",   cls: "bg-amber-500/10 text-amber-400" },
  oficial:    { label: "Oficial",    cls: "bg-primary/15 text-primary" },
  bloqueado:  { label: "Bloqueado",  cls: "bg-destructive/10 text-destructive" },
};

// ============== AI types ==============
export type SingleAI = {
  risk: "baixo" | "medio" | "alto";
  summary: string;
  problems: string[];
  suggestions: string[];
  recommended_actions: string[];
  priority: "baixa" | "media" | "alta";
  oficial_candidate: boolean;
};

export type GlobalAI = {
  total: number;
  with_errors: number;
  top_problems: string[];
  fix_priority: string[];
  oficial_candidates: string[];
  high_traffic_bad_data: string[];
  summary: string;
};

export type SuggestAI = {
  suggested_type: string;
  suggested_type_label: string;
  suggested_music_primary: string;
  suggested_music_secondary: string[];
  suggested_description: string;
  suggested_full_description?: string;
  problems: string[];
  improvements: string[];
  confidence: "baixa" | "media" | "alta";
  evidence?: string;
  suggested_address?: string | null;
  suggested_neighborhood?: string | null;
  suggested_latitude?: number | null;
  suggested_longitude?: number | null;
  suggested_place_id?: string | null;
  suggested_formatted_address?: string | null;
  address_source?: "instagram" | "website" | "cadastro" | "google_maps" | "ambos" | "nao_encontrado" | null;
  address_confidence?: "baixa" | "media" | "alta" | null;
  address_evidence?: string | null;
  address_google_status?: string | null;
  address_partial_match?: boolean | null;
  instagram?: {
    handle: string | null;
    source: "cadastro" | "instagram_validated" | "instagram_not_validated";
    reason?: string;
    followers_count?: number | null;
    bio?: string | null;
  } | null;
};

export type ApplyKey =
  | "type"
  | "music_style_primary"
  | "music_styles_secondary"
  | "short_description"
  | "full_description"
  | "address";

export type ManualCoordsState = { lat: string; lng: string; url: string };
