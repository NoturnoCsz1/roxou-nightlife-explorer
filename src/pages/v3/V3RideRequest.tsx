import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Clock, Users, Send, Navigation, MapPin, ExternalLink, Route as RouteIcon, User, Phone, CheckCircle2 } from "lucide-react";
import LegalDisclaimer from "@/components/v3/LegalDisclaimer";
import PlacesAutocomplete from "@/components/v3/PlacesAutocomplete";
import { getRideEstimatedEnd, getRideRequestDeadline, isRideWindowClosed, isSameSaoPauloDate, RIDE_EXPIRED_MESSAGE, toSaoPauloTimestamp } from "@/lib/rideTimeRules";
import { maskWhatsappBR } from "@/lib/v3Validation";

function toLocalDatetime(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ""; }
}

function mapsSearchUrl(addr: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
}
function mapsRouteUrl(origin: string, destination: string) {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`;
}

export default function V3RideRequest() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [eventName, setEventName] = useState(searchParams.get("event") || "");
  const [venueName, setVenueName] = useState(searchParams.get("venue") || "");
  const [eventDate, setEventDate] = useState(toLocalDatetime(searchParams.get("date") || ""));
  const [pickup, setPickup] = useState("");
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destination, setDestination] = useState(searchParams.get("venue") || "");
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [passengersCount, setPassengersCount] = useState(1);
  const [priceNote, setPriceNote] = useState("Rachada combinada no chat");
  const [notes, setNotes] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  const originalEventDate = searchParams.get("date") || "";
  const eventIdParam = searchParams.get("eventId");
  const windowClosed = isRideWindowClosed(originalEventDate || eventDate);
  const deadline = getRideRequestDeadline(originalEventDate || eventDate);

  // Pre-load profile to fill name + whatsapp
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name, whatsapp")
        .eq("user_id", user.id)
        .maybeSingle();
      if (prof?.display_name) setDisplayName(prof.display_name);
      if ((prof as any)?.whatsapp) setWhatsapp((prof as any).whatsapp);
    })();
  }, []);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocalização não suportada neste navegador");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setPickupCoords({ lat: latitude, lng: longitude });
        try {
          // Reverse geocode via Google (uses public maps key already loaded by PlacesAutocomplete)
          if ((window as any).google?.maps) {
            const geocoder = new (window as any).google.maps.Geocoder();
            const res = await geocoder.geocode({ location: { lat: latitude, lng: longitude } });
            const addr = res?.results?.[0]?.formatted_address;
            if (addr) {
              setPickup(addr);
              toast.success("Localização preenchida");
              return;
            }
          }
          setPickup(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          toast.success("Coordenadas capturadas");
        } catch {
          setPickup(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoLoading(false);
        toast.error(err.message || "Não foi possível obter sua localização");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!pickup.trim()) { toast.error("Informe o endereço de partida"); return; }
    if (!destination.trim()) { toast.error("Informe o endereço de destino"); return; }
    if (!whatsapp.trim() || !/^\(\d{2}\) \d{4,5}-\d{4}$/.test(whatsapp)) {
      toast.error("Informe um WhatsApp válido (XX) XXXXX-XXXX");
      return;
    }
    if (!eventDate) { toast.error("Informe o horário desejado"); return; }

    const rideTimestamp = toSaoPauloTimestamp(eventDate);
    if (isRideWindowClosed(originalEventDate || rideTimestamp)) {
      toast.error(RIDE_EXPIRED_MESSAGE);
      return;
    }
    if (originalEventDate && rideTimestamp && !isSameSaoPauloDate(originalEventDate, rideTimestamp)) {
      toast.error("A data da carona deve ser a mesma data do evento selecionado.");
      return;
    }
    const estimatedEnd = getRideEstimatedEnd(originalEventDate || rideTimestamp);
    if (estimatedEnd && rideTimestamp && new Date(rideTimestamp) > estimatedEnd) {
      toast.error("O horário da carona não pode ser posterior ao término estimado do evento.");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Entre para solicitar transporte");
        navigate("/auth?redirect=/pedir-carona");
        return;
      }

      // Update profile with name + whatsapp (best-effort)
      if (displayName.trim() || whatsapp.trim()) {
        await supabase.from("profiles").update({
          display_name: displayName.trim() || undefined,
          whatsapp: whatsapp.trim() || undefined,
        } as any).eq("user_id", user.id);
      }

      // NOTE: pickup_lat/lng + destination_lat/lng + event_id columns are not yet in ride_requests.
      // Saving coords inline within notes until a future migration adds dedicated columns.
      const coordSummary = [
        pickupCoords ? `Partida: ${pickupCoords.lat.toFixed(6)},${pickupCoords.lng.toFixed(6)}` : null,
        destinationCoords ? `Destino: ${destinationCoords.lat.toFixed(6)},${destinationCoords.lng.toFixed(6)}` : null,
      ].filter(Boolean).join(" | ");
      const finalNotes = [notes?.trim(), coordSummary].filter(Boolean).join("\n\n");

      const { error } = await supabase.from("ride_requests").insert({
        event_name: eventName || null,
        venue_name: venueName || null,
        event_date: rideTimestamp,
        pickup_address: pickup,
        destination_address: destination,
        passengers_count: passengersCount,
        seats_available: Math.min(4, Math.max(1, passengersCount)),
        price_note: priceNote || "Rachada combinada no chat",
        notes: finalNotes || null,
        passenger_id: user.id,
        status: "open",
        ...(eventIdParam ? { event_id: eventIdParam } : {}),
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

  if (success) {
    return (
      <div className="px-4 py-10 max-w-md mx-auto space-y-5">
        <div className="rounded-3xl p-6 bg-card/40 backdrop-blur-xl border border-primary/30 shadow-[0_0_40px_-10px_hsl(var(--primary)/0.4)] text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-display font-bold text-xl">Pedido enviado!</h1>
          <p className="text-sm text-muted-foreground">
            Pedido de carona enviado com sucesso. Motoristas poderão visualizar sua solicitação.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/meus-pedidos">Meus pedidos</Link>
            </Button>
            <Button asChild className="rounded-xl">
              <Link to="/transporte">Voltar</Link>
            </Button>
          </div>
          {pickup && destination && (
            <a
              href={mapsRouteUrl(pickup, destination)}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
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
          <p className="text-xs text-muted-foreground">Preencha os dados e aguarde propostas</p>
        </div>
      </div>

      <LegalDisclaimer />

      <div className="rounded-2xl border border-border/30 bg-card/30 backdrop-blur-md p-3 text-[11px] text-muted-foreground">
        A Roxou apenas conecta passageiros e motoristas. A negociação da corrida é feita diretamente entre as partes.
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
        {/* Step 1: Destination */}
        <section className="rounded-3xl border border-border/40 bg-card/40 backdrop-blur-xl p-4 space-y-3 shadow-[0_0_30px_-15px_hsl(var(--primary)/0.4)]">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-primary/80">
            <span className="w-5 h-5 rounded-full bg-primary/15 border border-primary/40 grid place-items-center text-[10px] font-bold">1</span>
            Para onde você vai?
          </div>
          <PlacesAutocomplete
            value={destination}
            onChange={setDestination}
            onPlaceSelect={(p) => { setDestination(p.address); setDestinationCoords({ lat: p.lat, lng: p.lng }); }}
            placeholder="Endereço, local ou nome do evento"
            label="Destino"
            required
            showMap
          />
          {destination && (
            <a href={mapsSearchUrl(destination)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] text-primary hover:underline">
              <ExternalLink className="w-3 h-3" /> Ver destino no Maps
            </a>
          )}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Evento (opcional)</Label>
            <Input
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Nome do evento"
              className="h-11 rounded-xl bg-card border-border/40 text-sm"
            />
          </div>
        </section>

        {/* Step 2: Pickup */}
        <section className="rounded-3xl border border-border/40 bg-card/40 backdrop-blur-xl p-4 space-y-3 shadow-[0_0_30px_-15px_hsl(var(--primary)/0.4)]">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-primary/80">
            <span className="w-5 h-5 rounded-full bg-primary/15 border border-primary/40 grid place-items-center text-[10px] font-bold">2</span>
            Onde buscar?
          </div>
          <PlacesAutocomplete
            value={pickup}
            onChange={setPickup}
            onPlaceSelect={(p) => { setPickup(p.address); setPickupCoords({ lat: p.lat, lng: p.lng }); }}
            placeholder="Seu endereço de partida"
            label="Partida"
            required
            showMap
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm"
              onClick={useMyLocation} disabled={geoLoading}
              className="rounded-xl text-xs gap-1.5">
              <Navigation className="w-3.5 h-3.5" />
              {geoLoading ? "Obtendo..." : "Usar minha localização"}
            </Button>
            {pickup && (
              <a href={mapsSearchUrl(pickup)} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] text-primary hover:underline px-2 py-1">
                <MapPin className="w-3 h-3" /> Ver partida no Maps
              </a>
            )}
          </div>
          {pickup && destination && (
            <a href={mapsRouteUrl(pickup, destination)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] text-primary hover:underline">
              <RouteIcon className="w-3 h-3" /> Ver rota completa no Maps
            </a>
          )}
        </section>

        {/* Step 3: Confirm */}
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
                  key={n}
                  type="button"
                  onClick={() => setPassengersCount(n)}
                  className={`w-10 h-10 rounded-xl text-sm font-semibold transition-colors ${
                    passengersCount === n
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border/40 text-foreground hover:border-primary/40"
                  }`}
                >
                  {n}
                </button>
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
          disabled={loading}
          aria-disabled={windowClosed}
          className="w-full h-12 rounded-xl font-semibold text-sm gap-2"
          onClick={(e) => {
            if (windowClosed) {
              e.preventDefault();
              toast.error(RIDE_EXPIRED_MESSAGE);
            }
          }}
        >
          <Send className="w-4 h-4" />
          {loading ? "Enviando..." : "Publicar pedido"}
        </Button>
      </form>
    </div>
  );
}
