/**
 * PartnerEventsPage — FIX 10F
 *
 * Eventos do parceiro com abas operacionais:
 *   Próximos · Encerrados · Arquivados
 *
 * Eventos passados/encerrados aparecem em cards compactos para não
 * poluir a tela principal.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, RefreshCw } from "lucide-react";
import { usePartnerAuth } from "../hooks/usePartnerAuth";
import {
  PartnerEventEmptyState,
  PartnerEventForm,
  PartnerEventsTable,
  PartnerEventStatusBadge,
} from "../components";
import {
  archivePartnerEvent,
  createPartnerEvent,
  duplicatePartnerEvent,
  listMyEvents,
  updatePartnerEvent,
  type PartnerEventPayload,
  type PartnerEventRow,
} from "../services/partnerEvents";

type ViewMode =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "edit"; event: PartnerEventRow };

type Bucket = "upcoming" | "ended" | "archived";

const bucketOf = (e: PartnerEventRow): Bucket => {
  if (e.status === "archived") return "archived";
  const past = new Date(e.date_time).getTime() < Date.now();
  return past ? "ended" : "upcoming";
};

const PartnerEventsPage = () => {
  const { selectedPartner, role } = usePartnerAuth();
  const partnerId = selectedPartner?.id ?? null;

  const canCreate = role === "owner" || role === "admin" || role === "editor";
  const canEdit = canCreate;
  const canDuplicate = role === "owner" || role === "admin";
  const canArchive = role === "owner" || role === "admin";

  const [events, setEvents] = useState<PartnerEventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<ViewMode>({ kind: "list" });
  const [tab, setTab] = useState<Bucket>("upcoming");

  const refresh = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      const rows = await listMyEvents(partnerId, { status: "all" });
      setEvents(rows);
    } catch (err) {
      toast.error("Erro ao carregar eventos", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const buckets = useMemo(() => {
    const acc: Record<Bucket, PartnerEventRow[]> = {
      upcoming: [],
      ended: [],
      archived: [],
    };
    for (const e of events) acc[bucketOf(e)].push(e);
    return acc;
  }, [events]);

  const handleCreate = async (payload: PartnerEventPayload) => {
    if (!partnerId) return;
    setBusy(true);
    try {
      await createPartnerEvent(partnerId, payload);
      toast.success("Evento criado como rascunho.");
      setView({ kind: "list" });
      await refresh();
    } catch (err) {
      toast.error("Não foi possível criar", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async (payload: PartnerEventPayload) => {
    if (!partnerId || view.kind !== "edit") return;
    setBusy(true);
    try {
      await updatePartnerEvent(view.event.id, partnerId, payload);
      toast.success("Evento atualizado.");
      setView({ kind: "list" });
      await refresh();
    } catch (err) {
      toast.error("Não foi possível salvar", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDuplicate = async (ev: PartnerEventRow) => {
    setBusy(true);
    try {
      await duplicatePartnerEvent(ev.id);
      toast.success("Evento duplicado.");
      await refresh();
    } catch (err) {
      toast.error("Falha ao duplicar", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleArchive = async (ev: PartnerEventRow) => {
    if (!confirm(`Arquivar "${ev.title}"?`)) return;
    setBusy(true);
    try {
      await archivePartnerEvent(ev.id);
      toast.success("Evento arquivado.");
      await refresh();
    } catch (err) {
      toast.error("Falha ao arquivar", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  if (!partnerId) {
    return (
      <main className="min-h-screen bg-zinc-950 p-6 text-white">
        <p className="text-zinc-400">
          Selecione um estabelecimento para gerenciar eventos.
        </p>
      </main>
    );
  }

  const renderBucket = (key: Bucket) => {
    const list = buckets[key];
    if (list.length === 0 && !loading) {
      return (
        <PartnerEventEmptyState
          canCreate={canCreate && key === "upcoming"}
          onCreate={() => setView({ kind: "create" })}
        />
      );
    }
    if (key === "upcoming") {
      return (
        <PartnerEventsTable
          events={list}
          canEdit={canEdit}
          canDuplicate={canDuplicate}
          canArchive={canArchive}
          onEdit={(ev) => setView({ kind: "edit", event: ev })}
          onDuplicate={handleDuplicate}
          onArchive={handleArchive}
          busy={busy}
        />
      );
    }
    // Compact for ended / archived
    return (
      <div className="space-y-2">
        {list.map((ev) => (
          <div
            key={ev.id}
            className="min-w-0 flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.02] p-3 opacity-80"
          >
            {ev.image_url ? (
              <img
                src={ev.image_url}
                alt=""
                className="h-12 w-12 shrink-0 rounded object-cover brightness-50"
                loading="lazy"
              />
            ) : (
              <div className="h-12 w-12 shrink-0 rounded bg-zinc-800" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {ev.title}
                </p>
                <PartnerEventStatusBadge
                  status={key === "ended" ? "ended" : ev.status}
                />
              </div>
              <p className="truncate text-[11px] text-zinc-400">
                {new Date(ev.date_time).toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0"
              onClick={() => setView({ kind: "edit", event: ev })}
            >
              Histórico
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-zinc-950 p-4 text-white sm:p-6 overflow-x-hidden">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Eventos do parceiro
            </h1>
            {selectedPartner && (
              <p className="text-sm text-zinc-400">{selectedPartner.name}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw
                className={`mr-1 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              />
              Atualizar
            </Button>
            {canCreate && view.kind === "list" && (
              <Button
                size="sm"
                className="bg-fuchsia-600 hover:bg-fuchsia-500"
                onClick={() => setView({ kind: "create" })}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Novo evento
              </Button>
            )}
          </div>
        </header>

        {view.kind === "create" && (
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <h2 className="mb-3 text-lg font-semibold">Novo evento</h2>
            <PartnerEventForm
              busy={busy}
              submitLabel="Criar como rascunho"
              onSubmit={handleCreate}
              onCancel={() => setView({ kind: "list" })}
            />
          </section>
        )}

        {view.kind === "edit" && (
          <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <h2 className="mb-3 text-lg font-semibold">Editar evento</h2>
            <PartnerEventForm
              busy={busy}
              initial={view.event}
              submitLabel="Salvar alterações"
              onSubmit={handleUpdate}
              onCancel={() => setView({ kind: "list" })}
            />
          </section>
        )}

        {view.kind === "list" && (
          <Tabs value={tab} onValueChange={(v) => setTab(v as Bucket)}>
            <TabsList className="w-full overflow-x-auto justify-start">
              <TabsTrigger value="upcoming">
                Próximos{" "}
                {buckets.upcoming.length ? `(${buckets.upcoming.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="ended">
                Encerrados{" "}
                {buckets.ended.length ? `(${buckets.ended.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="archived">
                Arquivados{" "}
                {buckets.archived.length ? `(${buckets.archived.length})` : ""}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming" className="mt-4">
              {renderBucket("upcoming")}
            </TabsContent>
            <TabsContent value="ended" className="mt-4">
              {renderBucket("ended")}
            </TabsContent>
            <TabsContent value="archived" className="mt-4">
              {renderBucket("archived")}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </main>
  );
};

export default PartnerEventsPage;
