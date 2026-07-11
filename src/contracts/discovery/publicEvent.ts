/**
 * Roxou Descobertas — contrato público de "Evento".
 *
 * Superfície somente-leitura consumida por qualquer módulo externo
 * (Partner, Transporte, Admin, integrações) que precise referenciar
 * um evento sem depender das tabelas internas.
 *
 * Regras:
 *  - TypeScript puro. Sem React, sem Supabase, sem side-effects.
 *  - Nunca importar tipos gerados de `@/integrations/supabase/types`
 *    diretamente; se necessário, projetar aqui os campos relevantes.
 *  - Campos opcionais são o default: novas colunas do banco NÃO
 *    entram automaticamente no contrato.
 */

export type PublicEventStatus = "published" | "draft" | "archived";

export interface PublicEvent {
  /** UUID estável do evento. */
  id: string;
  /** Slug canônico usado em `/evento/:slug`. */
  slug: string;
  /** Título público (uppercase no banco, exibição livre). */
  title: string;
  /** Categoria taxonômica principal (festa, gastronomia, esporte, …). */
  category: string;
  /** Sub-categoria (mpb, sertanejo, japonesa, …). Opcional. */
  subCategory?: string | null;
  /** ISO8601 no fuso -03:00. */
  dateTimeIso: string;
  /** Marca se o horário ainda é "a confirmar". */
  timeIsUnknown?: boolean;
  /** Nome do local exibido publicamente. */
  venueName?: string | null;
  /** Endereço curto para exibição/geo. */
  address?: string | null;
  /** Cidade (slug ou nome curto). */
  city?: string | null;
  /** Flyer/cover pública. */
  imageUrl?: string | null;
  /** URL de vídeo (autoplay em preview). */
  videoUrl?: string | null;
  /** Link externo para ingresso, se houver. */
  ticketUrl?: string | null;
  /** Status de publicação. */
  status: PublicEventStatus;
  /** Partner proprietário, se vinculado. */
  partnerId?: string | null;
  /** Slug do parceiro para deep-link. */
  partnerSlug?: string | null;
}

/** URL canônica pública para um evento. */
export type PublicEventUrl = `/evento/${string}`;
