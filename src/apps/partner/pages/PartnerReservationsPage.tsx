/**
 * PartnerReservationsPage — FIX 10F
 *
 * Reservas do parceiro com abas operacionais (Ativas / Fechadas /
 * Encerradas / Arquivadas) e fechamento automático real chamando
 * `close_due_partner_reservations` antes do fetch principal.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { usePartnerAuth } from "../hooks/usePartnerAuth";
import {
  ReservationCard,
  ReservationStats,
  ReservationEmptyState,
  ReservationSettingsForm,
  ReservationTable,
} from "../components";
import {
  cancelReservation,
  completeReservation,
  computeReservationStats,
  confirmReservation,
  createReservation,
  getReservationSettings,
  listReservations,
  updateReservationSettings,
  type PartnerReservationRow,
  type PartnerReservationSettings,
} from "../services/partnerReservations";
import { closeDuePartnerReservations } from "../services/partnerMaintenance";

type Bucket = "active" | "closed" | "ended" | "archived";

const bucketOf = (r: PartnerReservationRow): Bucket => {
  if (r.status === "no_show") return "archived";
  if (r.status === "cancelled") return "closed";
  if (r.status === "completed") return "ended";
  const past = new Date(r.reservation_date).getTime() < Date.now();
  if (past) return "ended";
  return "active";
};

const PartnerReservationsPage = () => {
  const { selectedPartner, role, isLoading: authLoading } = usePartnerAuth();
  const [rows, setRows] = useState<PartnerReservationRow[]>([]);
  const [settings, setSettings] = useState<PartnerReservationSettings | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Bucket>("active");

  const partnerId = selectedPartner?.id ?? null;

  const canCreate = role === "owner" || role === "admin";
  const canConfirm =
    role === "owner" || role === "admin" || role === "editor" || role === "attendant";
  const canComplete = role === "owner" || role === "admin" || role === "attendant";
  const canCancel = role === "owner" || role === "admin";
  const canEditSettings = role === "owner" || role === "admin";

  const load = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      await closeDuePartnerReservations();
      const [list, sett] = await Promise.all([
        listReservations(partnerId, { status: "all" }),
        getReservationSettings(partnerId),
      ]);
      setRows(list);
      setSettings(sett);
    } catch (err) {
      const e = err as Error;
      toast({ title: "Erro ao carregar reservas", description: e.message });
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(
    () =>
      computeReservationStats(
        rows,
        settings?.max_reservations_per_day ?? 50,
      ),
    [rows, settings?.max_reservations_per_day],
  );

  const buckets = useMemo(() => {
    const acc: Record<Bucket, PartnerReservationRow[]> = {
      active: [],
      closed: [],
      ended: [],
      archived: [],
    };
    for (const r of rows) acc[bucketOf(r)].push(r);
    return acc;
  }, [rows]);

  const handleConfirm = async (r: PartnerReservationRow) => {
    try {
      await confirmReservation(r.id);
      toast({ title: "Reserva confirmada" });
      void load();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    }
  };

  const handleCancel = async (r: PartnerReservationRow) => {
    try {
      await cancelReservation(r.id);
      toast({ title: "Reserva cancelada" });
      void load();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    }
  };

  const handleComplete = async (r: PartnerReservationRow) => {
    try {
      await completeReservation(r.id);
      toast({ title: "Reserva concluída" });
      void load();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    }
  };

  const handleQuickAdd = async () => {
    if (!partnerId) return;
    const name = window.prompt("Nome do convidado?");
    if (!name?.trim()) return;
    const when = window.prompt(
      "Data/hora (AAAA-MM-DD HH:MM)?",
      new Date().toISOString().slice(0, 16).replace("T", " "),
    );
    if (!when) return;
    const iso = new Date(when.replace(" ", "T")).toISOString();
    const people = Number(window.prompt("Quantos convidados?", "2") || "2");
    try {
      await createReservation(partnerId, {
        name: name.trim(),
        reservation_date: iso,
        people_count: Math.max(1, people),
      });
      toast({ title: "Reserva criada" });
      void load();
    } catch (err) {
      toast({ title: "Erro ao criar", description: (err as Error).message });
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen p-6">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </main>
    );
  }

  if (!partnerId) {
    return (
      <main className="min-h-screen p-6">
        <h1 className="mb-2 text-2xl font-bold">Reservas</h1>
        <p className="text-sm text-muted-foreground">
          Selecione um estabelecimento para começar.
        </p>
      </main>
    );
  }

  const renderBucket = (key: Bucket) => {
    const list = buckets[key];
    if (!list.length) {
      return (
        <p className="text-sm text-muted-foreground py-6">
          Nada por aqui ainda.
        </p>
      );
    }
    const compact = key !== "active";
    if (compact) {
      return (
        <div className="space-y-2 opacity-80">
          {list.map((r) => (
            <div
              key={r.id}
              className="min-w-0 flex items-center gap-3 rounded-md border bg-card/40 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {new Date(r.reservation_date).toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}{" "}
                  · {r.people_count} convidado(s) · {r.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      );
    }
    return (
      <>
        <div className="hidden md:block">
          <ReservationTable
            reservations={list}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            onComplete={handleComplete}
            canCancel={canCancel}
            canConfirm={canConfirm}
            canComplete={canComplete}
          />
        </div>
        <div className="grid gap-3 md:hidden">
          {list.map((r) => (
            <ReservationCard
              key={r.id}
              reservation={r}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
              onComplete={handleComplete}
              canCancel={canCancel}
              canConfirm={canConfirm}
              canComplete={canComplete}
            />
          ))}
        </div>
      </>
    );
  };

  return (
    <main className="min-h-screen w-full max-w-7xl mx-auto space-y-6 p-4 sm:p-6 overflow-x-hidden">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reservas</h1>
          <p className="text-sm text-muted-foreground">
            {selectedPartner?.name}
          </p>
        </div>
        <div className="flex gap-2">
          {canCreate && <Button onClick={handleQuickAdd}>Nova reserva</Button>}
          <Button asChild variant="outline">
            <Link to="/painel">Voltar</Link>
          </Button>
        </div>
      </header>

      <ReservationStats stats={stats} />

      {loading && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Carregando reservas…</p>
      ) : rows.length === 0 ? (
        <ReservationEmptyState />
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as Bucket)}>
          <TabsList className="w-full overflow-x-auto justify-start">
            <TabsTrigger value="active">
              Ativas {buckets.active.length ? `(${buckets.active.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="closed">
              Fechadas {buckets.closed.length ? `(${buckets.closed.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="ended">
              Encerradas {buckets.ended.length ? `(${buckets.ended.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="archived">
              Arquivadas {buckets.archived.length ? `(${buckets.archived.length})` : ""}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="mt-4">{renderBucket("active")}</TabsContent>
          <TabsContent value="closed" className="mt-4">{renderBucket("closed")}</TabsContent>
          <TabsContent value="ended" className="mt-4">{renderBucket("ended")}</TabsContent>
          <TabsContent value="archived" className="mt-4">{renderBucket("archived")}</TabsContent>
        </Tabs>
      )}

      {canEditSettings && (
        <ReservationSettingsForm
          initial={settings}
          onSave={async (payload) => {
            try {
              const updated = await updateReservationSettings(partnerId, payload);
              setSettings(updated);
              toast({ title: "Configurações salvas" });
            } catch (err) {
              toast({ title: "Erro", description: (err as Error).message });
            }
          }}
        />
      )}
    </main>
  );
};

export default PartnerReservationsPage;
