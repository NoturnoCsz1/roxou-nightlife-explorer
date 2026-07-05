export interface LatLng { lat: number; lng: number; }

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  geometry: [number, number][]; // [lat, lng]
  source: "osrm" | "fallback";
}

const routeCache = new Map<string, RouteResult>();
const cacheKey = (a: LatLng, b: LatLng) =>
  `${a.lat.toFixed(4)},${a.lng.toFixed(4)}|${b.lat.toFixed(4)},${b.lng.toFixed(4)}`;

export async function fetchRoute(origin: LatLng, dest: LatLng, signal?: AbortSignal): Promise<RouteResult> {
  const key = cacheKey(origin, dest);
  const cached = routeCache.get(key);
  if (cached) return cached;

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`;
    const r = await fetch(url, { signal });
    if (!r.ok) throw new Error("osrm fail");
    const j = await r.json();
    const route = j?.routes?.[0];
    if (!route) throw new Error("no route");
    const geometry: [number, number][] = (route.geometry?.coordinates || []).map(
      (c: [number, number]) => [c[1], c[0]]
    );
    const result: RouteResult = {
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
      geometry,
      source: "osrm",
    };
    routeCache.set(key, result);
    return result;
  } catch {
    const distanceKm = haversineKm(origin, dest);
    const result: RouteResult = {
      distanceKm,
      durationMin: (distanceKm / 30) * 60,
      geometry: [
        [origin.lat, origin.lng],
        [dest.lat, dest.lng],
      ],
      source: "fallback",
    };
    return result;
  }
}
