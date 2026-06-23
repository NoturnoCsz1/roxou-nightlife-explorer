/**
 * PartnerExcursaoOperacaoPage — Fase 7.4
 *
 * Painel operacional ao vivo do organizador para uma viagem específica.
 * Mostra:
 *  - veículo, motorista, ETA, KPIs (passageiros, embarcados, pendentes),
 *  - última posição GPS (com link Google Maps),
 *  - mudança rápida de operation_status,
 *  - exportar lista de passageiros.
 *
 * Usa Supabase Realtime para refletir pings sem polling.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bus,
  Clock,
  Download,
  ExternalLink,
  MapPin,
  Radio,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getExcursionTrip,
  listExcursionSeats,
  listExcursionVehicles,
  type ExcursionTrip,
  type ExcursionSeat,
  type ExcursionVehicle,
} from "@/apps/partner/services/partnerExcursoes";
import {
  getLatestPing,
  operationStatusEmoji,
  operationStatusLabel,
  setOperationStatus,
  subscribeLatestPing,
  type ExcursionGpsPing,
  type ExcursionOperationStatus,
} from "@/services/excursionGps";

const OP_STATUSES: ExcursionOperationStatus[] = [
  "scheduled",
  "boarding",
  "en_route",
  "arrived",
  "returning",
  "completed",
  "cancelled",
];

function exportPassengersCsv(trip: ExcursionTrip, seats: ExcursionSeat[]) {
  const header = ["Assento", "Status", "Passageiro", "Telefone", "Documento"];
  const rows = seats
    .filter((s) => s.status !== "free")
    .map((s) => [
      s.seat_number,
      s.status,
      s.passenger_name ?? "",
      s.passenger_phone ?? "",
      s.passenger_doc ?? "",
    ]);
  const csv =
    [header, ...rows]
      .map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n") + "\n";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `excursao-${trip.id}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PartnerExcursaoOperacaoPage() {
  const { tripId = "" } = useParams<{ tripId: string }>();
  const [trip, setTrip] = useState<ExcursionTrip | null>(null);
  const [seats, setSeats] = useState<ExcursionSeat[]>([]);
  const [vehicle, setVehicle] = useState<ExcursionVehicle | null>(null);
  const [ping, setPing] = useState<ExcursionGpsPing | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Operação ao vivo · Roxou Excursões";
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const t = await getExcursionTrip(tripId);
        if (!alive) return;
        setTrip(t);
        const [ss, vs, p] = await Promise.all([
          listExcursionSeats(tripId).catch(() => []),
          listExcursionVehicles(t.partner_id).catch(() => []),
          getLatestPing(tripId).catch(() => null),
        ]);
        if (!alive) return;
        setSeats(ss);
        setVehicle(vs.find((v) => v.id === t.vehicle_id) ?? null);
        setPing(p);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao carregar");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [tripId]);

  // Realtime GPS
  useEffect(() => {
    if (!tripId) return;
    const off = subscribeLatestPing(tripId, (p) => setPing(p));
    return off;
  }, [tripId]);

  const stats = useMemo(() => {
    const total = seats.length;
    const sold = seats.filter((s) =>
      ["reserved", "paid", "boarded"].includes(s.status),
    ).length;
    const boarded = seats.filter((s) => s.status === "boarded").length;
    const pending = sold - boarded;
    return { total, sold, boarded, pending };
  }, [seats]);

  async function changeStatus(s: ExcursionOperationStatus) {
    if (!trip || busy) return;
    setBusy(true);
    try {
      const res = await setOperationStatus(trip.id, s);
      if (res.ok) {
        setTrip({ ...trip, operation_status: s } as ExcursionTrip);
        toast.success(operationStatusLabel[s]);
      } else {
        toast.error(res.reason ?? "Erro");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  function notifyPassengers() {
    if (!trip) return;
    const phones = seats
      .filter((s) => s.passenger_phone)
      .map((s) => s.passenger_phone as string);
    if (phones.length === 0) {
      toast.info("Nenhum passageiro com telefone.");
      return;
    }
    const msg = encodeURIComponent(
      `🚍 Atualização da excursão ${trip.title}: ${operationStatusLabel[((trip as unknown as { operation_status?: ExcursionOperationStatus }).operation_status) ?? "scheduled"]}.`,
    );
    // abre WhatsApp para o primeiro contato; o organizador encaminha
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Carregando operação…
      </main>
    );
  }
  if (!trip) {
    return (
      <main className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Viagem não encontrada.
      </main>
    );
  }

  const opStatus =
    ((trip as unknown as { operation_status?: ExcursionOperationStatus })
      .operation_status) ?? "scheduled";
  const mapsHref = ping
    ? `https://www.google.com/maps?q=${ping.lat},${ping.lng}`
    : null;

  return (
    <main
      className="min-h-screen w-full bg-gradient-to-b from-background to-purple-950/20"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "calc(2rem + env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto w-full max-w-md px-4 py-4 space-y-4">
        <Link
          to="/partner/excursoes/viagens"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Viagens
        </Link>

        <header className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-primary">
            🚍 Operação ao vivo
          </p>
          <h1 className="text-xl font-bold leading-tight">{trip.title}</h1>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {operationStatusEmoji[opStatus]} {operationStatusLabel[opStatus]}
            </Badge>
            {ping ? (
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                <Radio className="h-3 w-3 mr-1 animate-pulse" /> GPS ativo
              </Badge>
            ) : (
              <Badge variant="outline">GPS inativo</Badge>
            )}
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3 text-center">
            <p className="text-[10px] uppercase text-muted-foreground">Vendidos</p>
            <p className="text-xl font-bold">{stats.sold}</p>
            <p className="text-[10px] text-muted-foreground">de {stats.total}</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-[10px] uppercase text-muted-foreground">Embarcados</p>
            <p className="text-xl font-bold text-emerald-400">{stats.boarded}</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-[10px] uppercase text-muted-foreground">Pendentes</p>
            <p className="text-xl font-bold text-amber-400">{stats.pending}</p>
          </Card>
        </div>

        {/* Veículo e motorista */}
        <Card className="p-4 space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <Bus className="h-4 w-4 mt-0.5 text-primary" />
            <div>
              <p className="font-medium">
                {vehicle?.name ?? "Veículo não definido"}
              </p>
              {vehicle?.plate ? (
                <p className="text-[11px] text-muted-foreground">
                  Placa {vehicle.plate}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 mt-0.5 text-primary" />
            <p className="text-xs">
              Saída{" "}
              {new Date(trip.departure_at).toLocaleString("pt-BR", {
                timeZone: "America/Sao_Paulo",
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </Card>

        {/* GPS / mapa */}
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Posição ao vivo
            </p>
            {ping ? (
              <p className="text-[10px] text-muted-foreground">
                {new Date(ping.recorded_at).toLocaleTimeString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                })}
              </p>
            ) : null}
          </div>
          {ping ? (
            <>
              <div className="aspect-video rounded-lg overflow-hidden bg-black/30">
                <iframe
                  title="Mapa da viagem"
                  src={`https://www.google.com/maps?q=${ping.lat},${ping.lng}&z=15&output=embed`}
                  className="w-full h-full border-0"
                  loading="lazy"
                />
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {ping.lat.toFixed(5)}, {ping.lng.toFixed(5)}
                </span>
                {mapsHref ? (
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Abrir no Maps <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              O motorista ainda não iniciou a transmissão GPS.
            </p>
          )}
        </Card>

        {/* Mudar status */}
        <Card className="p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Status operacional
          </p>
          <div className="grid grid-cols-2 gap-2">
            {OP_STATUSES.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={s === opStatus ? "default" : "outline"}
                disabled={busy}
                onClick={() => changeStatus(s)}
              >
                {operationStatusEmoji[s]} {operationStatusLabel[s]}
              </Button>
            ))}
          </div>
        </Card>

        {/* Ações */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={notifyPassengers}>
            <Users className="h-4 w-4 mr-1" /> Notificar
          </Button>
          <Button
            variant="secondary"
            onClick={() => exportPassengersCsv(trip, seats)}
          >
            <Download className="h-4 w-4 mr-1" /> Exportar
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Para parar a operação, escolha "Finalizada". Isso encerra também o GPS.
        </p>
      </div>
    </main>
  );
}
