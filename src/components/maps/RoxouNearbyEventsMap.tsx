import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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
  transport_reservation_enabled?: boolean;
}

interface Props {
  userLocation?: LatLng | null;
  events: NearbyEvent[];
  height?: number | string;
  showCTAs?: boolean;
  heatmap?: boolean;
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
  html: `<div style="width:24px;height:30px;filter:drop-shadow(0 0 6px rgba(168,85,247,0.85));">
    <svg viewBox="0 0 24 32" width="24" height="30" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 8.4 12 20 12 20s12-11.6 12-20C24 5.4 18.6 0 12 0z" fill="#a855f7"/>
      <circle cx="12" cy="12" r="4.5" fill="#1a1025"/>
    </svg></div>`,
  className: "roxou-leaflet-pin",
  iconSize: [24, 30], iconAnchor: [12, 28], popupAnchor: [0, -26],
});

const USER_ICON = L.divIcon({
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#22c55e;border:3px solid #1a1025;box-shadow:0 0 10px rgba(34,197,94,0.8);"></div>`,
  className: "roxou-leaflet-user",
  iconSize: [20, 20], iconAnchor: [10, 10],
});

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
  userLocation, events, height = 360, showCTAs = true, heatmap = false, selectionMode = false, onMapClick,
}: Props) {
  const navigate = useNavigate();

  const allPoints = useMemo<LatLng[]>(() => {
    const pts: LatLng[] = events.map(e => ({ lat: e.lat, lng: e.lng }));
    if (userLocation) pts.push(userLocation);
    return pts;
  }, [events, userLocation]);

  const center: LatLng = userLocation || (events[0] ? { lat: events[0].lat, lng: events[0].lng } : { lat: -22.1207, lng: -51.3889 });

  // Simple heat: cluster proximity via grid
  const heatCircles = useMemo(() => {
    if (!heatmap) return [];
    const grid = new Map<string, { lat: number; lng: number; n: number }>();
    for (const e of events) {
      const key = `${e.lat.toFixed(2)}_${e.lng.toFixed(2)}`;
      const g = grid.get(key);
      if (g) { g.n += 1; g.lat = (g.lat + e.lat) / 2; g.lng = (g.lng + e.lng) / 2; }
      else grid.set(key, { lat: e.lat, lng: e.lng, n: 1 });
    }
    return Array.from(grid.values());
  }, [heatmap, events]);

  return (
    <div style={{ height, borderRadius: 12, overflow: "hidden", border: "1px solid hsl(var(--border))" }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={13}
        style={{ width: "100%", height: "100%", background: "#1a1025" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitAll points={allPoints} />
        {selectionMode && onMapClick && <ClickHandler onClick={onMapClick} />}

        {heatCircles.map((c, i) => (
          <Circle
            key={`h-${i}`}
            center={[c.lat, c.lng]}
            radius={300 + c.n * 250}
            pathOptions={{
              color: "#a855f7", weight: 0,
              fillColor: "#a855f7", fillOpacity: Math.min(0.45, 0.12 + c.n * 0.08),
            }}
          />
        ))}

        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={USER_ICON}>
            <Popup>Você está aqui</Popup>
          </Marker>
        )}

        {events.map((e) => {
          const dist = userLocation ? haversineKm(userLocation, { lat: e.lat, lng: e.lng }) : null;
          return (
            <Marker key={e.id} position={[e.lat, e.lng]} icon={EVENT_ICON}>
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <strong style={{ fontSize: 13 }}>{e.title}</strong>
                  {e.venue_name && <div style={{ fontSize: 11, color: "#666" }}>{e.venue_name}</div>}
                  <div style={{ fontSize: 11, color: "#666" }}>
                    {new Date(e.date_time).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </div>
                  {dist != null && (
                    <div style={{ fontSize: 11, color: "#a855f7", fontWeight: 600, marginTop: 4 }}>
                      {dist.toFixed(1)} km de você
                    </div>
                  )}
                  {showCTAs && (
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <button
                        onClick={() => navigate(e.slug ? `/evento/${e.slug}` : `/evento/${e.id}`)}
                        style={{ flex: 1, padding: "6px 8px", borderRadius: 8, background: "#a855f7", color: "#fff", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer" }}
                      >Ver evento</button>
                      <button
                        onClick={() => navigate(`/pedir-carona?eventId=${e.id}`)}
                        style={{ flex: 1, padding: "6px 8px", borderRadius: 8, background: "transparent", color: "#a855f7", border: "1px solid #a855f7", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                      >Pedir carona</button>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
