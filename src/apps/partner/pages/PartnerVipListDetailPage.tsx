/**
 * PartnerVipListDetailPage — Fase 9I
 *
 * Detalhe de uma lista VIP: stats, ações (abrir/fechar/arquivar),
 * formulário de adicionar convidado, tabela de entradas e painel de check-in.
 * Página órfã: ainda não registrada em App.tsx.
 */
import { useCallback, useEffect, useState } from "react";
import {
  getVipList,
  listVipEntries,
  addVipEntry,
  checkInVipEntry,
  cancelVipEntry,
  openVipList,
  closeVipList,
  archiveVipList,
  computeVipListStats,
  type PartnerVipEntry,
  type PartnerVipList,
  type VipEntryPayload,
} from "../services/partnerVipLists";
import {
  usePartnerAuth,
  canManageEvents,
  canManageReservations,
  canEditProfile,
} from "../hooks/usePartnerAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VipListStatusBadge } from "../components/VipListStatusBadge";
import { VipListStats } from "../components/VipListStats";
import { VipEntryForm } from "../components/VipEntryForm";
import { VipEntryTable } from "../components/VipEntryTable";
import { VipCheckInPanel } from "../components/VipCheckInPanel";

interface Props {
  listId: string;
}

const PartnerVipListDetailPage = ({ listId }: Props) => {
  const { role } = usePartnerAuth();
  const canEdit = canManageEvents(role);
  const canLifecycle = canEditProfile(role);
  const canCheckIn = canManageReservations(role) || canEdit;

  const [list, setList] = useState<PartnerVipList | null>(null);
  const [entries, setEntries] = useState<PartnerVipEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"entries" | "checkin">("entries");

  const reload = useCallback(async () => {
    setBusy(true);
    try {
      const [l, e] = await Promise.all([
        getVipList(listId),
        listVipEntries(listId),
      ]);
      setList(l);
      setEntries(e);
    } finally {
      setBusy(false);
    }
  }, [listId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleAdd = async (payload: VipEntryPayload) => {
    await addVipEntry(listId, payload);
    await reload();
  };

  const handleCheckIn = async (e: PartnerVipEntry) => {
    await checkInVipEntry(e.id);
    await reload();
  };

  const handleCancel = async (e: PartnerVipEntry) => {
    await cancelVipEntry(e.id);
    await reload();
  };

  const lifecycle = async (action: "open" | "close" | "archive") => {
    if (!list) return;
    setBusy(true);
    try {
      if (action === "open") await openVipList(list.id);
      else if (action === "close") await closeVipList(list.id);
      else await archiveVipList(list.id);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  if (!list) {
    return (
      <main className="min-h-screen p-8">
        <p className="text-muted-foreground">
          {busy ? "Carregando..." : "Lista não encontrada."}
        </p>
      </main>
    );
  }

  const stats = computeVipListStats(entries, list.max_entries);

  return (
    <main className="min-h-screen space-y-6 p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{list.title}</h1>
            <VipListStatusBadge status={list.status} />
          </div>
          {list.description ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {list.description}
            </p>
          ) : null}
        </div>
        {canLifecycle ? (
          <div className="flex flex-wrap gap-2">
            {list.status !== "open" ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void lifecycle("open")}
                disabled={busy}
              >
                Abrir
              </Button>
            ) : null}
            {list.status !== "closed" ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void lifecycle("close")}
                disabled={busy}
              >
                Fechar
              </Button>
            ) : null}
            {list.status !== "archived" ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void lifecycle("archive")}
                disabled={busy}
              >
                Arquivar
              </Button>
            ) : null}
          </div>
        ) : null}
      </header>

      <VipListStats stats={stats} />

      <div className="flex gap-2 border-b">
        <button
          className={`px-3 py-2 text-sm ${tab === "entries" ? "border-b-2 border-primary font-semibold" : "text-muted-foreground"}`}
          onClick={() => setTab("entries")}
        >
          Convidados
        </button>
        <button
          className={`px-3 py-2 text-sm ${tab === "checkin" ? "border-b-2 border-primary font-semibold" : "text-muted-foreground"}`}
          onClick={() => setTab("checkin")}
        >
          Check-in rápido
        </button>
      </div>

      {tab === "entries" ? (
        <div className="space-y-4">
          {canEdit ? (
            <Card className="p-4">
              <VipEntryForm onSubmit={handleAdd} />
            </Card>
          ) : null}
          <VipEntryTable
            entries={entries}
            onCheckIn={handleCheckIn}
            onCancel={handleCancel}
            canCheckIn={canCheckIn}
          />
        </div>
      ) : (
        <Card className="p-4">
          <VipCheckInPanel entries={entries} onCheckIn={handleCheckIn} />
        </Card>
      )}
    </main>
  );
};

export default PartnerVipListDetailPage;
