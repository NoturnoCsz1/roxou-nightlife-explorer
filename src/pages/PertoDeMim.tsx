import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Crosshair, Calendar, Navigation, AlertTriangle, X, RefreshCw, Flame, Map as MapIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchUpcomingEventsForNearby } from "@modules/discovery/events";
import { fetchPartnerCoordsByIds } from "@modules/discovery/venues";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { NearbyEvent } from "@/components/maps/RoxouNearbyEventsMap";
// Lazy: leaflet + markercluster + heat só carregam quando o mapa monta (Fase 7)
const RoxouNearbyEventsMap = lazy(() => import("@/components/maps/RoxouNearbyEventsMap"));
import { haversineKm, type LatLng } from "@/shared/utils/geoUtils";
import SEO from "@/components/SEO";


const ACCURACY_THRESHOLD_M = 1000;
const MANUAL_KEY = "roxou:manualLocation";
const LAST_GPS_KEY = "roxou:lastGps";

interface SavedGps { lat: number; lng: number; accuracy: number; ts: number; }

const QUICK_FILTERS = [
  { key: "all", label: "Todos", emoji: "✨" },
  { key: "bares", label: "Bares", emoji: "🍺", match: ["bar", "boteco", "pub"] },
  { key: "restaurantes", label: "Restaurantes", emoji: "🍔", match: ["restaurante", "gastronomia", "food"] },
  { key: "musica", label: "Música ao vivo", emoji: "🎵", match: ["musica", "música", "show", "live", "sertanejo", "samba", "rock", "pagode", "dj", "eletronica", "eletrônica"] },
  { key: "eventos", label: "Eventos", emoji: "🎉", match: ["festa", "evento", "balada", "festival"] },
  { key: "jogos", label: "Jogos", emoji: "⚽", match: ["jogo", "futebol", "esporte", "transmissao", "transmissão"] },
] as const;

const DISTANCE_OPTIONS = [1, 3, 5, 10, 20] as const;

function readJSON<T>(key: string): T | null {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : null; } catch { return null; }
}

export default function PertoDeMim() {
  const navigate = useNavigate();
  const watchIdRef = useRef<number | null>(null);

  const [gpsLocation, setGpsLocation] = useState<LatLng | null>(() => {
    const saved = readJSON<SavedGps>(LAST_GPS_KEY);
    return saved ? { lat: saved.lat, lng: saved.lng } : null;
  });
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(() => readJSON<SavedGps>(LAST_GPS_KEY)?.accuracy ?? null);
  const [gpsTs, setGpsTs] = useState<number | null>(() => readJSON<SavedGps>(LAST_GPS_KEY)?.ts ?? null);

  const [manualLocation, setManualLocation] = useState<LatLng | null>(() => readJSON<LatLng>(MANUAL_KEY));
  const [selectionMode, setSelectionMode] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  const [events, setEvents] = useState<NearbyEvent[]>([]);
  const [awardPartnerIds, setAwardPartnerIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);


  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [radiusKm, setRadiusKm] = useState<number>(5);

  const gpsIsAccurate = gpsLocation != null && gpsAccuracy != null && gpsAccuracy <= ACCURACY_THRESHOLD_M;
  const realLocation: LatLng | null = manualLocation || (gpsIsAccurate ? gpsLocation : gpsLocation);
  const isUsingFallback = !manualLocation && !gpsIsAccurate;

  // GPS: single high-accuracy read on demand
  const requestGeolocation = (force = false) => {
    if (!navigator.geolocation) {
      setGeoError("Geolocalização não suportada neste navegador.");
      return;
    }
    setRequesting(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsLocation({ lat: latitude, lng: longitude });
        setGpsAccuracy(accuracy);
        const ts = Date.now();
        setGpsTs(ts);
        try { localStorage.setItem(LAST_GPS_KEY, JSON.stringify({ lat: latitude, lng: longitude, accuracy, ts })); } catch {}
        setRequesting(false);
        if (accuracy > ACCURACY_THRESHOLD_M) {
          toast.warning(`GPS impreciso (±${Math.round(accuracy)}m). Tente novamente em área aberta ou escolha manualmente.`);
        } else if (force) {
          toast.success(`Localização atualizada (±${Math.round(accuracy)}m)`);
        }
      },
      (err) => {
        console.warn("[PertoDeMim] geo error", err);
        setGeoError("Não conseguimos acessar sua localização. Ative o GPS ou escolha manualmente no mapa.");
        setRequesting(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: force ? 0 : 30000 }
    );
  };

  // Background watch (battery-friendly)
  useEffect(() => {
    if (manualLocation) return;
    if (!navigator.geolocation || !("watchPosition" in navigator.geolocation)) return;
    requestGeolocation(false);
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        // Only accept updates that improve or roughly match previous accuracy
        setGpsLocation((prev) => {
          if (!prev) return { lat: latitude, lng: longitude };
          const moved = haversineKm(prev, { lat: latitude, lng: longitude }) * 1000;
          if (moved < 15 && gpsAccuracy && accuracy > gpsAccuracy * 1.5) return prev;
          return { lat: latitude, lng: longitude };
        });
        setGpsAccuracy(accuracy);
        const ts = Date.now();
        setGpsTs(ts);
        try { localStorage.setItem(LAST_GPS_KEY, JSON.stringify({ lat: latitude, lng: longitude, accuracy, ts })); } catch {}
      },
      () => {},
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 }
    );
    watchIdRef.current = id;
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualLocation]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [list, awardsRes] = await Promise.all([
        fetchUpcomingEventsForNearby(200),
        supabase
          .from("partner_awards")
          .select("partner_id")
          .eq("active", true),
      ]);

      const awards = awardsRes.data || [];
      setAwardPartnerIds(new Set(awards.map((a: any) => a.partner_id)));

      const partnerIds = [
        ...new Set(
          list.filter((e) => e.partner_id && (e.latitude == null || e.longitude == null)).map((e) => e.partner_id!)
        ),
      ];
      const partnerMap: Record<string, { lat: number | null; lng: number | null }> = {};
      if (partnerIds.length > 0) {
        const ps = await fetchPartnerCoordsByIds(partnerIds);
        ps.forEach((p) => {
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
            partner_id: (e as any).partner_id ?? null,
            category: (e as any).category ?? null,
            sub_category: (e as any).sub_category ?? null,
            image_url: (e as any).image_url ?? null,
            is_sports_transmission: Boolean((e as any).is_sports_transmission),
            transport_reservation_enabled: Boolean((e as any).transport_reservation_enabled),
          } as NearbyEvent;
        })
        .filter(Boolean) as NearbyEvent[];

      setEvents(mapped);
      setLoading(false);
    })();
  }, []);


  const filtered = useMemo(() => {
    let out = events;
    if (activeFilter !== "all") {
      const f = QUICK_FILTERS.find((x) => x.key === activeFilter);
      const tokens = (f as any)?.match as string[] | undefined;
      if (tokens?.length) {
        out = out.filter((e) => {
          const hay = `${e.category ?? ""} ${e.sub_category ?? ""} ${e.title}`.toLowerCase();
          return tokens.some((t) => hay.includes(t));
        });
      }
    }
    if (realLocation) {
      out = out.filter((e) => haversineKm(realLocation, { lat: e.lat, lng: e.lng }) <= radiusKm);
    }
    return out;
  }, [events, activeFilter, realLocation, radiusKm]);

  // Scoring + badges. Pure memo: only recomputes when filtered/location/awards change.
  const scored = useMemo(() => {
    const nowMs = Date.now();
    const startOfTomorrow = (() => { const d = new Date(); d.setHours(24, 0, 0, 0); return d.getTime(); })();
    const enriched = filtered.map((e) => {
      const evMs = new Date(e.date_time).getTime();
      const happeningNow = evMs <= nowMs + 60 * 60 * 1000 && evMs + 4 * 60 * 60 * 1000 >= nowMs; // ±starts within 1h or already running last 4h
      const isToday = evMs < startOfTomorrow && evMs >= new Date().setHours(0, 0, 0, 0);
      const cat = `${e.category ?? ""} ${e.sub_category ?? ""} ${e.title}`.toLowerCase();
      const liveMusic = /(musica|música|show|live|sertanejo|samba|rock|pagode|dj|eletronica|eletrônica|acustico|acústico)/.test(cat);
      const sports = Boolean(e.is_sports_transmission) || /(jogo|futebol|transmiss)/.test(cat);
      const partnerAwarded = e.partner_id ? awardPartnerIds.has(e.partner_id) : false;
      const isPartner = Boolean(e.partner_id);
      const dist = realLocation ? haversineKm(realLocation, { lat: e.lat, lng: e.lng }) : null;

      // Distance: more points when closer (max 40 at <0.3km, 0 at >=20km)
      let distScore = 0;
      if (dist != null) distScore = Math.max(0, 40 - Math.min(40, dist * 2));

      let score = distScore;
      const badges: string[] = [];
      if (happeningNow) { score += 50; badges.push("🔥 Bombando agora"); }
      else if (isToday) { score += 30; badges.push("✨ Hoje"); }
      if (liveMusic) { score += 20; badges.push("🎵 Música ao vivo"); }
      if (sports) { score += 20; badges.push("⚽ Transmissão"); }
      if (partnerAwarded) { score += 15; badges.push("🏆 Premiado"); }
      if (isPartner) score += 10;

      // Heat weight 0..1 for heatmap
      const heat = Math.min(1, 0.25 + score / 130);
      return { ...e, score, heat, badges, _dist: dist };
    });
    return enriched;
  }, [filtered, realLocation, awardPartnerIds]);

  const sorted = useMemo(() => {
    const arr = [...scored].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return arr.slice(0, 50).map((e) => ({ e, d: e._dist as number | null }));
  }, [scored]);

  const trending = useMemo(() => {
    return [...scored]
      .filter((e) => (e.badges?.length ?? 0) > 0)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 3);
  }, [scored]);


  const handleMapClick = (loc: LatLng) => {
    setManualLocation(loc);
    try { localStorage.setItem(MANUAL_KEY, JSON.stringify(loc)); } catch {}
    setSelectionMode(false);
    toast.success("Localização manual definida.");
  };

  const clearManualLocation = () => {
    setManualLocation(null);
    try { localStorage.removeItem(MANUAL_KEY); } catch {}
    toast.info("Localização manual removida.");
  };

  const lastUpdatedLabel = (() => {
    if (manualLocation) return "manual";
    if (!gpsTs) return "—";
    const diff = Math.floor((Date.now() - gpsTs) / 1000);
    if (diff < 10) return "agora";
    if (diff < 60) return `${diff}s atrás`;
    if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
    return `${Math.floor(diff / 3600)}h atrás`;
  })();

  return (
    <div className="min-h-screen bg-background pb-24 overflow-x-clip">
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
          <div className="min-w-0">
            <h1 className="font-display font-bold text-lg truncate">Rolês perto de você</h1>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {manualLocation
                ? "Localização manual"
                : gpsIsAccurate
                ? `GPS · ±${Math.round(gpsAccuracy!)}m · ${lastUpdatedLabel}`
                : gpsLocation
                ? `GPS impreciso (±${Math.round(gpsAccuracy ?? 0)}m)`
                : "Localização não confirmada"}
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
                  {gpsLocation
                    ? `Localização imprecisa (±${Math.round(gpsAccuracy ?? 0)}m). Toque em "Atualizar" ou escolha sua localização no mapa.`
                    : "Confirme sua localização para ver eventos próximos."}
                </p>
              </div>
            )}

            {geoError && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-[12px] text-destructive-foreground">
                {geoError}
              </div>
            )}

            {/* Map mode toggle */}
            <div className="flex items-center gap-2 rounded-full bg-card/50 border border-border/40 p-1 w-fit mx-auto">
              <button
                onClick={() => setShowHeatmap(false)}
                className={`flex items-center gap-1.5 rounded-full px-3 h-8 text-[11px] font-semibold transition ${
                  !showHeatmap ? "bg-primary text-primary-foreground shadow-[0_0_14px_-4px_hsl(var(--primary))]" : "text-muted-foreground"
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" /> Mapa normal
              </button>
              <button
                onClick={() => setShowHeatmap(true)}
                className={`flex items-center gap-1.5 rounded-full px-3 h-8 text-[11px] font-semibold transition ${
                  showHeatmap ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-[0_0_14px_-4px_rgba(236,72,153,0.8)]" : "text-muted-foreground"
                }`}
              >
                <Flame className="w-3.5 h-3.5" /> Mapa de calor
              </button>
            </div>

            <Suspense
              fallback={
                <div
                  style={{ height: 420 }}
                  className="w-full rounded-xl bg-white/5 border border-white/10 animate-pulse"
                />
              }
            >
              <RoxouNearbyEventsMap
                userLocation={realLocation}
                events={sorted.map((s) => s.e)}
                height={420}
                heatmap={showHeatmap}
                selectionMode={selectionMode}
                onMapClick={handleMapClick}
              />
            </Suspense>

            {/* Bombando perto de você */}
            {trending.length > 0 && (
              <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card/60 to-pink-500/10 p-3 space-y-2 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                    <Flame className="w-4 h-4 text-orange-400" /> Bombando perto de você
                  </h2>
                </div>
                <ul className="space-y-1.5">
                  {trending.map((t) => (
                    <li key={t.id}>
                      <button
                        onClick={() => navigate(t.slug ? `/evento/${t.slug}` : `/evento/${t.id}`)}
                        className="w-full text-left flex items-start gap-2 group"
                      >
                        <span className="text-primary mt-0.5">•</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate group-hover:text-primary transition">
                            {t.venue_name || t.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {t.badges?.slice(0, 2).join(" · ")}
                            {t._dist != null && ` · ${t._dist.toFixed(1)} km`}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}


            {/* Quick category filters */}
            <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 w-max pb-1">
                {QUICK_FILTERS.map((f) => {
                  const active = activeFilter === f.key;
                  return (
                    <button
                      key={f.key}
                      onClick={() => setActiveFilter(f.key)}
                      className={`flex items-center gap-1.5 rounded-full px-3 h-9 text-xs font-semibold whitespace-nowrap border transition ${
                        active
                          ? "bg-primary text-primary-foreground border-primary shadow-[0_0_18px_-4px_hsl(var(--primary)/0.7)]"
                          : "bg-card/60 border-border/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>{f.emoji}</span> {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Distance radius */}
            <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 w-max">
                {DISTANCE_OPTIONS.map((d) => {
                  const active = radiusKm === d;
                  return (
                    <button
                      key={d}
                      onClick={() => setRadiusKm(d)}
                      className={`rounded-full px-3 h-8 text-[11px] font-semibold whitespace-nowrap border transition ${
                        active
                          ? "bg-foreground text-background border-foreground"
                          : "bg-card/40 border-border/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      até {d} km
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              <strong className="text-foreground">{sorted.length}</strong> {sorted.length === 1 ? "local encontrado" : "locais encontrados"} em até {radiusKm} km
            </p>

            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                className="rounded-xl gap-1.5 h-11 text-xs"
                disabled={requesting}
                onClick={() => requestGeolocation(true)}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${requesting ? "animate-spin" : ""}`} />
                {requesting ? "..." : "Atualizar"}
              </Button>
              <Button
                variant="outline"
                className="rounded-xl gap-1.5 h-11 text-xs"
                disabled={requesting}
                onClick={() => requestGeolocation(true)}
              >
                <Crosshair className="w-3.5 h-3.5" />
                GPS
              </Button>
              <Button
                variant={selectionMode ? "default" : "outline"}
                className="rounded-xl gap-1.5 h-11 text-xs"
                onClick={() => setSelectionMode((v) => !v)}
              >
                <MapPin className="w-3.5 h-3.5" />
                {selectionMode ? "Cancelar" : "Mapa"}
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
                <Calendar className="w-3.5 h-3.5" /> {sorted.length > 0 ? `Próximos ${sorted.length} rolês` : "Nenhum rolê neste raio"}
              </h2>
              {sorted.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Aumente o raio ou troque o filtro para ver mais opções.
                </p>
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
                  {e.badges && e.badges.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {e.badges.slice(0, 3).map((b, i) => (
                        <span key={i} className="text-[10px] font-semibold rounded-full px-2 py-0.5 bg-primary/15 border border-primary/30 text-primary">
                          {b}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      className="rounded-lg text-[11px] h-9"
                      onClick={() => navigate(e.slug ? `/evento/${e.slug}` : `/evento/${e.id}`)}
                    >
                      Ver local
                    </Button>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-border/40 text-[11px] font-medium h-9 hover:border-primary/40"
                    >
                      <Navigation className="w-3 h-3" /> Como chegar
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
