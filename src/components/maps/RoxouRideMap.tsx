import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair } from "lucide-react";
import { fetchRoute, type RouteResult } from "@/lib/geoUtils";

export interface LatLng { lat: number; lng: number; }

interface RoxouRideMapProps {
  originCoords?: LatLng | null;
  destinationCoords?: LatLng | null;
  onOriginChange?: (c: LatLng) => void;
  onRouteChange?: (route: RouteResult | null) => void;
  destinationLabel?: string;
  originLabel?: string;
  height?: number | string;
  className?: string;
}

function svgIcon(color: string, glow: string) {
  const html = `
    <div style="width:28px;height:36px;position:relative;filter:drop-shadow(0 0 6px ${glow});">
      <svg viewBox="0 0 24 32" width="28" height="36" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 20 12 20s12-11.6 12-20C24 5.4 18.6 0 12 0z" fill="${color}"/>
        <circle cx="12" cy="12" r="4.5" fill="#1a1025"/>
      </svg>
    </div>`;
  return L.divIcon({
    html, className: "roxou-leaflet-pin",
    iconSize: [28, 36], iconAnchor: [14, 34], popupAnchor: [0, -30],
  });
}

const ORIGIN_ICON = svgIcon("#a855f7", "rgba(168,85,247,0.7)");
const DEST_ICON = svgIcon("#22c55e", "rgba(34,197,94,0.7)");
export const VENUE_ICON = svgIcon("#a855f7", "rgba(168,85,247,0.8)");

function FitBounds({ a, b, geometry }: { a?: LatLng | null; b?: LatLng | null; geometry?: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (geometry && geometry.length > 1) {
      map.fitBounds(L.latLngBounds(geometry as any).pad(0.2), { animate: true });
    } else if (a && b) {
      map.fitBounds(L.latLngBounds([a.lat, a.lng], [b.lat, b.lng]).pad(0.4), { animate: true });
    } else if (a) {
      map.setView([a.lat, a.lng], 15);
    } else if (b) {
      map.setView([b.lat, b.lng], 15);
    }
  }, [a?.lat, a?.lng, b?.lat, b?.lng, geometry?.length]); // eslint-disable-line
  return null;
}

function RecenterControl({ target, onMissing }: { target?: LatLng | null; onMissing: () => void }) {
  const map = useMap();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        if (!target) { onMissing(); return; }
        map.setView([target.lat, target.lng], 16, { animate: true });
      }}
      className="absolute right-2 top-2 z-[400] flex items-center gap-1.5 rounded-xl bg-card/90 backdrop-blur-md border border-primary/40 px-3 py-1.5 text-[11px] font-semibold text-primary shadow-[0_0_15px_-5px_hsl(var(--primary)/0.6)]"
      style={{ pointerEvents: "auto" }}
    >
      <Crosshair className="w-3.5 h-3.5" /> Centralizar GPS
    </button>
  );
}

export default function RoxouRideMap({
  originCoords, destinationCoords, onOriginChange, onRouteChange,
  destinationLabel = "Destino", originLabel = "Sua origem",
  height = 280, className,
}: RoxouRideMapProps) {
  const center = useMemo<LatLng>(() => {
    if (originCoords) return originCoords;
    if (destinationCoords) return destinationCoords;
    return { lat: -22.1207, lng: -51.3889 };
  }, [originCoords, destinationCoords]);

  const originRef = useRef<L.Marker>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!originCoords || !destinationCoords) {
      setRoute(null); onRouteChange?.(null); return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    setLoadingRoute(true);
    const ctrl = new AbortController();
    debounceRef.current = window.setTimeout(async () => {
      const r = await fetchRoute(originCoords, destinationCoords, ctrl.signal);
      setRoute(r); onRouteChange?.(r); setLoadingRoute(false);
    }, 800);
    return () => { ctrl.abort(); if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [originCoords?.lat, originCoords?.lng, destinationCoords?.lat, destinationCoords?.lng]); // eslint-disable-line

  const handleMissing = () => {
    if (typeof window !== "undefined") {
      import("sonner").then(({ toast }) => toast.error("Capture sua localização primeiro."));
    }
  };

  return (
    <div className={className} style={{ position: "relative" }}>
      <div style={{ height, borderRadius: 12, overflow: "hidden", border: "1px solid hsl(var(--border))", position: "relative" }}>
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={14}
          style={{ width: "100%", height: "100%", background: "#1a1025" }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds a={originCoords} b={destinationCoords} geometry={route?.geometry} />
          <RecenterControl target={originCoords} onMissing={handleMissing} />
          {route && route.geometry.length > 1 && (
            <Polyline
              positions={route.geometry as any}
              pathOptions={{
                color: route.source === "osrm" ? "#a855f7" : "#a855f7",
                weight: 4,
                opacity: 0.85,
                dashArray: route.source === "fallback" ? "8,8" : undefined,
              }}
            />
          )}
          {originCoords && (
            <Marker
              ref={originRef}
              position={[originCoords.lat, originCoords.lng]}
              icon={ORIGIN_ICON}
              draggable={!!onOriginChange}
              eventHandlers={{
                dragend: () => {
                  const m = originRef.current;
                  if (m && onOriginChange) {
                    const p = m.getLatLng();
                    onOriginChange({ lat: p.lat, lng: p.lng });
                  }
                },
              }}
            >
              <Popup>{originLabel}</Popup>
            </Marker>
          )}
          {destinationCoords && (
            <Marker position={[destinationCoords.lat, destinationCoords.lng]} icon={DEST_ICON}>
              <Popup>{destinationLabel}</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
      {(route || loadingRoute) && (
        <div className="mt-2 flex items-center gap-2 text-[11px]">
          {loadingRoute ? (
            <span className="text-muted-foreground">Calculando rota...</span>
          ) : route ? (
            <>
              <span className="rounded-lg bg-primary/10 border border-primary/30 px-2 py-1 text-primary font-semibold">
                {route.source === "osrm" ? "Distância" : "Aprox."}: {route.distanceKm.toFixed(1)} km
              </span>
              <span className="rounded-lg bg-card/60 border border-border/40 px-2 py-1 text-foreground/80">
                ~{Math.max(1, Math.round(route.durationMin))} min
              </span>
              {route.source === "fallback" && (
                <span className="text-[10px] text-muted-foreground">linha reta</span>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
