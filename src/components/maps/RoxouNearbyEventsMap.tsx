import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { useNavigate } from "react-router-dom";
import { haversineKm, type LatLng } from "@/lib/geoUtils";

export interface NearbyEvent {
  id: string;
  title: string;
  slug?: string | null;
  venue_name?: string | null;
  date_time: string;
  lat: number;
  lng: number;
  category?: string | null;
  sub_category?: string | null;
  image_url?: string | null;
  transport_reservation_enabled?: boolean;
}

interface Props {
  userLocation?: LatLng | null;
  events: NearbyEvent[];
  height?: number | string;
  showCTAs?: boolean;
  heatmap?: boolean; // legacy, ignored — clusters are used now
  selectionMode?: boolean;
  onMapClick?: (loc: LatLng) => void;
}

function ClickHandler({ onClick }: { onClick: (loc: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

const EVENT_ICON = L.divIcon({
  html: `<div style="position:relative;width:30px;height:38px;filter:drop-shadow(0 0 8px rgba(168,85,247,0.95));">
    <svg viewBox="0 0 24 32" width="30" height="38" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c084fc"/>
        <stop offset="100%" stop-color="#7c3aed"/>
      </linearGradient></defs>
      <path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 20 12 20s12-11.6 12-20C24 5.4 18.6 0 12 0z" fill="url(#g)"/>
      <circle cx="12" cy="12" r="4.5" fill="#1a1025"/>
      <circle cx="12" cy="12" r="2" fill="#fff"/>
    </svg></div>`,
  className: "roxou-leaflet-pin",
  iconSize: [30, 38], iconAnchor: [15, 36], popupAnchor: [0, -32],
});

const USER_ICON = L.divIcon({
  html: `<div style="position:relative;width:22px;height:22px;">
    <div style="position:absolute;inset:-8px;border-radius:50%;background:rgba(34,197,94,0.25);animation:roxouPulse 2s ease-out infinite;"></div>
    <div style="position:absolute;inset:0;border-radius:50%;background:#22c55e;border:3px solid #0f0518;box-shadow:0 0 12px rgba(34,197,94,0.9);"></div>
    <style>@keyframes roxouPulse{0%{transform:scale(0.6);opacity:.9}100%{transform:scale(1.8);opacity:0}}</style>
  </div>`,
  className: "roxou-leaflet-user",
  iconSize: [22, 22], iconAnchor: [11, 11],
});

function clusterIconCreate(cluster: any) {
  const n = cluster.getChildCount();
  const size = n < 10 ? 38 : n < 50 ? 46 : 54;
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;
      background:radial-gradient(circle at 30% 30%, #c084fc, #7c3aed 70%);
      color:#fff;display:flex;align-items:center;justify-content:center;
      font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:${n < 100 ? 14 : 12}px;
      border:2px solid rgba(255,255,255,0.25);
      box-shadow:0 0 16px rgba(168,85,247,0.85), inset 0 0 12px rgba(255,255,255,0.15);">
      ${n}</div>`,
    className: "roxou-cluster",
    iconSize: [size, size],
  });
}

function FitAll({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
      return;
    }
    map.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lng]) as any).pad(0.25), { animate: true });
  }, [points.length]); // eslint-disable-line
  return null;
}

export default function RoxouNearbyEventsMap({
  userLocation, events, height = 420, showCTAs = true, selectionMode = false, onMapClick,
}: Props) {
  const navigate = useNavigate();

  const allPoints = useMemo<LatLng[]>(() => {
    const pts: LatLng[] = events.map(e => ({ lat: e.lat, lng: e.lng }));
    if (userLocation) pts.push(userLocation);
    return pts;
  }, [events, userLocation]);

  const center: LatLng = userLocation || (events[0] ? { lat: events[0].lat, lng: events[0].lng } : { lat: -22.1207, lng: -51.3889 });

  return (
    <div style={{ height, borderRadius: 16, overflow: "hidden", border: "1px solid hsl(var(--border))" }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={13}
        style={{ width: "100%", height: "100%", background: "#0f0518" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap, &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <FitAll points={allPoints} />
        {selectionMode && onMapClick && <ClickHandler onClick={onMapClick} />}

        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={USER_ICON}>
            <Popup>Você está aqui</Popup>
          </Marker>
        )}

        <MarkerClusterGroup
          chunkedLoading
          showCoverageOnHover={false}
          spiderfyOnMaxZoom
          maxClusterRadius={55}
          iconCreateFunction={clusterIconCreate}
        >
          {events.map((e) => {
            const dist = userLocation ? haversineKm(userLocation, { lat: e.lat, lng: e.lng }) : null;
            return (
              <Marker key={e.id} position={[e.lat, e.lng]} icon={EVENT_ICON}>
                <Popup maxWidth={260} minWidth={220}>
                  <div style={{ minWidth: 200, fontFamily: "Inter, sans-serif" }}>
                    {e.image_url && (
                      <div style={{ width: "100%", height: 110, borderRadius: 10, overflow: "hidden", marginBottom: 8, background: "#1a1025" }}>
                        <img src={e.image_url} alt={e.title} loading="lazy"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    )}
                    <strong style={{ fontSize: 14, color: "#1a1025", display: "block", lineHeight: 1.2 }}>{e.title}</strong>
                    {e.venue_name && <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{e.venue_name}</div>}
                    <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                      {new Date(e.date_time).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </div>
                    {dist != null && (
                      <div style={{ fontSize: 11, color: "#7c3aed", fontWeight: 700, marginTop: 6 }}>
                        📍 {dist.toFixed(1)} km de você
                      </div>
                    )}
                    {showCTAs && (
                      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                        <button
                          onClick={() => navigate(e.slug ? `/evento/${e.slug}` : `/evento/${e.id}`)}
                          style={{ flex: 1, padding: "8px 8px", borderRadius: 10, background: "linear-gradient(135deg,#a855f7,#7c3aed)", color: "#fff", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer" }}
                        >Ver local</button>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lng}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ flex: 1, padding: "8px 8px", borderRadius: 10, background: "transparent", color: "#7c3aed", border: "1px solid #7c3aed", fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "center", textDecoration: "none" }}
                        >Como chegar</a>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
