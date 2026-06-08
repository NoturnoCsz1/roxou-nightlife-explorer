import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Crosshair, Calendar, Navigation, AlertTriangle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import RoxouNearbyEventsMap, { type NearbyEvent } from "@/components/maps/RoxouNearbyEventsMap";
import { haversineKm, type LatLng } from "@/lib/geoUtils";
import SEO from "@/components/SEO";

// Apenas referência visual quando GPS ainda não foi confirmado.
const PP_REFERENCE: LatLng = { lat: -22.1207, lng: -51.3889 };
const ACCURACY_THRESHOLD_M = 1000;
const STORAGE_KEY = "roxou:manualLocation";

export default function PertoDeMim() {
  const navigate = useNavigate();
  const [gpsLocation, setGpsLocation] = useState<LatLng | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [manualLocation, setManualLocation] = useState<LatLng | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.lat === "number" && typeof parsed?.lng === "number") return parsed;
    } catch {}
    return null;
  });
  const [selectionMode, setSelectionMode] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [events, setEvents] = useState<NearbyEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // GPS só é "real" se accuracy <= ACCURACY_THRESHOLD_M.
  const gpsIsAccurate = gpsLocation != null && gpsAccuracy != null && gpsAccuracy <= ACCURACY_THRESHOLD_M;
  // Manual sempre vence se existir; senão só GPS preciso.
  const realLocation: LatLng | null = manualLocation || (gpsIsAccurate ? gpsLocation : null);
  const isUsingFallback = !realLocation;

  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocalização não suportada neste navegador.");
      return;
    }
    setRequesting(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        // eslint-disable-next-line no-console
        console.log("[PertoDeMim] geo success", { latitude, longitude, accuracy });
        setGpsLocation({ lat: latitude, lng: longitude });
        setGpsAccuracy(accuracy);
        setRequesting(false);
        if (accuracy > ACCURACY_THRESHOLD_M) {
          toast.warning(`GPS impreciso (±${Math.round(accuracy)}m). Escolha sua localização manualmente.`);
        }
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.warn("[PertoDeMim] geo error", { code: err.code, message: err.message });
        setGeoError("Não conseguimos acessar sua localização. Ative o GPS ou escolha manualmente no mapa.");
        setRequesting(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (!manualLocation) requestGeolocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const now = new Date().toISOString();
      const { data: evts } = await supabase
        .from("events")
        .select("id,title,slug,venue_name,date_time,latitude,longitude,partner_id,status,transport_reservation_enabled")
        .eq("status", "published")
        .gt("date_time", now)
        .order("date_time", { ascending: true })
        .limit(150);

      const list = evts || [];
      const partnerIds = [
        ...new Set(
          list.filter((e) => e.partner_id && (e.latitude == null || e.longitude == null)).map((e) => e.partner_id!)
        ),
      ];
      const partnerMap: Record<string, { lat: number | null; lng: number | null }> = {};
      if (partnerIds.length > 0) {
        const { data: ps } = await supabase.from("partners").select("id,latitude,longitude").in("id", partnerIds);
        (ps || []).forEach((p) => {
          partnerMap[p.id] = { lat: (p as any).latitude, lng: (p as any).longitude };
        });
      }

      const mapped: NearbyEvent[] = list
        .map((e) => {
          const lat = e.latitude ?? (e.partner_id ? partnerMap[e.partner_id]?.lat : null);
          const lng = e.longitude ?? (e.partner_id ? partnerMap[e.partner_id]?.lng : null);
          if (lat == null || lng == null) return null;
          return {
            id: e.id, title: e.title, slug: e.slug, venue_name: e.venue_name,
            date_time: e.date_time, lat, lng,
            transport_reservation_enabled: Boolean((e as any).transport_reservation_enabled),
          } as NearbyEvent;
        })
        .filter(Boolean) as NearbyEvent[];

      setEvents(mapped);
      setLoading(false);
    })();
  }, []);

  const sorted = realLocation
    ? [...events]
        .map((e) => ({ e, d: haversineKm(realLocation, { lat: e.lat, lng: e.lng }) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 30)
    : events.slice(0, 30).map((e) => ({ e, d: null as number | null }));

  const handleMapClick = (loc: LatLng) => {
    setManualLocation(loc);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(loc)); } catch {}
    setSelectionMode(false);
    toast.success("Localização manual definida.");
  };

  const clearManualLocation = () => {
    setManualLocation(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    toast.info("Localização manual removida.");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEO
        title="Rolês perto de você | ROXOU"
        description="Encontre eventos, festas e shows próximos da sua localização."
        canonical="https://roxou.com.br/perto-de-mim"
      />

      <header className="sticky top-0 z-40 glass border-b border-border/30">
        <div className="mx-auto max-w-md px-4 py-3 flex items-center gap-3">
          <Link to="/" className="p-2 -ml-2 rounded-xl hover:bg-card">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="font-display font-bold text-lg">Rolês perto de você</h1>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {manualLocation ? "Localização manual" : gpsIsAccurate ? "Sua localização (GPS)" : "Localização não confirmada"}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-4 space-y-4">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-12">Carregando rolês...</p>
        ) : (
          <>
            {selectionMode && (
              <div className="rounded-2xl border border-primary/40 bg-primary/10 p-3 text-[12px] text-foreground flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                <p>Toque no mapa para marcar sua localização.</p>
              </div>
            )}

            {isUsingFallback && !selectionMode && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-[12px] text-amber-100 flex gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  {gpsLocation && !gpsIsAccurate
                    ? `Sua localização está muito imprecisa (±${Math.round(gpsAccuracy!)}m). Ative o GPS do celular ou escolha sua localização manualmente no mapa.`
                    : "Mapa centralizado em Presidente Prudente apenas como referência. Confirme sua localização para ver eventos próximos."}
                </p>
              </div>
            )}

            {geoError && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-[12px] text-destructive-foreground">
                {geoError}
              </div>
            )}

            <RoxouNearbyEventsMap
              userLocation={realLocation}
              events={sorted.map((s) => s.e)}
              height={340}
              heatmap
              selectionMode={selectionMode}
              onMapClick={handleMapClick}
            />

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="rounded-xl gap-2"
                disabled={requesting}
                onClick={requestGeolocation}
              >
                <Crosshair className="w-4 h-4" />
                {requesting ? "Buscando..." : "Usar minha localização"}
              </Button>
              <Button
                variant={selectionMode ? "default" : "outline"}
                className="rounded-xl gap-2"
                onClick={() => setSelectionMode((v) => !v)}
              >
                <MapPin className="w-4 h-4" />
                {selectionMode ? "Cancelar" : "Escolher no mapa"}
              </Button>
            </div>

            {manualLocation && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full rounded-xl gap-2 text-xs text-muted-foreground"
                onClick={clearManualLocation}
              >
                <X className="w-3.5 h-3.5" /> Limpar localização manual
              </Button>
            )}

            <section className="space-y-2">
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5 mt-2">
                <Calendar className="w-3.5 h-3.5" /> Próximos {sorted.length} rolês
              </h2>
              {sorted.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">Nenhum evento com localização cadastrada.</p>
              )}
              {sorted.map(({ e, d }) => (
                <div key={e.id} className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-md p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-display font-bold text-sm truncate">{e.title}</p>
                      {e.venue_name && <p className="text-[11px] text-muted-foreground truncate">{e.venue_name}</p>}
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(e.date_time).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>
                    {d != null && (
                      <span className="text-[10px] rounded-lg bg-primary/10 border border-primary/30 px-2 py-1 text-primary font-semibold whitespace-nowrap">
                        {d.toFixed(1)} km
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      className="rounded-lg text-[11px] h-8"
                      onClick={() => navigate(e.slug ? `/evento/${e.slug}` : `/evento/${e.id}`)}
                    >
                      Ver
                    </Button>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-border/40 text-[11px] font-medium h-8 hover:border-primary/40"
                    >
                      <Navigation className="w-3 h-3" /> Ir
                    </a>
                  </div>
                </div>
              ))}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
