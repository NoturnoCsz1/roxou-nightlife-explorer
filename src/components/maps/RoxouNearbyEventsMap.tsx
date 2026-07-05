import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import "leaflet.heat";
import { useNavigate, type NavigateFunction } from "react-router-dom";
import { haversineKm, type LatLng } from "@/shared/utils/geoUtils";

function HeatLayer({ points }: { points: Array<[number, number, number]> }) {
  const map = useMap();
  useEffect(() => {
    const layer = (L as any).heatLayer(points, {

      radius: 32,
      blur: 24,
      maxZoom: 16,
      minOpacity: 0.35,
      gradient: { 0.2: "#7c3aed", 0.4: "#a855f7", 0.6: "#ec4899", 0.8: "#f97316", 1.0: "#fde047" },
    });
    layer.addTo(map);
    return () => { layer.remove(); };
  }, [map, points]);
  return null;
}


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
  partner_id?: string | null;
  is_sports_transmission?: boolean;
  score?: number;
  heat?: number; // 0..1 contribution weight for heat layer
  badges?: string[];
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
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function buildPopupHtml(e: NearbyEvent, userLocation: LatLng | null | undefined, showCTAs: boolean): string {
  const dist = userLocation ? haversineKm(userLocation, { lat: e.lat, lng: e.lng }) : null;
  const dateStr = new Date(e.date_time).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  const target = e.slug ? `/evento/${e.slug}` : `/evento/${e.id}`;
  return `
    <div style="min-width:200px;font-family:Inter,sans-serif">
      ${e.image_url ? `<div style="width:100%;height:110px;border-radius:10px;overflow:hidden;margin-bottom:8px;background:#1a1025"><img src="${escapeHtml(e.image_url)}" alt="${escapeHtml(e.title)}" loading="lazy" style="width:100%;height:100%;object-fit:cover" /></div>` : ""}
      <strong style="font-size:14px;color:#1a1025;display:block;line-height:1.2">${escapeHtml(e.title)}</strong>
      ${e.venue_name ? `<div style="font-size:11px;color:#555;margin-top:2px">${escapeHtml(e.venue_name)}</div>` : ""}
      <div style="font-size:11px;color:#888;margin-top:2px">${escapeHtml(dateStr)}</div>
      ${e.badges && e.badges.length ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">${e.badges.map(b => `<span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:999px;background:linear-gradient(135deg,#a855f7,#ec4899);color:#fff">${escapeHtml(b)}</span>`).join("")}</div>` : ""}
      ${dist != null ? `<div style="font-size:11px;color:#7c3aed;font-weight:700;margin-top:6px">📍 ${dist.toFixed(1)} km de você</div>` : ""}
      ${showCTAs ? `<div style="display:flex;gap:6px;margin-top:10px">
        <button data-roxou-nav="${escapeHtml(target)}" style="flex:1;padding:8px;border-radius:10px;background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;font-size:12px;font-weight:700;border:none;cursor:pointer">Ver local</button>
        <a href="https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lng}" target="_blank" rel="noopener noreferrer" style="flex:1;padding:8px;border-radius:10px;background:transparent;color:#7c3aed;border:1px solid #7c3aed;font-size:12px;font-weight:700;cursor:pointer;text-align:center;text-decoration:none">Como chegar</a>
      </div>` : ""}
    </div>`;
}

function ClusterLayer({
  events, userLocation, showCTAs, navigate,
}: { events: NearbyEvent[]; userLocation?: LatLng | null; showCTAs: boolean; navigate: NavigateFunction }) {
  const map = useMap();
  useEffect(() => {
    const group = (L as any).markerClusterGroup({
      chunkedLoading: true,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 55,
      iconCreateFunction: clusterIconCreate,
    });
    events.forEach((e) => {
      const m = L.marker([e.lat, e.lng], { icon: EVENT_ICON });
      m.bindPopup(buildPopupHtml(e, userLocation, showCTAs), { maxWidth: 260, minWidth: 220 });
      m.on("popupopen", (ev: any) => {
        const node: HTMLElement = ev.popup.getElement();
        if (!node) return;
        const btn = node.querySelector<HTMLButtonElement>("button[data-roxou-nav]");
        if (btn) {
          btn.onclick = () => {
            const to = btn.getAttribute("data-roxou-nav");
            if (to) navigate(to);
          };
        }
      });
      group.addLayer(m);
    });
    map.addLayer(group);
    return () => { map.removeLayer(group); };
  }, [map, events, userLocation, showCTAs, navigate]);
  return null;
}


export default function RoxouNearbyEventsMap({
  userLocation, events, height = 420, showCTAs = true, heatmap = false, selectionMode = false, onMapClick,
}: Props) {
  const navigate = useNavigate();

  const allPoints = useMemo<LatLng[]>(() => {
    const pts: LatLng[] = events.map(e => ({ lat: e.lat, lng: e.lng }));
    if (userLocation) pts.push(userLocation);
    return pts;
  }, [events, userLocation]);

  const heatPoints = useMemo<Array<[number, number, number]>>(() => {
    return events.map((e) => [e.lat, e.lng, Math.max(0.2, Math.min(1, e.heat ?? 0.4))]);
  }, [events]);

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

        {heatmap && heatPoints.length > 0 && <HeatLayer points={heatPoints} />}

        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={USER_ICON}>
            <Popup>Você está aqui</Popup>
          </Marker>
        )}


        <ClusterLayer
          events={events}
          userLocation={userLocation}
          showCTAs={showCTAs}
          navigate={navigate}
        />

      </MapContainer>
    </div>
  );
}
