/**
 * Onda 16 — Lead Intelligence
 * Contratos para dados vindos do Google Places.
 *
 * NENHUMA chamada HTTP. Somente tipagem.
 */

export type PlaceId = string;

export interface PlaceCoordinates {
  latitude: number;
  longitude: number;
}

export interface PlaceAddress {
  formatted?: string | null;
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
}

export interface PlacePhone {
  raw?: string | null;
  international?: string | null;
  national?: string | null;
}

export interface PlaceWebsite {
  url: string;
  label?: string | null;
}

export type PlaceWeekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface PlaceOpeningHoursPeriod {
  weekday: PlaceWeekday;
  /** HH:mm 24h */
  open: string;
  /** HH:mm 24h; pode passar da meia-noite (ex.: 03:00) */
  close: string;
}

export interface PlaceOpeningHours {
  periods: PlaceOpeningHoursPeriod[];
  weekdayText?: string[];
  openNow?: boolean | null;
}

export interface PlaceMapsUrl {
  url: string;
  directionsUrl?: string | null;
}

export interface PlaceRating {
  value: number;
  scale?: number;
}

export interface PlaceReviewCount {
  total: number;
}

export type PlaceType = string;

export interface PlacePhoto {
  url: string;
  width?: number;
  height?: number;
  attribution?: string | null;
}

export interface GooglePlaceProfile {
  placeId: PlaceId;
  name?: string | null;
  address?: PlaceAddress | null;
  coordinates?: PlaceCoordinates | null;
  phone?: PlacePhone | null;
  website?: PlaceWebsite | null;
  openingHours?: PlaceOpeningHours | null;
  mapsUrl?: PlaceMapsUrl | null;
  rating?: PlaceRating | null;
  reviewCount?: PlaceReviewCount | null;
  types?: PlaceType[];
  photos?: PlacePhoto[];
  fetchedAt?: string;
}
