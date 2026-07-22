/**
 * Utilitário para extrair lat/lng de uma URL do Google Maps colada manualmente
 * pelo admin. Não faz chamadas de rede e não expõe a chave do Google Maps.
 *
 * O geocoding do admin foi migrado 100% para a Edge Function `geocode-address`
 * (autenticada + admin-only) — as funções `loadGoogleMapsForGeocode`,
 * `geocodeInBrowser` e `geocodeViaNominatim` foram removidas nesta onda para
 * eliminar a exposição da chave do Maps no painel administrativo.
 */

/** Extract lat/lng from a Google Maps URL. */
export function parseMapsUrl(url: string): { lat: number; lng: number } | null {
  if (!url) return null;
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /\/(-?\d+\.\d+),(-?\d+\.\d+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) {
      const lat = parseFloat(m[1]); const lng = parseFloat(m[2]);
      if (isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        return { lat, lng };
      }
    }
  }
  return null;
}
