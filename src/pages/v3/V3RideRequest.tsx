import { useEffect, useState, useRef } from "react";
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

interface EventData {
  id: string;
  title: string;
  venue_name: string | null;
  address: string | null;
  date_time: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
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

  // Form
  const [eventDate, setEventDate] = useState("");
  const [passengersCount, setPassengersCount] = useState(1);
  const [priceNote, setPriceNote] = useState("Rachada combinada no chat");
  const [notes, setNotes] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Map refs
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const originMarker = useRef<any>(null);
  const destMarker = useRef<any>(null);

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
        .select("id,title,venue_name,address,date_time,latitude,longitude,status")
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
      setEvent(data as EventData);
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

        let destLat = event.latitude;
        let destLng = event.longitude;

        if ((destLat == null || destLng == null) && event.address) {
          // fallback: client-side geocode (best effort) — do NOT persist; admin should fix
          const geocoder = new g.maps.Geocoder();
          try {
            const res = await geocoder.geocode({ address: `${event.address}, Brasil` });
            const loc = res?.results?.[0]?.geometry?.location;
            if (loc) {
              destLat = loc.lat();
              destLng = loc.lng();
            }
          } catch {}
        }
        if (destLat == null || destLng == null) {
          setEventError("Este evento ainda não tem localização cadastrada. Avisamos a equipe para corrigir.");
          return;
        }
        setEvent((prev) => prev ? { ...prev, latitude: destLat!, longitude: destLng! } : prev);

        // Init map
        if (!mapRef.current) return;
        mapInstance.current = new g.maps.Map(mapRef.current, {
          center: { lat: destLat, lng: destLng },
          zoom: 14,
          disableDefaultUI: true,
          zoomControl: true,
          styles: MAP_STYLES,
        });
        destMarker.current = new g.maps.Marker({
          position: { lat: destLat, lng: destLng },
          map: mapInstance.current,
          label: { text: "🎯", fontSize: "18px" },
          title: event.title,
        });
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

  const placeOriginMarker = async (lat: number, lng: number) => {
    await loadGoogleMaps();
    const g = (window as any).google;
    if (!mapInstance.current) return;
    if (!originMarker.current) {
      originMarker.current = new g.maps.Marker({
        position: { lat, lng },
        map: mapInstance.current,
        draggable: true,
        label: { text: "📍", fontSize: "18px" },
        title: "Seu ponto de embarque (arraste para ajustar)",
      });
      originMarker.current.addListener("dragend", async (e: any) => {
        const p = e.latLng;
        const newLat = p.lat();
        const newLng = p.lng();
        setOriginCoords({ lat: newLat, lng: newLng });
        setOriginSource("manual_pin_adjustment");
        setOriginAccuracy(null);
        const addr = await reverseGeocode(newLat, newLng);
        setOriginAddress(addr);
        toast.success("Ponto de embarque ajustado");
      });
    } else {
      originMarker.current.setPosition({ lat, lng });
    }
    // Fit bounds to include both
    if (event?.latitude != null && event?.longitude != null) {
      const bounds = new g.maps.LatLngBounds();
      bounds.extend({ lat, lng });
      bounds.extend({ lat: event.latitude, lng: event.longitude });
      mapInstance.current.fitBounds(bounds, 80);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocalização não suportada neste navegador");
      toast.error("Geolocalização não suportada");
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setOriginCoords({ lat: latitude, lng: longitude });
        setOriginAccuracy(accuracy ?? null);
        setOriginSource("gps");
        const addr = await reverseGeocode(latitude, longitude);
        setOriginAddress(addr);
        await placeOriginMarker(latitude, longitude);
        setGeoLoading(false);
        toast.success("Localização capturada via GPS");
      },
      (err) => {
        setGeoLoading(false);
        const msg = err.code === err.PERMISSION_DENIED
          ? "Permissão de localização negada. Ative no navegador para continuar."
          : (err.message || "Não foi possível obter sua localização");
        setGeoError(msg);
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) { toast.error("Evento inválido"); return; }
    if (event.latitude == null || event.longitude == null) {
      toast.error("Evento sem localização cadastrada"); return;
    }
    if (!originCoords) { toast.error("Capture sua localização de embarque (GPS)"); return; }
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

      const { error } = await supabase.from("ride_requests").insert({
        passenger_id: user.id,
        event_id: event.id,
        event_name: event.title,
        venue_name: event.venue_name,
        event_date: rideTimestamp,
        // Origin (GPS-first)
        pickup_address: originAddress,
        origin_lat: originCoords.lat,
        origin_lng: originCoords.lng,
        origin_accuracy: originAccuracy,
        origin_source: originSource ?? "gps",
        // Destination — LOCKED to event
        destination_address: event.address || event.venue_name || event.title,
        destination_lat: event.latitude,
        destination_lng: event.longitude,
        passengers_count: passengersCount,
        seats_available: Math.min(4, Math.max(1, passengersCount)),
        price_note: priceNote || "Rachada combinada no chat",
        notes: notes?.trim() || null,
        status: "open",
      } as any);
      if (error) throw error;

      setSuccess(true);
      toast.success("Pedido de carona enviado com sucesso");
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
        </section>

        {/* Step 2 — Origin via GPS */}
        <section className="rounded-3xl border border-border/40 bg-card/40 backdrop-blur-xl p-4 space-y-3 shadow-[0_0_30px_-15px_hsl(var(--primary)/0.4)]">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-primary/80">
            <span className="w-5 h-5 rounded-full bg-primary/15 border border-primary/40 grid place-items-center text-[10px] font-bold">2</span>
            Onde te buscar?
          </div>

          <Button
            type="button"
            onClick={useMyLocation}
            disabled={geoLoading}
            className="w-full h-11 rounded-xl gap-2"
            variant={originCoords ? "outline" : "default"}
          >
            <Crosshair className="w-4 h-4" />
            {geoLoading ? "Capturando GPS..." : originCoords ? "Recapturar localização" : "Usar minha localização (GPS)"}
          </Button>

          {geoError && (
            <p className="text-[11px] text-destructive">{geoError}</p>
          )}

          {originCoords && (
            <div className="rounded-2xl border border-border/40 bg-card/40 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-primary/80 font-bold">
                <Navigation className="w-3 h-3" />
                {originSource === "gps" && "GPS"}
                {originSource === "manual_pin_adjustment" && "Pin ajustado manualmente"}
                {originSource === "fallback_address" && "Endereço informado"}
                {originAccuracy != null && originSource === "gps" && (
                  <span className="text-muted-foreground normal-case font-normal">
                    · precisão ~{Math.round(originAccuracy)}m
                  </span>
                )}
              </div>
              <p className="text-xs text-foreground">{originAddress || "Endereço aproximado..."}</p>
              <p className="text-[10px] text-muted-foreground">
                Confira no mapa abaixo. Arraste o pin 📍 para ajustar o ponto exato de embarque.
              </p>
            </div>
          )}

          <div
            ref={mapRef}
            className={`w-full rounded-xl overflow-hidden border border-border/40 transition-all duration-300 ${
              event?.latitude != null ? "h-[220px] opacity-100" : "h-0 opacity-0"
            }`}
          />

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
            <Label className="text-xs text-muted-foreground">Valor / rachada</Label>
            <Input
              value={priceNote}
              onChange={(e) => setPriceNote(e.target.value.slice(0, 80))}
              placeholder="Ex: R$ 20 por pessoa ou combinar"
              className="h-11 rounded-xl bg-card border-border/40 text-sm"
            />
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
        </section>

        <Button
          type="submit"
          disabled={loading || windowClosed || !originCoords}
          className="w-full h-12 rounded-xl font-semibold text-sm gap-2"
        >
          <Send className="w-4 h-4" />
          {loading ? "Enviando..." : !originCoords ? "Capture seu GPS para continuar" : "Publicar pedido"}
        </Button>
      </form>
    </div>
  );
}
