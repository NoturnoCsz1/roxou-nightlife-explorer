import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Clock, Users, Send } from "lucide-react";
import LegalDisclaimer from "@/components/v3/LegalDisclaimer";

export default function V3RideRequest() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [eventName, setEventName] = useState(searchParams.get("event") || "");
  const [venueName, setVenueName] = useState(searchParams.get("venue") || "");
  const [eventDate, setEventDate] = useState(searchParams.get("date") || "");
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState(searchParams.get("venue") || "");
  const [passengersCount, setPassengersCount] = useState(1);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) {
      toast.error("Informe o destino");
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("ride_requests").insert({
        event_name: eventName || null,
        venue_name: venueName || null,
        event_date: eventDate || null,
        pickup_address: pickup || null,
        destination_address: destination,
        passengers_count: passengersCount,
        notes: notes || null,
        passenger_id: user?.id || null,
      });
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

        {/* Pickup */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> Origem
          </Label>
          <Input
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            placeholder="De onde você sai?"
            className="h-11 rounded-xl bg-card border-border/40 text-sm"
          />
        </div>

        {/* Destination */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> Destino *
          </Label>
          <Input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Para onde você vai?"
            className="h-11 rounded-xl bg-card border-border/40 text-sm"
            required
          />
        </div>

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
          className="w-full h-12 rounded-xl font-semibold text-sm gap-2"
        >
          <Send className="w-4 h-4" />
          {loading ? "Enviando..." : "Publicar pedido"}
        </Button>
      </form>
    </div>
  );
}
