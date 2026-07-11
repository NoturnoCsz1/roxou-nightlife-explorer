/**
 * Helpers puros para normalizar filtros do Discovery Engine.
 * Sem Supabase, sem React.
 */
import type { DiscoveryQuery } from "../types/discoveryQuery";

export function normalizeSlug(input: string | undefined | null): string | undefined {
  if (!input) return undefined;
  const s = input
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || undefined;
}

export function normalizeCity(city: string | undefined): string | undefined {
  return normalizeSlug(city);
}

export function normalizeCategory(cat: string | undefined): string | undefined {
  return normalizeSlug(cat);
}

export function normalizeFeatures(features: string[] | undefined): string[] {
  if (!features?.length) return [];
  return Array.from(
    new Set(
      features
        .map((f) => normalizeSlug(f))
        .filter((v): v is string => Boolean(v)),
    ),
  );
}

export function clampLimit(limit: number | undefined, fallback = 20, max = 100): number {
  if (!Number.isFinite(limit as number)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(limit as number)));
}

export function clampOffset(offset: number | undefined): number {
  if (!Number.isFinite(offset as number) || (offset as number) < 0) return 0;
  return Math.floor(offset as number);
}

export function normalizeDiscoveryQuery(query: DiscoveryQuery): DiscoveryQuery {
  return {
    ...query,
    city: normalizeCity(query.city),
    category: normalizeCategory(query.category),
    cuisine: normalizeSlug(query.cuisine),
    features: normalizeFeatures(query.features),
    limit: clampLimit(query.limit),
    offset: clampOffset(query.offset),
  };
}

/** Distância euclidiana aproximada (Haversine leve) em km. */
export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
