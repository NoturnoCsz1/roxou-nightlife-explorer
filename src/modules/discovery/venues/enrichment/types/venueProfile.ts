/**
 * Onda 15 — Venue Intelligence
 * Tipos que descrevem o perfil enriquecido de um estabelecimento.
 *
 * Somente contratos. Nenhum consumidor real nesta onda.
 */

export type PriceRange = 1 | 2 | 3 | 4;

export type VenueAmbiance =
  | "casual"
  | "romantico"
  | "familiar"
  | "sofisticado"
  | "descolado"
  | "esportivo"
  | "underground";

export interface VenueAudienceFit {
  casal?: boolean;
  familia?: boolean;
  grupos?: boolean;
  solo?: boolean;
  petFriendly?: boolean;
  areaKids?: boolean;
}

export interface VenueAmenities {
  happyHour?: boolean;
  musicaAoVivo?: boolean;
  estacionamento?: boolean;
  delivery?: boolean;
  reserva?: boolean;
  listaVip?: boolean;
  wifi?: boolean;
  arCondicionado?: boolean;
  areaExterna?: boolean;
  acessibilidade?: boolean;
}

export interface VenueContact {
  whatsapp?: string | null;
  telefone?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  website?: string | null;
  email?: string | null;
}

export interface VenueLocation {
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googlePlaceId?: string | null;
  googleMapsUrl?: string | null;
}

export interface VenueMenuLink {
  url: string;
  label?: string;
  type?: "pdf" | "web" | "image";
}

export interface VenuePhoto {
  url: string;
  alt?: string;
  source?: VenueEnrichmentSource;
}

export interface VenueRelatedEventRef {
  eventId: string;
  eventSlug?: string;
}

export interface VenueSimilarVenueRef {
  venueId: string;
  venueSlug: string;
  score?: number;
}

/**
 * Perfil enriquecido — projeção pública/consumidora.
 * Nenhum campo aqui é obrigatório: a superfície evolui por onda.
 */
export interface VenueProfile {
  venueId: string;
  slug: string;

  contact?: VenueContact;
  location?: VenueLocation;

  categories?: string[];
  specialties?: string[];
  priceRange?: PriceRange;
  ambiance?: VenueAmbiance[];

  amenities?: VenueAmenities;
  audienceFit?: VenueAudienceFit;

  menu?: VenueMenuLink[];
  photos?: VenuePhoto[];

  relatedEvents?: VenueRelatedEventRef[];
  similarVenues?: VenueSimilarVenueRef[];

  /** Resumo curto gerado por IA (não implementado nesta onda). */
  aiSummary?: string | null;
  /** Motivos de recomendação (bullets) — futuros. */
  recommendationReasons?: string[];

  updatedAt?: string;
}

/**
 * Fontes possíveis para um dado enriquecido.
 * Usada em VenueEnrichmentSuggestion e VenuePhoto.
 */
export type VenueEnrichmentSource =
  | "google_places"
  | "instagram"
  | "facebook"
  | "website"
  | "manual_partner"
  | "manual_admin"
  | "ai";
