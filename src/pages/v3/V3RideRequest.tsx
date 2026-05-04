import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Clock, Users, Send } from "lucide-react";
import LegalDisclaimer from "@/components/v3/LegalDisclaimer";
import PlacesAutocomplete from "@/components/v3/PlacesAutocomplete";
import { getRideEstimatedEnd, getRideRequestDeadline, isRideWindowClosed, isSameSaoPauloDate, RIDE_EXPIRED_MESSAGE, toSaoPauloTimestamp } from "@/lib/rideTimeRules";

function toLocalDatetime(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ""; }
}

export default function V3RideRequest() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [eventName, setEventName] = useState(searchParams.get("event") || "");
  const [venueName, setVenueName] = useState(searchParams.get("venue") || "");
  const [eventDate, setEventDate] = useState(toLocalDatetime(searchParams.get("date") || ""));
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState(searchParams.get("venue") || "");
  const [passengersCount, setPassengersCount] = useState(1);
  const [priceNote, setPriceNote] = useState("Rachada combinada no chat");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const originalEventDate = searchParams.get("date") || "";
  const windowClosed = isRideWindowClosed(originalEventDate || eventDate);
  const deadline = getRideRequestDeadline(originalEventDate || eventDate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) {
      toast.error("Informe o destino");
      return;
    }
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
        navigate("/v3/auth?redirect=/v3/transporte");
        return;
      }
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name, nickname")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!prof?.display_name?.trim() || !(prof as any)?.nickname?.trim()) {
        toast.error("Complete seu perfil (nome e apelido) para solicitar transporte.");
        navigate("/v3/perfil/editar");
        return;
      }
      const { error } = await supabase.from("ride_requests").insert({
        event_name: eventName || null,
        venue_name: venueName || null,
        event_date: rideTimestamp,
        pickup_address: pickup || null,
        destination_address: destination,
        passengers_count: passengersCount,
        seats_available: Math.min(4, Math.max(1, passengersCount)),
        price_note: priceNote || "Rachada combinada no chat",
        notes: notes || null,
        passenger_id: user.id,
      } as any);
      if (error) throw error;
      toast.success("Pedido criado com sucesso!");
      navigate("/v3/transporte");
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar pedido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-6 max-w-md mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/v3/transporte" className="p-2 -ml-2 rounded-xl hover:bg-card transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="font-display font-bold text-xl text-foreground">Pedir carona</h1>
          <p className="text-xs text-muted-foreground">Preencha os dados e aguarde propostas</p>
        </div>
      </div>

      <LegalDisclaimer />

      {windowClosed ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Sistema de carona encerrado para este evento
        </div>
      ) : deadline ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/10 p-3 text-xs text-primary">
          Solicitações abertas até {deadline.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Event info */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Evento (opcional)</Label>
          <Input
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="Nome do evento"
            className="h-11 rounded-xl bg-card border-border/40 text-sm"
          />
        </div>

        {/* Pickup with Google Maps Autocomplete */}
        <PlacesAutocomplete
          value={pickup}
          onChange={setPickup}
          onPlaceSelect={(p) => setPickup(p.address)}
          placeholder="De onde você sai?"
          label="Origem"
          showMap
        />

        {/* Destination with Google Maps Autocomplete */}
        <PlacesAutocomplete
          value={destination}
          onChange={setDestination}
          onPlaceSelect={(p) => setDestination(p.address)}
          placeholder="Para onde você vai?"
          label="Destino"
          required
          showMap
        />

        {/* Date/time */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Horário
          </Label>
          <Input
            type="datetime-local"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="h-11 rounded-xl bg-card border-border/40 text-sm"
          />
        </div>

        {/* Passengers */}
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

        {/* Notes */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Observações</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Alguma informação extra para o motorista?"
            className="rounded-xl bg-card border-border/40 text-sm min-h-[80px] resize-none"
          />
        </div>

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
