/**
 * PartnerEventsPage — Fase 9G
 *
 * Lista eventos do parceiro selecionado, com filtros e ações rápidas.
 * Mutations passam pelos RPCs `create/update/duplicate/archive_partner_event`.
 *
 * Permissões (usePartnerAuth):
 *  - owner/admin: criar, editar, duplicar, arquivar
 *  - editor:      criar, editar
 *  - attendant:   somente leitura
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { usePartnerAuth } from "../hooks/usePartnerAuth";
import {
  PartnerEventEmptyState,
  PartnerEventFilters,
  PartnerEventForm,
  PartnerEventsTable,
} from "../components";
import type { PartnerEventFiltersValue } from "../components/PartnerEventFilters";
import {
  archivePartnerEvent,
  createPartnerEvent,
  duplicatePartnerEvent,
  listMyEvents,
  updatePartnerEvent,
  type PartnerEventPayload,
  type PartnerEventRow,
} from "../services/partnerEvents";

type ViewMode = { kind: "list" } | { kind: "create" } | { kind: "edit"; event: PartnerEventRow };

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
  const [filters, setFilters] = useState<PartnerEventFiltersValue>({
    status: "all",
    search: "",
  });

  const refresh = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      const rows = await listMyEvents(partnerId, {
        status: filters.status,
        search: filters.search,
      });
      setEvents(rows);
    } catch (err) {
      toast.error("Erro ao carregar eventos", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [partnerId, filters.status, filters.search]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
    if (!confirm(`Arquivar "${ev.title}"? Você pode restaurar via Admin.`)) return;
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

  const header = useMemo(
    () => (
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Eventos do parceiro</h1>
          {selectedPartner && (
            <p className="text-sm text-zinc-400">{selectedPartner.name}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
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
    ),
    [selectedPartner, refresh, loading, canCreate, view.kind],
  );

  if (!partnerId) {
    return (
      <main className="min-h-screen bg-zinc-950 p-6 text-white">
        <p className="text-zinc-400">
          Selecione um estabelecimento para gerenciar eventos.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-4 text-white sm:p-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        {header}

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
          <>
            <PartnerEventFilters value={filters} onChange={setFilters} />
            {events.length === 0 && !loading ? (
              <PartnerEventEmptyState
                canCreate={canCreate}
                onCreate={() => setView({ kind: "create" })}
              />
            ) : (
              <PartnerEventsTable
                events={events}
                canEdit={canEdit}
                canDuplicate={canDuplicate}
                canArchive={canArchive}
                onEdit={(ev) => setView({ kind: "edit", event: ev })}
                onDuplicate={handleDuplicate}
                onArchive={handleArchive}
                busy={busy}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default PartnerEventsPage;
