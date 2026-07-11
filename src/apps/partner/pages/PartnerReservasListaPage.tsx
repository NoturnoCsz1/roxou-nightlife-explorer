/**
 * PartnerReservasListaPage — FASE 6
 *
 * Lista completa de reservas com abas: Hoje, Pendentes, Check-in,
 * Histórico, Arquivadas. Reutiliza ReservationTable/ReservationCard.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";

import { PartnerScreen } from "../components/PartnerScreen";
import { PartnerEmptyState } from "../components/PartnerEmptyState";
import {
  ReservationCard,
  ReservationEmptyState,
  ReservationTable,
  GuestNameDialog,
} from "../components";
import { usePartnerAuth } from "../hooks/usePartnerAuth";
import {
  cancelReservation,
  completeReservation,
  confirmReservation,
  confirmReservationPayment,
  createReservation,
  listReservations,
  noShowReservation,
  releasePartnerReservationTable,
  waivePartnerReservationDeposit,
  type PartnerReservationRow,
} from "@modules/partner/reservations";
import { onFabClick } from "../components/PartnerFab";
import {
  closeDuePartnerReservations,
  expireDuePartnerReservations,
} from "../services/partnerMaintenance";

type Bucket = "today" | "pending" | "checkin" | "history" | "archived";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function startOfTodaySP(): number {
  const now = new Date();
  const sp = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
  sp.setHours(0, 0, 0, 0);
  return sp.getTime();
}

function endOfTodaySP(): number {
  const start = startOfTodaySP();
  return start + 24 * 60 * 60 * 1000;
}

const PENDING_STATUS = new Set(["pending", "pending_payment"]);
const TERMINAL_STATUS = new Set(["completed", "cancelled", "no_show", "expired"]);

function bucketOf(r: PartnerReservationRow): Bucket {
  const updatedTs = new Date(r.updated_at ?? r.reservation_date).getTime();
  const isOld = Date.now() - updatedTs > SEVEN_DAYS_MS;
  if (TERMINAL_STATUS.has(r.status)) {
    if (isOld) return "archived";
    if (r.status === "cancelled" || r.status === "no_show" || r.status === "expired")
      return "archived";
    return "history";
  }
  if (r.checked_in_at) return "checkin";
  if (PENDING_STATUS.has(r.status)) return "pending";
  const ts = new Date(r.reservation_date).getTime();
  if (ts >= startOfTodaySP() && ts < endOfTodaySP()) return "today";
  return "history";
}

const TAB_PARAM: Record<Bucket, string> = {
  today: "hoje",
  pending: "pendentes",
  checkin: "checkin",
  history: "historico",
  archived: "arquivadas",
};
const PARAM_TAB: Record<string, Bucket> = {
  hoje: "today",
  pendentes: "pending",
  checkin: "checkin",
  historico: "history",
  arquivadas: "archived",
};

const PartnerReservasListaPage = () => {
  const { selectedPartner, selectedPartnerId, role } = usePartnerAuth();
  const [params, setParams] = useSearchParams();
  const initial = PARAM_TAB[params.get("tab") ?? ""] ?? "today";
  const [tab, setTab] = useState<Bucket>(initial);
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<PartnerReservationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [quickOpen, setQuickOpen] = useState(params.get("new") === "1");

  const canCreate = role === "owner" || role === "admin";
  const canConfirm =
    role === "owner" || role === "admin" || role === "editor" || role === "attendant";
  const canComplete = role === "owner" || role === "admin" || role === "attendant";
  const canCancel = role === "owner" || role === "admin";
  const canRelease =
    role === "owner" || role === "admin" || role === "editor" || role === "attendant";

  const load = useCallback(async () => {
    if (!selectedPartnerId) return;
    setLoading(true);
    try {
      await Promise.all([
        closeDuePartnerReservations(),
        expireDuePartnerReservations(),
      ]);
      const list = await listReservations(selectedPartnerId, { status: "all" });
      setRows(list);
    } catch (err) {
      toast({ title: "Erro ao carregar", description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [selectedPartnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => onFabClick("reservation:new", () => setQuickOpen(true)), []);

  const handleTab = (v: string) => {
    const next = v as Bucket;
    setTab(next);
    const sp = new URLSearchParams(params);
    sp.set("tab", TAB_PARAM[next]);
    setParams(sp, { replace: true });
  };

  const buckets = useMemo(() => {
    const acc: Record<Bucket, PartnerReservationRow[]> = {
      today: [],
      pending: [],
      checkin: [],
      history: [],
      archived: [],
    };
    for (const r of rows) acc[bucketOf(r)].push(r);
    return acc;
  }, [rows]);

  const filtered = useMemo(() => {
    const list = buckets[tab];
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (r) =>
        (r.name ?? "").toLowerCase().includes(q) ||
        (r.phone ?? "").toLowerCase().includes(q) ||
        (r.code ?? "").toLowerCase().includes(q),
    );
  }, [buckets, tab, search]);

  const wrap = (fn: () => Promise<unknown>, ok: string) => async () => {
    try {
      await fn();
      toast({ title: ok });
      void load();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    }
  };

  const handleConfirm = (r: PartnerReservationRow) =>
    wrap(() => confirmReservation(r.id), "Reserva confirmada")();
  const handleConfirmPayment = (r: PartnerReservationRow) =>
    wrap(() => confirmReservationPayment(r.id), "Pagamento confirmado")();
  const handleCancel = (r: PartnerReservationRow) =>
    wrap(() => cancelReservation(r.id), "Reserva cancelada")();
  const handleComplete = (r: PartnerReservationRow) =>
    wrap(() => completeReservation(r.id), "Reserva concluída")();
  const handleNoShow = (r: PartnerReservationRow) =>
    wrap(() => noShowReservation(r.id), "Marcado como no-show")();
  const handleWaive = (r: PartnerReservationRow) =>
    wrap(() => waivePartnerReservationDeposit(r.id), "Sinal dispensado")();
  const handleRelease = (r: PartnerReservationRow) =>
    wrap(() => releasePartnerReservationTable(r.id), "Mesa liberada")();

  const handleQuickAdd = async (values: {
    name: string;
    reservation_date: string;
    people_count: number;
  }) => {
    if (!selectedPartnerId) return;
    try {
      await createReservation(selectedPartnerId, values);
      toast({ title: "Reserva criada" });
      void load();
    } catch (err) {
      toast({ title: "Erro ao criar", description: (err as Error).message });
      throw err;
    }
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      toast({ title: "Nada para exportar" });
      return;
    }
    const header = ["data", "nome", "telefone", "pessoas", "status", "codigo"];
    const lines = filtered.map((r) =>
      [
        r.reservation_date,
        r.name ?? "",
        r.phone ?? "",
        r.people_count,
        r.status,
        r.code ?? "",
      ].join(","),
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reservas-${TAB_PARAM[tab]}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!selectedPartnerId) {
    return (
      <PartnerScreen title="Lista de reservas">
        <PartnerEmptyState ctaLabel="Voltar" ctaTo="/reservas" />
      </PartnerScreen>
    );
  }

  return (
    <PartnerScreen
      title="Lista de reservas"
      subtitle={selectedPartner?.name ?? undefined}
    >
      <Tabs value={tab} onValueChange={handleTab}>
        <div className="-mx-1 overflow-x-auto scrollbar-hide">
          <TabsList className="inline-flex w-max min-w-full justify-start flex-nowrap bg-white/5 border border-white/8">
            <TabsTrigger value="today" className="shrink-0 whitespace-nowrap text-xs">
              Hoje {buckets.today.length ? `(${buckets.today.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="pending" className="shrink-0 whitespace-nowrap text-xs">
              Pendentes {buckets.pending.length ? `(${buckets.pending.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="checkin" className="shrink-0 whitespace-nowrap text-xs">
              Check-in {buckets.checkin.length ? `(${buckets.checkin.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="history" className="shrink-0 whitespace-nowrap text-xs">
              Histórico {buckets.history.length ? `(${buckets.history.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="archived" className="shrink-0 whitespace-nowrap text-xs">
              Arquivadas {buckets.archived.length ? `(${buckets.archived.length})` : ""}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nome, telefone ou código…"
              className="pl-8 h-10"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} className="h-10">
            <Download className="h-4 w-4" />
          </Button>
          {canCreate ? (
            <Button size="sm" onClick={() => setQuickOpen(true)} className="h-10">
              + Reserva
            </Button>
          ) : null}
        </div>

        <TabsContent value={tab} className="mt-3">
          {loading && rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">Carregando…</p>
          ) : filtered.length === 0 ? (
            <ReservationEmptyState />
          ) : (
            <>
              <div className="hidden md:block">
                <ReservationTable
                  reservations={filtered}
                  onConfirm={handleConfirm}
                  onConfirmPayment={handleConfirmPayment}
                  onCancel={handleCancel}
                  onComplete={handleComplete}
                  onNoShow={handleNoShow}
                  onRelease={handleRelease}
                  canCancel={canCancel}
                  canConfirm={canConfirm}
                  canComplete={canComplete}
                  canRelease={canRelease}
                />
              </div>
              <div className="grid gap-3 md:hidden">
                {filtered.map((r) => (
                  <ReservationCard
                    key={r.id}
                    reservation={r}
                    onConfirm={handleConfirm}
                    onConfirmPayment={handleConfirmPayment}
                    onWaiveDeposit={handleWaive}
                    onCancel={handleCancel}
                    onComplete={handleComplete}
                    onNoShow={handleNoShow}
                    onRelease={handleRelease}
                    canCancel={canCancel}
                    canConfirm={canConfirm}
                    canComplete={canComplete}
                    canRelease={canRelease}
                  />
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <GuestNameDialog
        open={quickOpen}
        onOpenChange={setQuickOpen}
        onConfirm={handleQuickAdd}
      />
    </PartnerScreen>
  );
};

export default PartnerReservasListaPage;
