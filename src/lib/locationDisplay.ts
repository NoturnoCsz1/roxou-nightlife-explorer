/**
 * locationDisplay — helpers for showing pickup/destination text to users.
 *
 * Coordinates (lat, lng) must NEVER leak to the UI. When the only data we
 * have is a "lat, lng" string, fall back to a friendly label.
 */

const COORD_PAIR = /^\s*-?\d{1,3}(?:\.\d+)?\s*,\s*-?\d{1,3}(?:\.\d+)?\s*$/;
const COORD_TOKEN = /-?\d{1,3}\.\d{3,}/;

export function isCoordinateString(value?: string | null): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (COORD_PAIR.test(trimmed)) return true;
  // strings like "lat: -22.123 lng: -51.456" or "-22.12345"
  if (COORD_TOKEN.test(trimmed) && !/[a-zA-ZÀ-ÿ]/.test(trimmed)) return true;
  return false;
}

export function formatLocation(
  address?: string | null,
  fallbackCity?: string | null,
  fallbackLabel = "Localização informada",
): string {
  const addr = address?.trim();
  if (addr && !isCoordinateString(addr)) return addr;
  const city = fallbackCity?.trim();
  if (city && !isCoordinateString(city)) return city;
  return fallbackLabel;
}
