/**
 * PartnerExcursoesViagensPage — FASE 7.2
 *
 * Lista todas as viagens (sessões diárias) do parceiro com criação
 * inline. Cada viagem leva à PartnerExcursoesViagemDetailPage com o
 * mapa de assentos. Suporta ?new=1 para abrir o formulário.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Bus, CalendarRange, ChevronRight, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { PartnerScreen } from "../components/PartnerScreen";
import { PartnerEmptyState } from "../components/PartnerEmptyState";
import { onFabClick } from "../components/PartnerFab";
import { usePartnerAuth, canManageEvents } from "../hooks/usePartnerAuth";
import {
  createExcursionTrip,
  listExcursionTrips,
  listExcursionVehicles,
  tripStatusLabel,
  type ExcursionTrip,
  type ExcursionTripPayload,
  type ExcursionVehicle,
} from "../services/partnerExcursoes";

const STATUS_COLORS: Record<ExcursionTrip["status"], string> = {
  draft: "bg-white/10 text-foreground/70",
  open: "bg-emerald-500/15 text-emerald-300",
  closed: "bg-amber-500/15 text-amber-300",
  cancelled: "bg-rose-500/15 text-rose-300",
  finished: "bg-sky-500/15 text-sky-300",
};

interface TripFormProps {
  vehicles: ExcursionVehicle[];
  submitting: boolean;
  onSubmit: (payload: ExcursionTripPayload) => void;
}

function TripForm({ vehicles, submitting, onSubmit }: TripFormProps) {
  const activeVehicles = vehicles.filter((v) => v.is_active);
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [vehicleId, setVehicleId] = useState<string>(
    activeVehicles[0]?.id ?? "none",
  );
  const [capacity, setCapacity] = useState<string>(
    String(activeVehicles[0]?.capacity ?? 40),
  );
  const [departureAt, setDepartureAt] = useState<string>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 6);
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [price, setPrice] = useState<string>("0");
  const [address, setAddress] = useState("");

  const handleVehicle = (id: string) => {
    setVehicleId(id);
    const v = vehicles.find((x) => x.id === id);
    if (v && v.capacity > 0) setCapacity(String(v.capacity));
  };

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    const cap = Number(capacity);
    const cents = Math.round(Number(price.replace(",", ".") || "0") * 100);
    if (!title.trim()) {
      toast({ title: "Informe o título da viagem" });
      return;
    }
    if (!departureAt) {
      toast({ title: "Informe a data e hora de partida" });
      return;
    }
    if (!Number.isFinite(cap) || cap <= 0) {
      toast({ title: "Capacidade inválida" });
      return;
    }
    // local datetime → ISO com offset SP (-03:00)
    const isoLocal = `${departureAt}:00-03:00`;
    onSubmit({
      title,
      destination: destination || null,
      departure_address: address || null,
      departure_at: new Date(isoLocal).toISOString(),
      session_date: departureAt.slice(0, 10),
      vehicle_id: vehicleId !== "none" ? vehicleId : null,
      capacity: cap,
      price_cents: cents,
      status: "draft",
    });
  };

  return (
    <form className="space-y-3 py-2" onSubmit={handle}>
      <div className="space-y-1">
        <Label htmlFor="ex-trip-title">Título</Label>
        <Input
          id="ex-trip-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: Excursão Lollapalooza"
          autoFocus
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="ex-trip-dest">Destino</Label>
        <Input
          id="ex-trip-dest"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Ex.: Autódromo Interlagos — SP"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="ex-trip-addr">Ponto de partida</Label>
        <Input
          id="ex-trip-addr"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Av. Brasil, 1000 — São Carlos"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="ex-trip-dep">Partida</Label>
          <Input
            id="ex-trip-dep"
            type="datetime-local"
            value={departureAt}
            onChange={(e) => setDepartureAt(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ex-trip-price">Preço (R$)</Label>
          <Input
            id="ex-trip-price"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0,00"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Veículo</Label>
        <Select value={vehicleId} onValueChange={handleVehicle}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem veículo</SelectItem>
            {activeVehicles.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.name} · {v.capacity} lugares
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="ex-trip-cap">Capacidade (assentos)</Label>
        <Input
          id="ex-trip-cap"
          inputMode="numeric"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ""))}
          placeholder="40"
        />
        <p className="text-[11px] text-muted-foreground">
          O mapa de assentos será gerado automaticamente.
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Criando…" : "Criar viagem"}
      </Button>
    </form>
  );
}

const PartnerExcursoesViagensPage = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { selectedPartner, role } = usePartnerAuth();
  const partnerId = selectedPartner?.id ?? null;
  const canCreate = canManageEvents(role);

  const [trips, setTrips] = useState<ExcursionTrip[]>([]);
  const [vehicles, setVehicles] = useState<ExcursionVehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      const [ts, vs] = await Promise.all([
        listExcursionTrips(partnerId),
        listExcursionVehicles(partnerId),
      ]);
      setTrips(ts);
      setVehicles(vs);
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (params.get("new") === "1" && canCreate) {
      setFormOpen(true);
      params.delete("new");
      setParams(params, { replace: true });
    }
  }, [params, setParams, canCreate]);

  useEffect(
    () =>
      onFabClick("excursoes:trip:new", () => {
        if (!canCreate) return;
        setFormOpen(true);
      }),
    [canCreate],
  );

  const buckets = useMemo(() => {
    const upcoming: ExcursionTrip[] = [];
    const past: ExcursionTrip[] = [];
    const cutoff = Date.now();
    for (const t of trips) {
      if (
        t.status === "finished" ||
        t.status === "cancelled" ||
        new Date(t.departure_at).getTime() < cutoff - 6 * 3600 * 1000
      ) {
        past.push(t);
      } else {
        upcoming.push(t);
      }
    }
    upcoming.sort((a, b) => a.departure_at.localeCompare(b.departure_at));
    return { upcoming, past };
  }, [trips]);

  const handleSubmit = async (payload: ExcursionTripPayload) => {
    if (!partnerId) return;
    setSubmitting(true);
    try {
      const created = await createExcursionTrip(partnerId, payload);
      toast({ title: "Viagem criada" });
      setFormOpen(false);
      void load();
      navigate(`/excursoes/viagens/${created.id}`);
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  if (!partnerId) {
    return (
      <PartnerScreen title="Viagens">
        <PartnerEmptyState ctaLabel="Voltar" ctaTo="/excursoes" />
      </PartnerScreen>
    );
  }

  return (
    <PartnerScreen
      title="Viagens"
      subtitle="Excursões oficiais"
      right={
        canCreate ? (
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nova
          </Button>
        ) : null
      }
    >
      {loading && !trips.length ? (
        <p className="text-xs text-muted-foreground text-center">Carregando…</p>
      ) : null}

      {!loading && !trips.length ? (
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <div className="mx-auto h-10 w-10 rounded-xl bg-white/8 flex items-center justify-center">
              <Bus className="h-5 w-5 text-foreground/70" />
            </div>
            <p className="text-sm font-medium">Nenhuma viagem ainda</p>
            <p className="text-[12px] text-muted-foreground">
              Crie uma viagem para gerar o mapa de assentos.
            </p>
            {canCreate ? (
              <Button size="sm" onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Criar viagem
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {buckets.upcoming.length ? (
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground px-1">
            Próximas
          </h2>
          <div className="grid gap-2">
            {buckets.upcoming.map((t) => (
              <TripCard
                key={t.id}
                trip={t}
                onOpen={() => navigate(`/excursoes/viagens/${t.id}`)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {buckets.past.length ? (
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground px-1">
            Encerradas
          </h2>
          <div className="grid gap-2">
            {buckets.past.map((t) => (
              <TripCard
                key={t.id}
                trip={t}
                onOpen={() => navigate(`/excursoes/viagens/${t.id}`)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Nova viagem</SheetTitle>
          </SheetHeader>
          {vehicles.length === 0 ? (
            <div className="py-4 space-y-3 text-center">
              <p className="text-sm">
                Cadastre ao menos um veículo antes de criar uma viagem.
              </p>
              <Button
                size="sm"
                onClick={() => {
                  setFormOpen(false);
                  navigate("/excursoes/veiculos");
                }}
              >
                Cadastrar veículo
              </Button>
            </div>
          ) : (
            <TripForm
              vehicles={vehicles}
              submitting={submitting}
              onSubmit={handleSubmit}
            />
          )}
        </SheetContent>
      </Sheet>
    </PartnerScreen>
  );
};

interface TripCardProps {
  trip: ExcursionTrip;
  onOpen: () => void;
}

function TripCard({ trip, onOpen }: TripCardProps) {
  const dt = new Date(trip.departure_at).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-2xl border border-white/8 bg-card/40 hover:bg-card/60 transition-colors"
    >
      <div className="p-3 flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 rounded-xl bg-sky-500/15 text-sky-300 flex items-center justify-center">
          <CalendarRange className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-sm font-medium truncate">{trip.title}</p>
            <span
              className={`shrink-0 text-[9px] uppercase tracking-wider rounded-full px-1.5 py-0.5 ${STATUS_COLORS[trip.status]}`}
            >
              {tripStatusLabel(trip.status)}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            {dt}
            {trip.destination ? ` · ${trip.destination}` : ""}
            {" · "}
            {trip.capacity} lugares
          </p>
        </div>
        <ChevronRight className="mr-1 h-4 w-4 text-muted-foreground/60 shrink-0" />
      </div>
    </button>
  );
}

export default PartnerExcursoesViagensPage;
