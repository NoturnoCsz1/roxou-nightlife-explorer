/* eslint-disable @typescript-eslint/no-explicit-any -- API global window.google sem typings */
/**
 * Geocoding helpers (Google Maps SDK + Nominatim fallback) + parser de URL Maps.
 * Extraído de src/pages/admin/EstabelecimentosAudit.tsx — Fase 3A.
 * Comportamento idêntico ao original.
 */
import { supabase } from "@/integrations/supabase/client";

let mapsLoadPromise: Promise<void> | null = null;
let mapsApiKey: string | null = null;

export async function loadGoogleMapsForGeocode(): Promise<void> {
  if ((window as any).google?.maps?.Geocoder) return;
  if (mapsLoadPromise) return mapsLoadPromise;
  mapsLoadPromise = (async () => {
    if (!mapsApiKey) {
      const { data, error } = await supabase.functions.invoke("maps-key");
      if (error || !data?.key) throw new Error("Falha ao carregar Google Maps");
      mapsApiKey = data.key;
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-roxou-gmaps="1"]');
    if (!existing) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsApiKey}&libraries=places&language=pt-BR&loading=async`;
        script.async = true;
        script.defer = true;
        script.dataset.roxouGmaps = "1";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Falha ao carregar Google Maps"));
        document.head.appendChild(script);
      });
    }
    const start = Date.now();
    while (!(window as any).google?.maps?.Geocoder) {
      if (Date.now() - start > 8000) throw new Error("Google Maps não carregado");
      const g = (window as any).google;
      if (g?.maps?.importLibrary) {
        try { await g.maps.importLibrary("geocoding"); break; } catch (_) { /* poll */ }
      }
      await new Promise(r => setTimeout(r, 100));
    }
  })();
  return mapsLoadPromise;
}

export async function geocodeViaNominatim(candidates: string[]) {
  for (const q of candidates) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { "Accept-Language": "pt-BR" } });
      if (!res.ok) continue;
      const arr = await res.json();
      const first = Array.isArray(arr) ? arr[0] : null;
      if (first?.lat && first?.lon) {
        return {
          latitude: parseFloat(first.lat),
          longitude: parseFloat(first.lon),
          formatted_address: first.display_name || q,
          place_id: null as string | null,
        };
      }
    } catch (_) { /* try next */ }
  }
  return null;
}

export async function geocodeInBrowser(candidates: string[]) {
  try {
    await loadGoogleMapsForGeocode();
    const g = (window as any).google;
    if (!g?.maps?.Geocoder) throw new Error("Google Maps não carregado");
    const geocoder = new g.maps.Geocoder();
    for (const address of candidates) {
      try {
        const response = await geocoder.geocode({ address, region: "BR", componentRestrictions: { country: "BR" } });
        const result = response.results?.[0];
        const loc = result?.geometry?.location;
        if (loc) {
          return {
            latitude: loc.lat(),
            longitude: loc.lng(),
            formatted_address: result.formatted_address || address,
            place_id: result.place_id || null,
          };
        }
      } catch (_) { /* try next candidate */ }
    }
  } catch (_) {
    // SDK failed — fall through to Nominatim
  }
  return await geocodeViaNominatim(candidates);
}

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
