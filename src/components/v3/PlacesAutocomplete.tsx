import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Loader2 } from "lucide-react";

/* ─── Load Google Maps JS SDK once ─── */
let mapsLoadPromise: Promise<void> | null = null;
let mapsApiKey: string | null = null;

async function loadGoogleMaps(): Promise<void> {
  if (window.google?.maps?.places) return;
  if (mapsLoadPromise) return mapsLoadPromise;

  mapsLoadPromise = (async () => {
    if (!mapsApiKey) {
      const { data, error } = await supabase.functions.invoke("maps-key");
      if (error || !data?.key) throw new Error("Failed to load Maps API key");
      mapsApiKey = data.key;
    }
    return new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsApiKey}&libraries=places&language=pt-BR`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Google Maps"));
      document.head.appendChild(script);
    });
  })();
  return mapsLoadPromise;
}

declare global {
  interface Window {
    google: any;
  }
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

export default function PlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Buscar endereço...",
  label,
  required,
  showMap = false,
}: PlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const autocompleteRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const initMap = useCallback((lat: number, lng: number) => {
    if (!mapRef.current || !window.google?.maps) return;
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat, lng },
        zoom: 15,
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          { elementType: "geometry", stylers: [{ color: "#1a1025" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#1a1025" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#746b8a" }] },
          { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a2040" }] },
          { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9e94af" }] },
          { featureType: "water", elementType: "geometry", stylers: [{ color: "#140e1e" }] },
          { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
        ],
      });
      markerRef.current = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapInstanceRef.current,
      });
    } else {
      const pos = { lat, lng };
      mapInstanceRef.current.panTo(pos);
      markerRef.current?.setPosition(pos);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !inputRef.current) return;
        setLoading(false);

        autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: "br" },
          fields: ["formatted_address", "geometry", "name"],
        });

        autocompleteRef.current.addListener("place_changed", () => {
          const place = autocompleteRef.current.getPlace();
          if (!place?.geometry) return;
          const addr = place.formatted_address || place.name || "";
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          onChange(addr);
          setCoords({ lat, lng });
          onPlaceSelect?.({ address: addr, lat, lng });
          if (showMap) initMap(lat, lng);
        });
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [onChange, onPlaceSelect, showMap, initMap]);

  // Update map when coords change externally
  useEffect(() => {
    if (showMap && coords) initMap(coords.lat, coords.lng);
  }, [showMap, coords, initMap]);

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5" /> {label} {required && "*"}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={loading ? "Carregando mapa..." : placeholder}
          disabled={loading}
          required={required}
          className="w-full h-11 rounded-xl bg-card border border-border/40 px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition disabled:opacity-50"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}
      </div>
      {showMap && (
        <div
          ref={mapRef}
          className={`w-full rounded-xl overflow-hidden border border-border/40 transition-all ${
            coords ? "h-[180px] opacity-100" : "h-0 opacity-0"
          }`}
        />
      )}
    </div>
  );
}
