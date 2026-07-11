/**
 * Roxou Descobertas — contrato público de "Local/Parceiro".
 *
 * Projeção pública dos campos de `partners` que qualquer módulo pode
 * consumir. Não expõe dados operacionais (financeiro, equipe, etc.).
 */

export interface PublicVenue {
  id: string;
  slug: string;
  name: string;
  /** Tipo comercial (bar, restaurante, café, …). */
  type?: string | null;
  city?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  imageUrl?: string | null;
  logoUrl?: string | null;
  instagram?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  active: boolean;
  verified?: boolean;
  /** Faixa de preço 1-4. */
  priceRange?: 1 | 2 | 3 | 4 | null;
  /** Ambiente/tags públicas: 'casal', 'familia', 'pet-friendly', … */
  tags?: string[];
}

/** URL canônica pública para um local. */
export type PublicVenueUrl = `/local/${string}`;
