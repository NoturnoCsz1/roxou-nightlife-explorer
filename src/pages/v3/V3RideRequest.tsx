import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft, Clock, Users, Send, Navigation, MapPin, ExternalLink,
  Route as RouteIcon, User, Phone, CheckCircle2, Lock, AlertTriangle, Crosshair,
} from "lucide-react";
import LegalDisclaimer from "@/components/v3/LegalDisclaimer";
import {
  getRideEstimatedEnd, getRideRequestDeadline, isRideWindowClosed,
  RIDE_EXPIRED_MESSAGE, toSaoPauloTimestamp,
} from "@/lib/rideTimeRules";
import { maskWhatsappBR } from "@/lib/v3Validation";
import RoxouRideMap from "@/components/maps/RoxouRideMap";

function toLocalDatetime(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ""; }
}
function mapsRouteUrl(o: string, d: string) {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(o)}&destination=${encodeURIComponent(d)}`;
}

const MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#1a1025" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1025" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746b8a" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a2040" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#140e1e" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
];

let mapsLoadPromise: Promise<void> | null = null;
let mapsApiKey: string | null = null;
async function loadGoogleMaps(): Promise<void> {
  if ((window as any).google?.maps) return;
  if (mapsLoadPromise) return mapsLoadPromise;
  mapsLoadPromise = (async () => {
    if (!mapsApiKey) {
      const { data, error } = await supabase.functions.invoke("maps-key");
      if (error || !data?.key) throw new Error("Failed to load Maps API key");
      mapsApiKey = data.key;
    }
    return new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${mapsApiKey}&libraries=places,geocoding&language=pt-BR&loading=async`;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load Google Maps"));
      document.head.appendChild(s);
    });
  })();
  return mapsLoadPromise;
}

interface PartnerData {
  name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  maps_place_id?: string | null;
}
interface EventData {
  id: string;
  title: string;
  venue_name: string | null;
  address: string | null;
  date_time: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  partner_id: string | null;
  partner?: PartnerData | null;
}

export default function V3RideRequest() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const eventIdParam = searchParams.get("eventId");

  const [event, setEvent] = useState<EventData | null>(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [eventError, setEventError] = useState<string | null>(null);

  // Origin (GPS-first)
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [originAccuracy, setOriginAccuracy] = useState<number | null>(null);
  const [originAddress, setOriginAddress] = useState("");
  const [originSource, setOriginSource] = useState<"gps" | "manual_pin_adjustment" | "fallback_address" | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [gpsRefining, setGpsRefining] = useState(false);
  const [gpsAttempts, setGpsAttempts] = useState(0);
  const [gpsBlocked, setGpsBlocked] = useState<null | "denied" | "unavailable" | "timeout" | "unknown">(null);
  const [gpsAutoTried, setGpsAutoTried] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const watchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bestAccuracyRef = useRef<number>(Infinity);

  // Form
  const [eventDate, setEventDate] = useState("");
  const [passengersCount, setPassengersCount] = useState(1);
  const [priceNote, setPriceNote] = useState("Valor a combinar no chat");
  const [notes, setNotes] = useState("");
  const [receiveProposals, setReceiveProposals] = useState(true);
  // Manual destination (used when event has no coords)
  const [manualDestAddress, setManualDestAddress] = useState("");
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destIsApproximate, setDestIsApproximate] = useState(false);
  // Manual origin address (fallback when GPS is bad)
  const [manualOriginAddress, setManualOriginAddress] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [originConfirmed, setOriginConfirmed] = useState(false);

  // (Leaflet map handles markers reactively from state)

  // Load event by eventId — destination is LOCKED to this
  useEffect(() => {
    (async () => {
      if (!eventIdParam) {
        setEventError("Selecione um evento da Roxou para solicitar carona.");
        setEventLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("events")
        .select("id,title,venue_name,address,date_time,latitude,longitude,status,partner_id,transport_reservation_enabled")
        .eq("id", eventIdParam)
        .maybeSingle();
      if (error || !data) {
        setEventError("Evento não encontrado.");
        setEventLoading(false);
        return;
      }
      if (data.status !== "published") {
        setEventError("Este evento não está mais ativo.");
        setEventLoading(false);
        return;
      }
      if (!(data as any).transport_reservation_enabled) {
        setEventError("Este evento não está disponível para carona Roxou.");
        setEventLoading(false);
        return;
      }
      let partner: PartnerData | null = null;
      if (data.partner_id) {
        const { data: p } = await supabase
          .from("partners")
          .select("name,address,latitude,longitude")
          .eq("id", data.partner_id)
          .maybeSingle();
        if (p) partner = p as PartnerData;
      }
      setEvent({ ...(data as any), partner } as EventData);
      setEventDate(toLocalDatetime(data.date_time));
      setEventLoading(false);
    })();
  }, [eventIdParam]);

  // Pre-fill profile
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: prof } = await supabase
        .from("profiles").select("display_name, whatsapp")
        .eq("user_id", user.id).maybeSingle();
      if (prof?.display_name) setDisplayName(prof.display_name);
      if ((prof as any)?.whatsapp) setWhatsapp((prof as any).whatsapp);
    })();
  }, []);

  // Resolve event destination coords (geocode address if missing) + init map
  useEffect(() => {
    if (!event) return;
    let cancelled = false;
    (async () => {
      try {
        await loadGoogleMaps();
        if (cancelled) return;
        const g = (window as any).google;

        let destLat = event.latitude ?? event.partner?.latitude ?? null;
        let destLng = event.longitude ?? event.partner?.longitude ?? null;
        const destAddress =
          event.address ||
          event.partner?.address ||
          event.venue_name ||
          event.partner?.name ||
          "";

        if ((destLat == null || destLng == null) && destAddress) {
          const geocoder = new g.maps.Geocoder();
          try {
            const res = await geocoder.geocode({ address: `${destAddress}, Brasil` });
            const loc = res?.results?.[0]?.geometry?.location;
            if (loc) {
              destLat = loc.lat();
              destLng = loc.lng();
            }
          } catch {}
        }
        if (destLat == null || destLng == null) {
          // Não bloquear: permitir destino manual
          setDestIsApproximate(true);
          if (destAddress) setManualDestAddress(destAddress);
          return;
        }
        setDestCoords({ lat: destLat, lng: destLng });
        setEvent((prev) => prev ? { ...prev, latitude: destLat!, longitude: destLng! } : prev);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { cancelled = true; };
  }, [event?.id]);

  // Reverse geocode helper
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      await loadGoogleMaps();
      const g = (window as any).google;
      const geocoder = new g.maps.Geocoder();
      const res = await geocoder.geocode({ location: { lat, lng } });
      return res?.results?.[0]?.formatted_address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  const handleOriginPinChange = async (c: { lat: number; lng: number }) => {
    setOriginCoords(c);
    setOriginSource("manual_pin_adjustment");
    setOriginAccuracy(null);
    setOriginConfirmed(false);
    const addr = await reverseGeocode(c.lat, c.lng);
    setOriginAddress(addr);
    toast.success("Pin ajustado — confirme o ponto");
  };

  const stopWatch = () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (watchTimeoutRef.current) {
      clearTimeout(watchTimeoutRef.current);
      watchTimeoutRef.current = null;
    }
    setGpsRefining(false);
    setGeoLoading(false);
  };

  const useMyLocation = (opts?: { highAccuracy?: boolean; silent?: boolean }) => {
    const highAccuracy = opts?.highAccuracy ?? true;
    const silent = opts?.silent ?? false;

    if (!navigator.geolocation) {
      setGeoError("Geolocalização não suportada neste navegador.");
      setGpsBlocked("unavailable");
      if (!silent) toast.error("Geolocalização não suportada");
      return;
    }
    stopWatch();
    bestAccuracyRef.current = Infinity;
    setGpsAttempts(0);
    setGeoLoading(true);
    setGpsRefining(true);
    setGeoError(null);
    setGpsBlocked(null);
    setOriginConfirmed(false);

    let firstFix = false;
    let id: number;

    try {
      id = navigator.geolocation.watchPosition(
        async (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          setGpsAttempts((n) => n + 1);

          if (accuracy != null && accuracy < bestAccuracyRef.current) {
            bestAccuracyRef.current = accuracy;
            setOriginCoords({ lat: latitude, lng: longitude });
            setOriginAccuracy(accuracy);
            setOriginSource("gps");

            if (!firstFix) {
              firstFix = true;
              setGeoLoading(false);
              reverseGeocode(latitude, longitude).then(setOriginAddress);
            }
          }

          if (accuracy != null && accuracy <= 25) {
            stopWatch();
            if (firstFix) reverseGeocode(latitude, longitude).then(setOriginAddress);
            if (!silent) toast.success(`GPS preciso (~${Math.round(accuracy)}m)`);
          }
        },
        (err) => {
          // eslint-disable-next-line no-console
          console.warn("[Ride GPS] falha ao obter localização", { code: err?.code, message: err?.message });
          let kind: "denied" | "unavailable" | "timeout" | "unknown" = "unknown";
          if (err.code === err.PERMISSION_DENIED) kind = "denied";
          else if (err.code === err.POSITION_UNAVAILABLE) kind = "unavailable";
          else if (err.code === err.TIMEOUT) kind = "timeout";

          if (!firstFix) {
            // Timeout em alta precisão: tenta baixa precisão automaticamente uma vez
            if (kind === "timeout" && highAccuracy) {
              stopWatch();
              useMyLocation({ highAccuracy: false, silent });
              return;
            }
            setGpsBlocked(kind);
            const friendly =
              kind === "denied"
                ? "Permissão de localização bloqueada."
                : kind === "unavailable"
                  ? "Não foi possível acessar o GPS agora."
                  : kind === "timeout"
                    ? "Tempo esgotado ao buscar localização."
                    : "Falha ao acessar localização.";
            setGeoError(friendly);
            stopWatch();
          }
        },
        { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 15000 : 20000, maximumAge: highAccuracy ? 0 : 30000 }
      );
      watchIdRef.current = id;
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.warn("[Ride GPS] exceção ao chamar geolocation", e?.message);
      setGpsBlocked("unknown");
      setGeoError("Não foi possível solicitar localização. Feche balões/sobreposições de outros apps e tente novamente.");
      stopWatch();
      return;
    }

    watchTimeoutRef.current = setTimeout(() => {
      stopWatch();
      if (bestAccuracyRef.current === Infinity) {
        setGeoError("Não foi possível obter localização. Use o endereço manual ou ajuste o pin no mapa.");
        if (!silent) toast.error("GPS indisponível — use endereço manual");
      } else if (bestAccuracyRef.current > 100 && !silent) {
        toast.warning("GPS com baixa precisão — ajuste o pin no mapa");
      } else if (!silent && bestAccuracyRef.current <= 100) {
        toast.success(`Localização refinada (~${Math.round(bestAccuracyRef.current)}m)`);
      }
    }, 12000);
  };

  // Auto-tenta uma vez silenciosamente; se falhar, mostra modal de orientação
  useEffect(() => {
    if (!eventLoading && !eventError && !originCoords && !gpsAutoTried) {
      setGpsAutoTried(true);
      useMyLocation({ silent: true });
    }
    return () => stopWatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventLoading, eventError]);

  const geocodeAddress = async (addr: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      await loadGoogleMaps();
      const g = (window as any).google;
      const geocoder = new g.maps.Geocoder();
      const res = await geocoder.geocode({ address: `${addr}, Brasil` });
      const loc = res?.results?.[0]?.geometry?.location;
      if (loc) return { lat: loc.lat(), lng: loc.lng() };
    } catch {}
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) { toast.error("Evento inválido"); return; }

    // Resolve origin (GPS or manual address)
    let resolvedOrigin = originCoords;
    let resolvedOriginAddr = originAddress;
    let resolvedOriginSource = originSource;
    let resolvedOriginAccuracy = originAccuracy;
    let originApproximate = false;

    if (manualOriginAddress.trim()) {
      resolvedOriginAddr = manualOriginAddress.trim();
      resolvedOriginSource = "fallback_address";
      resolvedOriginAccuracy = null;
      const geo = await geocodeAddress(manualOriginAddress.trim());
      if (geo) {
        resolvedOrigin = geo;
        originApproximate = false;
      } else {
        // Não bloqueia: salva como texto, sem coordenadas
        resolvedOrigin = null;
        originApproximate = true;
        toast.message("Endereço salvo como texto. O motorista combinará o ponto exato no chat.");
      }
    } else if (originAccuracy != null && originAccuracy > 1000) {
      toast.error("GPS com baixa precisão. Ajuste o pin no mapa ou digite o endereço de embarque.");
      return;
    }

    if (!resolvedOrigin && !resolvedOriginAddr) {
      toast.error("Confirme sua origem (GPS, mapa ou endereço)"); return;
    }

    // Resolve destination (event coords or manual)
    let resolvedDestLat = event.latitude ?? destCoords?.lat ?? null;
    let resolvedDestLng = event.longitude ?? destCoords?.lng ?? null;
    let resolvedDestAddr =
      event.address || event.partner?.address || event.venue_name || event.partner?.name || event.title;

    let destApproximate = false;
    if ((resolvedDestLat == null || resolvedDestLng == null)) {
      if (!manualDestAddress.trim()) {
        toast.error("Confirme o endereço do destino para continuar.");
        return;
      }
      resolvedDestAddr = manualDestAddress.trim();
      const geo = await geocodeAddress(manualDestAddress.trim());
      if (geo) {
        resolvedDestLat = geo.lat;
        resolvedDestLng = geo.lng;
      } else {
        // Não bloqueia: salva endereço textual
        resolvedDestLat = null;
        resolvedDestLng = null;
        destApproximate = true;
        toast.message("Endereço de destino salvo como texto. Será confirmado no chat com o motorista.");
      }
    }

    if (!whatsapp.trim() || !/^\(\d{2}\) \d{4,5}-\d{4}$/.test(whatsapp)) {
      toast.error("Informe um WhatsApp válido (XX) XXXXX-XXXX"); return;
    }
    if (!eventDate) { toast.error("Informe o horário desejado"); return; }

    const rideTimestamp = toSaoPauloTimestamp(eventDate);
    if (isRideWindowClosed(event.date_time)) {
      toast.error(RIDE_EXPIRED_MESSAGE); return;
    }
    const estimatedEnd = getRideEstimatedEnd(event.date_time);
    if (estimatedEnd && rideTimestamp && new Date(rideTimestamp) > estimatedEnd) {
      toast.error("Horário posterior ao término estimado do evento."); return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Entre para solicitar transporte");
        navigate("/auth?redirect=/transporte");
        return;
      }

      if (displayName.trim() || whatsapp.trim()) {
        await supabase.from("profiles").update({
          display_name: displayName.trim() || undefined,
          whatsapp: whatsapp.trim() || undefined,
        } as any).eq("user_id", user.id);
      }

      const { data: inserted, error } = await supabase.from("ride_requests").insert({
        passenger_id: user.id,
        event_id: event.id,
        event_name: event.title,
        venue_name: event.venue_name,
        event_date: rideTimestamp,
        pickup_address: resolvedOriginAddr || (resolvedOrigin ? `${resolvedOrigin.lat.toFixed(6)}, ${resolvedOrigin.lng.toFixed(6)}` : null),
        origin_lat: resolvedOrigin?.lat ?? null,
        origin_lng: resolvedOrigin?.lng ?? null,
        origin_accuracy: resolvedOriginAccuracy,
        origin_source: resolvedOriginSource ?? (originApproximate ? "fallback_address" : "gps"),
        pickup_is_approximate: originApproximate || !resolvedOrigin,
        destination_address: resolvedDestAddr,
        destination_lat: resolvedDestLat,
        destination_lng: resolvedDestLng,
        destination_is_approximate: destApproximate || resolvedDestLat == null || resolvedDestLng == null,
        passengers_count: passengersCount,
        seats_available: Math.min(4, Math.max(1, passengersCount)),
        price_note: priceNote || "Valor a combinar no chat",
        notes: notes?.trim() || null,
        receive_transport_proposals: receiveProposals,
        status: "open",
      } as any).select("id").maybeSingle();
      if (error) throw error;

      setSuccess(true);
      toast.success("Pedido de carona enviado com sucesso");

      // Notify drivers (best-effort, opt-in only)
      if (receiveProposals && inserted?.id) {
        supabase.functions.invoke("notify-drivers-new-ride", {
          body: { ride_request_id: inserted.id },
        }).catch(() => { /* silent */ });
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar pedido");
    } finally {
      setLoading(false);
    }
  };

  if (eventLoading) {
    return (
      <div className="px-4 py-10 max-w-md mx-auto text-center text-sm text-muted-foreground">
        Carregando evento...
      </div>
    );
  }

  if (eventError || !event) {
    return (
      <div className="px-4 py-10 max-w-md mx-auto space-y-4">
        <div className="rounded-3xl p-6 bg-card/40 backdrop-blur-xl border border-destructive/30 text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/15 border border-destructive/40 grid place-items-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <h1 className="font-display font-bold text-lg">Carona apenas para eventos Roxou</h1>
          <p className="text-sm text-muted-foreground">
            {eventError || "Selecione um evento da plataforma para solicitar carona."}
          </p>
          <Button asChild className="rounded-xl w-full">
            <Link to="/transporte">Ver eventos disponíveis</Link>
          </Button>
        </div>
      </div>
    );
  }

  const windowClosed = isRideWindowClosed(event.date_time);
  const deadline = getRideRequestDeadline(event.date_time);

  if (success) {
    const destStr = event.address || event.venue_name || event.title;
    return (
      <div className="px-4 py-10 max-w-md mx-auto space-y-5">
        <div className="rounded-3xl p-6 bg-card/40 backdrop-blur-xl border border-primary/30 shadow-[0_0_40px_-10px_hsl(var(--primary)/0.4)] text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/15 border border-primary/40 grid place-items-center">
            <CheckCircle2 className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-display font-bold text-xl">Pedido enviado!</h1>
          <p className="text-sm text-muted-foreground">
            Motoristas verificados poderão visualizar sua solicitação para <strong>{event.title}</strong>.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/meus-pedidos">Meus pedidos</Link>
            </Button>
            <Button asChild className="rounded-xl">
              <Link to="/transporte">Voltar</Link>
            </Button>
          </div>
          {originAddress && (
            <a href={mapsRouteUrl(originAddress, destStr)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
              <RouteIcon className="w-3.5 h-3.5" /> Ver rota no Google Maps
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-md mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/transporte" className="p-2 -ml-2 rounded-xl hover:bg-card transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="font-display font-bold text-xl text-foreground">Pedir carona</h1>
          <p className="text-xs text-muted-foreground">Carona Roxou apenas para eventos da plataforma</p>
        </div>
      </div>

      <LegalDisclaimer />

      <div className="rounded-2xl border border-border/30 bg-card/30 backdrop-blur-md p-3 text-[11px] text-muted-foreground">
        A Roxou apenas conecta passageiros e motoristas verificados para eventos da plataforma. Não somos app de corrida — a negociação é feita diretamente entre as partes.
      </div>

      {windowClosed ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Sistema de carona encerrado para este evento
        </div>
      ) : deadline ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-xs text-primary">
          Solicitações abertas até {deadline.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step 1 — Destination LOCKED */}
        <section className="rounded-3xl border border-primary/30 bg-card/40 backdrop-blur-xl p-4 space-y-3 shadow-[0_0_30px_-15px_hsl(var(--primary)/0.4)]">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-primary/80">
            <span className="w-5 h-5 rounded-full bg-primary/15 border border-primary/40 grid place-items-center text-[10px] font-bold">1</span>
            Destino do evento
            <Lock className="w-3 h-3 ml-1 text-primary/70" />
          </div>
          <div className="rounded-2xl border border-primary/25 bg-primary/5 p-3 space-y-1">
            <p className="font-display font-bold text-sm text-foreground">{event.title}</p>
            {event.venue_name && (
              <p className="text-xs text-foreground/80 flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-primary" /> {event.venue_name}
              </p>
            )}
            {event.address && (
              <p className="text-[11px] text-muted-foreground">{event.address}</p>
            )}
            <p className="text-[10px] text-primary/80 pt-1 flex items-center gap-1">
              <Lock className="w-3 h-3" /> O destino é travado no evento selecionado pela Roxou.
            </p>
          </div>
          {(event.latitude == null || event.longitude == null) && !destCoords && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
              <div className="flex items-start gap-1.5 text-[11px] text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>Não encontramos a localização exata do destino. Confirme o endereço manualmente para continuar.</span>
              </div>
              <Label className="text-xs text-muted-foreground">Endereço do destino</Label>
              <Input
                value={manualDestAddress}
                onChange={(e) => setManualDestAddress(e.target.value.slice(0, 200))}
                placeholder="Ex: Rua, número, bairro"
                className="h-11 rounded-xl bg-card border-border/40 text-sm"
              />
            </div>
          )}
        </section>


        {/* Step 2 — Origin via GPS */}
        <section className="rounded-3xl border border-border/40 bg-card/40 backdrop-blur-xl p-4 space-y-3 shadow-[0_0_30px_-15px_hsl(var(--primary)/0.4)]">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-primary/80">
            <span className="w-5 h-5 rounded-full bg-primary/15 border border-primary/40 grid place-items-center text-[10px] font-bold">2</span>
            Onde te buscar?
          </div>

          {!originCoords && !gpsRefining && (
            <div className="rounded-2xl border border-border/40 bg-card/30 p-3 text-[11px] text-muted-foreground leading-snug">
              Para encontrar motoristas próximos, precisamos da sua localização.
              Se aparecer "Este site não pode pedir permissões", feche balões flutuantes (Uber, Messenger, picture-in-picture) e tente novamente.
            </div>
          )}

          <Button
            type="button"
            onClick={() => useMyLocation()}
            disabled={geoLoading && !originCoords}
            className="w-full h-11 rounded-xl gap-2"
            variant={originCoords ? "outline" : "default"}
          >
            <Crosshair className={`w-4 h-4 ${gpsRefining ? "animate-pulse" : ""}`} />
            {gpsRefining && !originCoords
              ? "Capturando GPS..."
              : gpsRefining && originCoords
                ? `Melhorando precisão (~${Math.round(originAccuracy ?? 0)}m)...`
                : originCoords
                  ? "Melhorar precisão"
                  : "Permitir localização"}
          </Button>

          {gpsBlocked && !originCoords && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 space-y-2 text-[12px] text-amber-100">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-300" />
                <div className="space-y-1">
                  <p className="font-semibold">Tivemos dificuldade para acessar sua localização.</p>
                  <p className="text-[11px] opacity-90">
                    Se você estiver com o balão do Uber, Messenger ou outro app flutuante aberto,
                    feche a sobreposição e tente novamente. O Android bloqueia permissões enquanto há apps sobrepostos na tela.
                  </p>
                  {gpsBlocked === "denied" && (
                    <p className="text-[11px] opacity-90">
                      Você também pode liberar a permissão nas configurações do navegador para este site.
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  className="rounded-xl h-9 text-[11px]"
                  onClick={() => useMyLocation()}
                >
                  Tentar novamente
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-xl h-9 text-[11px]"
                  onClick={() => {
                    setGpsBlocked(null);
                    setGeoError(null);
                    document.getElementById("manual-origin-input")?.focus();
                  }}
                >
                  Inserir endereço manual
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="rounded-xl h-9 text-[11px]"
                  onClick={() => useMyLocation({ highAccuracy: false })}
                >
                  Localização aproximada
                </Button>
              </div>
            </div>
          )}

          {geoError && !gpsBlocked && (
            <p className="text-[11px] text-destructive">{geoError}</p>
          )}

          {/* Fallback: manual pickup address */}
          <div className="space-y-2 rounded-2xl border border-border/40 bg-card/30 p-3">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Ou digite o endereço de embarque
            </Label>
            <Input
              id="manual-origin-input"
              value={manualOriginAddress}
              onChange={(e) => setManualOriginAddress(e.target.value.slice(0, 200))}
              placeholder="Ex: Rua, número, bairro"
              className="h-11 rounded-xl bg-card border-border/40 text-sm"
            />
            <p className="text-[10px] text-muted-foreground">
              Use se o GPS estiver impreciso. Se não conseguirmos validar automaticamente, o endereço será enviado ao motorista para confirmação no chat.
            </p>
          </div>

          {originAccuracy != null && originAccuracy > 1000 && !manualOriginAddress.trim() && (
            <div className="flex items-start gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-destructive">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>GPS com baixa precisão. Ajuste o ponto manualmente ou digite o endereço de embarque.</span>
            </div>
          )}

          {originCoords && (
            <div className={`rounded-2xl border p-3 space-y-2 ${
              originConfirmed
                ? "border-primary/50 bg-primary/10"
                : "border-border/40 bg-card/40"
            }`}>
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-primary/80 font-bold flex-wrap">
                <Navigation className="w-3 h-3" />
                {originConfirmed ? "Ponto confirmado" : "Ponto de embarque selecionado"}
                {originAccuracy != null && originSource === "gps" && (() => {
                  const a = originAccuracy;
                  const color = a <= 30 ? "text-emerald-400" : a <= 100 ? "text-amber-400" : "text-destructive";
                  return (
                    <span className={`normal-case font-bold ${color}`}>
                      · ~{Math.round(a)}m {gpsRefining && "(refinando...)"}
                    </span>
                  );
                })()}
              </div>
              <p className="text-xs text-foreground break-words">
                {originAddress || `Lat: ${originCoords.lat.toFixed(5)}, Lng: ${originCoords.lng.toFixed(5)}`}
              </p>
              <p className="text-[10px] text-muted-foreground leading-snug">
                O endereço exibido pode ser aproximado. Confira o pin no mapa e arraste para o ponto exato.
              </p>

              {originAccuracy != null && originAccuracy > 100 && !originConfirmed && (
                <div className="flex items-start gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 p-2 text-[11px] text-destructive">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>GPS com baixa precisão. Ajuste o pin manualmente para evitar erro no embarque.</span>
                </div>
              )}

              {!originConfirmed ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setOriginConfirmed(true);
                    toast.success("Ponto de embarque confirmado");
                  }}
                  className="w-full h-9 rounded-xl gap-1.5 text-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar este ponto
                </Button>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-primary">
                  <Lock className="w-3 h-3" /> Ponto travado para envio
                </div>
              )}
            </div>
          )}

          {(event?.latitude != null && event?.longitude != null) ? (
            <RoxouRideMap
              originCoords={originCoords}
              destinationCoords={{ lat: event.latitude, lng: event.longitude }}
              onOriginChange={handleOriginPinChange}
              destinationLabel={event.title}
              originLabel="Seu ponto de embarque"
              height={220}
            />
          ) : destCoords ? (
            <RoxouRideMap
              originCoords={originCoords}
              destinationCoords={destCoords}
              onOriginChange={handleOriginPinChange}
              destinationLabel={event.title}
              originLabel="Seu ponto de embarque"
              height={220}
            />
          ) : null}

          <a
            href={originAddress && event.address
              ? mapsRouteUrl(originAddress, event.address)
              : "#"}
            target="_blank" rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 text-[11px] text-primary hover:underline ${
              !originAddress ? "opacity-40 pointer-events-none" : ""
            }`}
          >
            <ExternalLink className="w-3 h-3" /> Ver rota no Google Maps
          </a>
        </section>

        {/* Step 3 — Confirm */}
        <section className="rounded-3xl border border-border/40 bg-card/40 backdrop-blur-xl p-4 space-y-4 shadow-[0_0_30px_-15px_hsl(var(--primary)/0.4)]">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-primary/80">
            <span className="w-5 h-5 rounded-full bg-primary/15 border border-primary/40 grid place-items-center text-[10px] font-bold">3</span>
            Confirmar pedido
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Nome
            </Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, 80))}
              placeholder="Seu nome"
              className="h-11 rounded-xl bg-card border-border/40 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> WhatsApp *
            </Label>
            <Input
              value={whatsapp}
              onChange={(e) => setWhatsapp(maskWhatsappBR(e.target.value))}
              placeholder="(18) 99999-9999"
              inputMode="tel"
              required
              className="h-11 rounded-xl bg-card border-border/40 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Horário desejado *
            </Label>
            <Input
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
              className="h-11 rounded-xl bg-card border-border/40 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Passageiros
            </Label>
            <div className="flex items-center gap-3">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n} type="button" onClick={() => setPassengersCount(n)}
                  className={`w-10 h-10 rounded-xl text-sm font-semibold transition-colors ${
                    passengersCount === n
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border/40 text-foreground hover:border-primary/40"
                  }`}
                >{n}</button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Valor sugerido</Label>
            <Input
              value={priceNote}
              onChange={(e) => setPriceNote(e.target.value.slice(0, 80))}
              placeholder="Ex: R$ 20 por pessoa (a combinar)"
              className="h-11 rounded-xl bg-card border-border/40 text-sm"
            />
            <p className="text-[10px] text-muted-foreground">
              O valor final pode ser combinado diretamente entre passageiro e motorista.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Alguma informação extra para o motorista?"
              className="rounded-xl bg-card border-border/40 text-sm min-h-[80px] resize-none"
            />
          </div>

          <label className="flex items-start gap-2 text-xs text-foreground/90 rounded-2xl border border-border/40 bg-card/30 p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={receiveProposals}
              onChange={(e) => setReceiveProposals(e.target.checked)}
              className="mt-0.5 accent-primary"
            />
            <span>
              Continuar recebendo propostas de motoristas para este pedido.
              <span className="block text-[10px] text-muted-foreground mt-0.5">
                Você pode desativar a qualquer momento em "Minhas caronas".
              </span>
            </span>
          </label>
        </section>

        <Button
          type="submit"
          disabled={loading || windowClosed || (!originCoords && !manualOriginAddress.trim())}
          className="w-full h-12 rounded-xl font-semibold text-sm gap-2"
        >
          <Send className="w-4 h-4" />
          {loading ? "Enviando..." : (!originCoords && !manualOriginAddress.trim()) ? "Informe origem (GPS ou endereço)" : "Publicar pedido"}
        </Button>
      </form>
    </div>
  );
}
