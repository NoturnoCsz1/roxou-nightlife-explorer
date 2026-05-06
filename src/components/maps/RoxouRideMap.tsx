import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface LatLng {
  lat: number;
  lng: number;
}

interface RoxouRideMapProps {
  originCoords?: LatLng | null;
  destinationCoords?: LatLng | null;
  onOriginChange?: (c: LatLng) => void;
  destinationLabel?: string;
  originLabel?: string;
  height?: number | string;
  className?: string;
}

// Inline SVG pin icons (no external assets)
function svgIcon(color: string, glow: string) {
  const html = `
    <div style="
      width:28px;height:36px;position:relative;
      filter: drop-shadow(0 0 6px ${glow});
    ">
      <svg viewBox="0 0 24 32" width="28" height="36" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 20 12 20s12-11.6 12-20C24 5.4 18.6 0 12 0z" fill="${color}"/>
        <circle cx="12" cy="12" r="4.5" fill="#1a1025"/>
      </svg>
    </div>`;
  return L.divIcon({
    html,
    className: "roxou-leaflet-pin",
    iconSize: [28, 36],
    iconAnchor: [14, 34],
    popupAnchor: [0, -30],
  });
}

const ORIGIN_ICON = svgIcon("#a855f7", "rgba(168,85,247,0.7)"); // purple/neon
const DEST_ICON = svgIcon("#22c55e", "rgba(34,197,94,0.7)"); // green
const VENUE_ICON = svgIcon("#a855f7", "rgba(168,85,247,0.8)");

function FitBounds({ a, b }: { a?: LatLng | null; b?: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (a && b) {
      const bounds = L.latLngBounds([a.lat, a.lng], [b.lat, b.lng]).pad(0.4);
      map.fitBounds(bounds, { animate: true });
    } else if (a) {
      map.setView([a.lat, a.lng], 15);
    } else if (b) {
      map.setView([b.lat, b.lng], 15);
    }
  }, [a?.lat, a?.lng, b?.lat, b?.lng]); // eslint-disable-line
  return null;
}

export default function RoxouRideMap({
  originCoords,
  destinationCoords,
  onOriginChange,
  destinationLabel = "Destino",
  originLabel = "Sua origem",
  height = 280,
  className,
}: RoxouRideMapProps) {
  const center = useMemo<LatLng>(() => {
    if (originCoords) return originCoords;
    if (destinationCoords) return destinationCoords;
    return { lat: -22.1207, lng: -51.3889 }; // Presidente Prudente fallback
  }, [originCoords, destinationCoords]);

  const originRef = useRef<L.Marker>(null);

  return (
    <div
      className={className}
      style={{
        height,
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid hsl(var(--border))",
      }}
    >
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
        <FitBounds a={originCoords} b={destinationCoords} />
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
          <Marker
            position={[destinationCoords.lat, destinationCoords.lng]}
            icon={DEST_ICON}
          >
            <Popup>{destinationLabel}</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

export { VENUE_ICON };
