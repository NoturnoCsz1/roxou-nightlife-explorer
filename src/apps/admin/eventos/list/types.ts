// Tipos compartilhados da listagem de eventos do admin.
// Extraídos de src/pages/admin/EventosList.tsx (Fase 3B) sem alterar
// nenhum campo, valor ou comportamento.

export interface EventRow {
  id: string;
  title: string;
  slug: string;
  venue_name: string | null;
  address: string | null;
  date_time: string;
  category: string;
  sub_category: string | null;
  status: string;
  featured: boolean;
  aura_pick: boolean;
  image_url: string | null;
  description: string | null;
  partner_id: string | null;
  created_at: string;
  verification_source: string | null;
  ai_confidence?: string | null;
  needs_review?: boolean | null;
  aura_badge?: string | null;
  aura_score?: number | null;
}

export type OriginFilter =
  | "todos"
  | "aura"
  | "instagram"
  | "eventou"
  | "ai"
  | "manual";
export type ExtraFilter =
  | "todos"
  | "aura"
  | "destaques"
  | "sem-imagem"
  | "sem-descricao"
  | "sem-local"
  | "sem-data"
  | "incompletos"
  | "em-alta"
  | "detectados-hoje"
  | "arquivados"
  | "prontos"
  | "revisar"
  | "duplicados";
export type DateQuickFilter =
  | "todos"
  | "hoje"
  | "semana"
  | "mes"
  | "futuros"
  | "passados"
  | "sem-data";
export type TabKey = "todos" | "hoje" | "rascunhos" | "problemas" | "destaques" | "revisao";
export type ViewMode = "cards" | "compact";

export type ChecklistKey = "title" | "date" | "description" | "flyer";
export interface Checklist {
  title: boolean;
  date: boolean;
  /** "Tem descrição alguma" — usa hasEventDescription. */
  description: boolean;
  /** "Tem descrição rica para publicar" — exige HTML estruturado. */
  descriptionRich: boolean;
  flyer: boolean;
  complete: boolean;
}

// Centralized route builder for the full event edit form.
// Use this everywhere instead of hardcoding paths to avoid divergences.
export const getEventEditPath = (id: string) => `/admin/eventos/${id}/editar`;

export const CATEGORIES = [
  "balada",
  "show",
  "bar",
  "festival",
  "sertanejo",
  "funk",
  "eletronica",
  "festa",
] as const;

export const categoryBadge: Record<string, string> = {
  balada: "badge-balada",
  show: "badge-show",
  bar: "badge-bar",
  festival: "badge-festival",
  sertanejo: "badge-sertanejo",
  funk: "badge-funk",
  eletronica: "badge-eletronica",
  festa: "badge-balada",
};
