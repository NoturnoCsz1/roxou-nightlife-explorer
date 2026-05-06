import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Props {
  lat: number;
  lng: number;
  name?: string | null;
  address?: string | null;
  height?: number | string;
  className?: string;
  zoom?: number;
}

const VENUE_ICON = L.divIcon({
  html: `<div style="width:28px;height:36px;filter:drop-shadow(0 0 8px rgba(168,85,247,0.85));">
    <svg viewBox="0 0 24 32" width="28" height="36" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 20 12 20s12-11.6 12-20C24 5.4 18.6 0 12 0z" fill="#a855f7"/>
      <circle cx="12" cy="12" r="4.5" fill="#1a1025"/>
    </svg></div>`,
  className: "roxou-leaflet-pin",
  iconSize: [28, 36],
  iconAnchor: [14, 34],
  popupAnchor: [0, -30],
});

export default function RoxouVenueMap({
  lat, lng, name, address, height = 260, className, zoom = 16,
}: Props) {
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
        center={[lat, lng]}
        zoom={zoom}
        style={{ width: "100%", height: "100%", background: "#1a1025" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={VENUE_ICON}>
          {(name || address) && (
            <Popup>
              {name && <strong>{name}</strong>}
              {address && <div style={{ fontSize: 12 }}>{address}</div>}
            </Popup>
          )}
        </Marker>
      </MapContainer>
    </div>
  );
}
