import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Loader2 } from "lucide-react";

/* ─── Load Google Maps JS SDK once ─── */
let mapsLoadPromise: Promise<void> | null = null;
let mapsApiKey: string | null = null;

async function loadGoogleMaps(): Promise<void> {
  if (window.google?.maps) return;
  if (mapsLoadPromise) return mapsLoadPromise;

  mapsLoadPromise = (async () => {
    if (!mapsApiKey) {
      const { data, error } = await supabase.functions.invoke("maps-key");
      if (error || !data?.key) throw new Error("Failed to load Maps API key");
      mapsApiKey = data.key;
    }
    return new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsApiKey}&libraries=places&language=pt-BR&loading=async`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Google Maps"));
      document.head.appendChild(script);
    });
  })();
  return mapsLoadPromise;
}

declare global {
  interface Window { google: any; }
}

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: { address: string; lat: number; lng: number }) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  showMap?: boolean;
}

const MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#1a1025" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1025" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746b8a" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a2040" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9e94af" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#140e1e" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
];

interface Suggestion {
  placePrediction: any;
  mainText: string;
  secondaryText: string;
}

export default function PlacesAutocomplete({
  value, onChange, onPlaceSelect,
  placeholder = "Buscar endereço...",
  label, required, showMap = false,
}: PlacesAutocompleteProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const sessionTokenRef = useRef<any>(null);
  const debounceRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const initMap = useCallback((lat: number, lng: number) => {
    if (!mapRef.current || !window.google?.maps) return;
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat, lng }, zoom: 15,
        disableDefaultUI: true, zoomControl: true, styles: MAP_STYLES,
      });
      markerRef.current = new window.google.maps.Marker({ position: { lat, lng }, map: mapInstanceRef.current });
    } else {
      mapInstanceRef.current.panTo({ lat, lng });
      markerRef.current?.setPosition({ lat, lng });
    }
  }, []);

  // Load SDK
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then(async () => {
      if (cancelled) return;
      // Import places library
      await window.google.maps.importLibrary("places");
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
      setReady(true);
      setLoading(false);
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Fetch suggestions using new API
  const fetchSuggestions = useCallback(async (input: string) => {
    if (!ready || !input.trim() || input.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const { AutocompleteSuggestion } = window.google.maps.places;
      const { suggestions: results } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        includedRegionCodes: ["br"],
        sessionToken: sessionTokenRef.current,
      });

      const mapped: Suggestion[] = results
        .filter((s: any) => s.placePrediction)
        .map((s: any) => ({
          placePrediction: s.placePrediction,
          mainText: s.placePrediction.mainText?.text || s.placePrediction.text?.text || input,
          secondaryText: s.placePrediction.secondaryText?.text || "",
        }));

      setSuggestions(mapped);
      setShowSuggestions(mapped.length > 0);
    } catch (err) {
      console.error("Places suggestions error:", err);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [ready]);

  const handleInputChange = useCallback((val: string) => {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  }, [onChange, fetchSuggestions]);

  const handleSelect = useCallback(async (suggestion: Suggestion) => {
    setShowSuggestions(false);
    const fullText = `${suggestion.mainText}${suggestion.secondaryText ? `, ${suggestion.secondaryText}` : ""}`;
    onChange(fullText);

    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({ fields: ["location", "formattedAddress"] });
      // Refresh session token
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();

      const loc = place.location;
      if (loc) {
        const lat = loc.lat();
        const lng = loc.lng();
        const addr = place.formattedAddress || fullText;
        onChange(addr);
        setCoords({ lat, lng });
        onPlaceSelect?.({ address: addr, lat, lng });
        if (showMap) initMap(lat, lng);
      }
    } catch (err) {
      console.error("Place details error:", err);
    }
  }, [onChange, onPlaceSelect, showMap, initMap]);

  useEffect(() => {
    if (showMap && coords) initMap(coords.lat, coords.lng);
  }, [showMap, coords, initMap]);

  // Close on outside click
  useEffect(() => {
    const handler = () => setShowSuggestions(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
      {label && (
        <label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" /> {label} {required && "*"}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
          placeholder={loading ? "Carregando mapa..." : placeholder}
          disabled={loading}
          required={required}
          autoComplete="off"
          className="w-full h-11 rounded-xl bg-card border border-border/40 px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition disabled:opacity-50"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-xl bg-card border border-border/60 shadow-2xl overflow-hidden max-h-[220px] overflow-y-auto">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(s)}
                className="w-full text-left px-3 py-2.5 text-sm text-foreground hover:bg-secondary/60 transition-colors flex items-start gap-2 border-b border-border/20 last:border-0"
              >
                <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{s.mainText}</p>
                  {s.secondaryText && <p className="text-[10px] text-muted-foreground truncate">{s.secondaryText}</p>}
                </div>
              </button>
            ))}
            <div className="px-3 py-1.5 text-[9px] text-muted-foreground/50 text-right">
              Powered by Google
            </div>
          </div>
        )}
      </div>
      {showMap && (
        <div
          ref={mapRef}
          className={`w-full rounded-xl overflow-hidden border border-border/40 transition-all duration-300 ${
            coords ? "h-[180px] opacity-100" : "h-0 opacity-0"
          }`}
        />
      )}
    </div>
  );
}
