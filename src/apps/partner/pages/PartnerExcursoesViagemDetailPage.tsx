/**
 * PartnerExcursoesViagemDetailPage — FASE 7.2
 *
 * Detalhe de uma viagem: header com status, controles de operação
 * (abrir / encerrar / cancelar / finalizar) e mapa simples de assentos.
 * Cada assento abre um drawer com troca de status e dados básicos do
 * passageiro (uso interno — passageiro público + QR ficam para 7.3).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  CircleSlash,
  Lock,
  PlayCircle,
  Trash2,
} from "lucide-react";
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
import { usePartnerAuth, canManageEvents } from "../hooks/usePartnerAuth";
import {
  deleteExcursionTrip,
  getExcursionTrip,
  listExcursionSeats,
  seatStatusLabel,
  setExcursionTripStatus,
  summarizeSeats,
  tripStatusLabel,
  updateExcursionSeat,
  type ExcursionSeat,
  type ExcursionSeatStatus,
  type ExcursionTrip,
} from "../services/partnerExcursoes";

const STATUS_CLASSES: Record<ExcursionSeatStatus, string> = {
  free: "bg-white/5 border-white/10 text-foreground/70",
  reserved: "bg-amber-500/15 border-amber-400/30 text-amber-200",
  paid: "bg-emerald-500/15 border-emerald-400/30 text-emerald-200",
  boarded: "bg-sky-500/20 border-sky-400/40 text-sky-100",
  cancelled: "bg-rose-500/10 border-rose-400/20 text-rose-300/70 line-through",
};

const NEXT_STATUSES: ExcursionSeatStatus[] = [
  "free",
  "reserved",
  "paid",
  "boarded",
  "cancelled",
];

const PartnerExcursoesViagemDetailPage = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { selectedPartner, role } = usePartnerAuth();
  const canEdit = canManageEvents(role);

  const [trip, setTrip] = useState<ExcursionTrip | null>(null);
  const [seats, setSeats] = useState<ExcursionSeat[]>([]);
  const [loading, setLoading] = useState(false);
  const [seatOpen, setSeatOpen] = useState(false);
  const [activeSeat, setActiveSeat] = useState<ExcursionSeat | null>(null);
  const [savingSeat, setSavingSeat] = useState(false);

  const load = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    try {
      const [t, s] = await Promise.all([
        getExcursionTrip(tripId),
        listExcursionSeats(tripId),
      ]);
      setTrip(t);
      setSeats(s);
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => summarizeSeats(seats), [seats]);

  if (!selectedPartner) {
    return (
      <PartnerScreen title="Viagem">
        <PartnerEmptyState ctaLabel="Voltar" ctaTo="/excursoes" />
      </PartnerScreen>
    );
  }

  if (!trip && !loading) {
    return (
      <PartnerScreen title="Viagem">
        <PartnerEmptyState ctaLabel="Voltar" ctaTo="/excursoes/viagens" />
      </PartnerScreen>
    );
  }

  const handleStatus = async (next: ExcursionTrip["status"]) => {
    if (!trip) return;
    try {
      const updated = await setExcursionTripStatus(trip.id, next);
      setTrip(updated);
      toast({ title: `Viagem ${tripStatusLabel(next).toLowerCase()}` });
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    }
  };

  const handleDelete = async () => {
    if (!trip) return;
    if (!window.confirm("Excluir esta viagem? Os assentos serão removidos.")) return;
    try {
      await deleteExcursionTrip(trip.id);
      toast({ title: "Viagem excluída" });
      navigate("/excursoes/viagens", { replace: true });
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    }
  };

  const handleSaveSeat = async (patch: {
    status: ExcursionSeatStatus;
    passenger_name: string;
    passenger_phone: string;
    notes: string;
  }) => {
    if (!activeSeat) return;
    setSavingSeat(true);
    try {
      const updated = await updateExcursionSeat(activeSeat.id, patch);
      setSeats((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s)),
      );
      setSeatOpen(false);
      setActiveSeat(null);
      toast({ title: "Assento atualizado" });
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    } finally {
      setSavingSeat(false);
    }
  };

  return (
    <PartnerScreen
      title={trip?.title ?? "Viagem"}
      subtitle={
        trip
          ? new Date(trip.departure_at).toLocaleString("pt-BR", {
              timeZone: "America/Sao_Paulo",
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })
          : undefined
      }
      right={
        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigate("/excursoes/viagens")}
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      }
    >
      {loading && !trip ? (
        <p className="text-xs text-muted-foreground text-center">Carregando…</p>
      ) : null}

      {trip ? (
        <>
          {/* KPI */}
          <Card className="rounded-2xl border-white/8 bg-gradient-to-br from-sky-500/10 to-violet-500/5">
            <CardContent className="p-4 grid grid-cols-4 gap-2 text-center">
              <KpiBox label="Livres" value={summary.free} />
              <KpiBox label="Reserv." value={summary.reserved} />
              <KpiBox label="Pagos" value={summary.paid} />
              <KpiBox label="Embarc." value={summary.boarded} />
            </CardContent>
          </Card>

          {/* Status + ações */}
          <Card>
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Status
                </span>
                <span className="text-sm font-medium">
                  {tripStatusLabel(trip.status)}
                </span>
              </div>
              {canEdit ? (
                <div className="grid grid-cols-2 gap-2">
                  {trip.status !== "open" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatus("open")}
                    >
                      <PlayCircle className="h-4 w-4 mr-1" />
                      Abrir
                    </Button>
                  ) : null}
                  {trip.status === "open" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatus("closed")}
                    >
                      <Lock className="h-4 w-4 mr-1" />
                      Encerrar
                    </Button>
                  ) : null}
                  {trip.status !== "finished" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatus("finished")}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Finalizar
                    </Button>
                  ) : null}
                  {trip.status !== "cancelled" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatus("cancelled")}
                    >
                      <CircleSlash className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive col-span-2"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Excluir viagem
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Mapa de assentos */}
          <section className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground">
                Assentos ({summary.occupied}/{summary.total})
              </h2>
              <Legend />
            </div>
            <div className="grid grid-cols-5 gap-2">
              {seats.map((seat) => (
                <button
                  key={seat.id}
                  type="button"
                  onClick={() => {
                    if (!canEdit) return;
                    setActiveSeat(seat);
                    setSeatOpen(true);
                  }}
                  className={`aspect-square rounded-xl border text-xs font-semibold tabular-nums transition-colors ${STATUS_CLASSES[seat.status]} ${canEdit ? "active:scale-95" : "cursor-default"}`}
                  aria-label={`Assento ${seat.seat_number} — ${seatStatusLabel(seat.status)}`}
                >
                  {seat.seat_number}
                </button>
              ))}
              {seats.length === 0 ? (
                <p className="col-span-5 text-center text-xs text-muted-foreground py-6">
                  Nenhum assento configurado.
                </p>
              ) : null}
            </div>
          </section>
        </>
      ) : null}

      <Sheet
        open={seatOpen}
        onOpenChange={(o) => {
          setSeatOpen(o);
          if (!o) setActiveSeat(null);
        }}
      >
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {activeSeat ? `Assento ${activeSeat.seat_number}` : "Assento"}
            </SheetTitle>
          </SheetHeader>
          {activeSeat ? (
            <SeatForm
              seat={activeSeat}
              submitting={savingSeat}
              onSubmit={handleSaveSeat}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </PartnerScreen>
  );
};

function KpiBox({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Legend() {
  const items: Array<{ label: string; status: ExcursionSeatStatus }> = [
    { label: "Livre", status: "free" },
    { label: "Res.", status: "reserved" },
    { label: "Pago", status: "paid" },
    { label: "Emb.", status: "boarded" },
  ];
  return (
    <div className="flex items-center gap-1.5">
      {items.map((it) => (
        <span
          key={it.status}
          className={`text-[9px] px-1.5 py-0.5 rounded-md border ${STATUS_CLASSES[it.status]}`}
        >
          {it.label}
        </span>
      ))}
    </div>
  );
}

interface SeatFormProps {
  seat: ExcursionSeat;
  submitting: boolean;
  onSubmit: (patch: {
    status: ExcursionSeatStatus;
    passenger_name: string;
    passenger_phone: string;
    notes: string;
  }) => void;
}

function SeatForm({ seat, submitting, onSubmit }: SeatFormProps) {
  const [status, setStatus] = useState<ExcursionSeatStatus>(seat.status);
  const [name, setName] = useState(seat.passenger_name ?? "");
  const [phone, setPhone] = useState(seat.passenger_phone ?? "");
  const [notes, setNotes] = useState(seat.notes ?? "");

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      status,
      passenger_name: name,
      passenger_phone: phone,
      notes,
    });
  };

  return (
    <form className="space-y-3 py-2" onSubmit={handle}>
      <div className="space-y-1">
        <Label>Status</Label>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as ExcursionSeatStatus)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NEXT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {seatStatusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="seat-name">Passageiro</Label>
        <Input
          id="seat-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome completo"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="seat-phone">Telefone</Label>
        <Input
          id="seat-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(16) 9 0000-0000"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="seat-notes">Observações</Label>
        <Input
          id="seat-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Janela, idoso, etc."
        />
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}

export default PartnerExcursoesViagemDetailPage;
