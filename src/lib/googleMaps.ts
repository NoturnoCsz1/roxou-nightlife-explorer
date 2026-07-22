/**
 * Shared Google Maps JS SDK loader.
 * - Caches the browser key in memory (one call to `maps-key` per session).
 * - Deduplicates the <script> tag so multiple callers (autocomplete, ride map)
 *   never load the SDK twice.
 * - Loads a superset of libraries (places + geocoding) to avoid a second load
 *   when both callers coexist on the same page.
 *
 * Only used by public/authenticated flows that legitimately need the JS SDK
 * (PlacesAutocomplete, V3RideRequest). Admin geocoding runs server-side via
 * the `geocode-address` Edge Function and MUST NOT use this helper.
 */
import { supabase } from "@/integrations/supabase/client";

const SCRIPT_MARKER = "roxou-gmaps";
const LIBRARIES = "places,geocoding";

let cachedKey: string | null = null;
let keyPromise: Promise<string> | null = null;
let loadPromise: Promise<void> | null = null;

async function fetchBrowserKey(): Promise<string> {
  if (cachedKey) return cachedKey;
  if (keyPromise) return keyPromise;
  keyPromise = (async () => {
    const { data, error } = await supabase.functions.invoke("maps-key");
    if (error || !data?.key) {
      keyPromise = null;
      throw new Error("Failed to load Maps API key");
    }
    cachedKey = data.key as string;
    return cachedKey;
  })();
  return keyPromise;
}

export async function loadGoogleMaps(): Promise<void> {
  // Already loaded (this tab, or another caller).
  const w = window as unknown as { google?: { maps?: unknown } };
  if (w.google?.maps) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const key = await fetchBrowserKey();

    // Reuse existing script tag if present (StrictMode double-mount / HMR).
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-${SCRIPT_MARKER}="1"]`,
    );
    if (!existing) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement("script");
        s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=${LIBRARIES}&language=pt-BR&loading=async`;
        s.async = true;
        s.defer = true;
        s.dataset[SCRIPT_MARKER] = "1";
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Failed to load Google Maps"));
        document.head.appendChild(s);
      });
    }

    // Poll until google.maps is exposed (loading=async delays the global).
    const start = Date.now();
    while (!(window as unknown as { google?: { maps?: unknown } }).google?.maps) {
      if (Date.now() - start > 8000) throw new Error("Google Maps não carregado");
      await new Promise((r) => setTimeout(r, 50));
    }
  })();

  try {
    await loadPromise;
  } catch (err) {
    loadPromise = null;
    throw err;
  }
}
