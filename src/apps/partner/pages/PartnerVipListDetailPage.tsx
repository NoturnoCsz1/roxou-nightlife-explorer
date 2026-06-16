/**
 * PartnerVipListDetailPage — Fase 9I + 9L (promoters & portaria)
 *
 * Detalhe de uma lista VIP com stats, ações de lifecycle, formulário de
 * convidados com promoter, busca, ações de check-in/no-show/cancelar e
 * modo portaria (mobile-first) para uso na entrada do estabelecimento.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getVipList,
  listVipEntries,
  addVipEntry,
  checkInVipEntry,
  cancelVipEntry,
  noShowVipEntry,
  openVipList,
  closeVipList,
  archiveVipList,
  setVipListPublicEnabled,
  computeVipListStats,
  computePromoterStats,
  type PartnerVipEntry,
  type PartnerVipList,
  type VipEntryPayload,
} from "../services/partnerVipLists";
import { closeDuePartnerVipLists } from "../services/partnerMaintenance";

import {
  listPromoters,
  createPromoter,
  type PartnerPromoter,
} from "../services/partnerPromoters";
import {
  usePartnerAuth,
  canManageEvents,
  canManageReservations,
  canEditProfile,
} from "../hooks/usePartnerAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
  const canEdit = canManageEvents(role);
  const canLifecycle = canEditProfile(role);
  const canCheckIn = canManageReservations(role) || canEdit;


  const [list, setList] = useState<PartnerVipList | null>(null);
  const [entries, setEntries] = useState<PartnerVipEntry[]>([]);
  const [promoters, setPromoters] = useState<PartnerPromoter[]>([]);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"entries" | "checkin">("entries");
  const [doorman, setDoorman] = useState(false);
  const [search, setSearch] = useState("");

  const reload = useCallback(async () => {
    setBusy(true);
    try {
      await closeDuePartnerVipLists();
      const l = await getVipList(listId);
      const [e, p] = await Promise.all([
        listVipEntries(listId),
        l ? listPromoters(l.partner_id) : Promise.resolve([] as PartnerPromoter[]),
      ]);
      setList(l);
      setEntries(e);
      setPromoters(p);
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

  const handleCreatePromoter = async (name: string) => {
    if (!list) return null;
    const p = await createPromoter(list.partner_id, { name });
    setPromoters((prev) => [...prev, p].sort((a, b) => a.name.localeCompare(b.name)));
    return p;
  };

  const handleCheckIn = async (e: PartnerVipEntry) => {
    await checkInVipEntry(e.id);
    await reload();
  };

  const handleCancel = async (e: PartnerVipEntry) => {
    await cancelVipEntry(e.id);
    await reload();
  };

  const handleNoShow = async (e: PartnerVipEntry) => {
    await noShowVipEntry(e.id);
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

  const togglePublic = async () => {
    if (!list) return;
    setBusy(true);
    try {
      const updated = await setVipListPublicEnabled(list.id, !list.public_enabled);
      setList(updated);
      toast({
        title: updated.public_enabled
          ? "Link público ativado"
          : "Link público desativado",
      });
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Falha ao alterar.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copiado!" });
    } catch {
      toast({ title: "Não foi possível copiar.", variant: "destructive" });
    }
  };


  const filteredEntries = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return entries;
    return entries.filter(
      (e) =>
        e.name.toLowerCase().includes(s) ||
        (e.phone ?? "").toLowerCase().includes(s) ||
        (e.email ?? "").toLowerCase().includes(s) ||
        (e.promoter_name_snapshot ?? "").toLowerCase().includes(s),
    );
  }, [entries, search]);

  if (!list) {
    return (
      <main className="w-full max-w-7xl mx-auto px-4 py-6 min-h-screen overflow-x-hidden">
        <p className="text-muted-foreground">
          {busy ? "Carregando..." : "Lista não encontrada."}
        </p>
      </main>
    );
  }

  const stats = computeVipListStats(entries, list.max_entries);

  // Modo portaria: layout grande, foco em check-in rápido.
  if (doorman) {
    return (
      <main className="w-full max-w-3xl mx-auto px-4 py-4 min-h-screen overflow-x-hidden space-y-4">
        <header className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs uppercase text-muted-foreground">
              Modo portaria
            </p>
            <h1 className="text-xl font-bold truncate">{list.title}</h1>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setDoorman(false)}>
            Sair
          </Button>
        </header>
        <VipListStats stats={stats} />
        <Card className="p-3">
          <VipCheckInPanel
            entries={entries}
            onCheckIn={handleCheckIn}
            doormanMode
          />
        </Card>
      </main>
    );
  }

  return (
    <main className="w-full max-w-7xl mx-auto px-4 py-4 md:py-6 min-h-screen overflow-x-hidden space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold break-words">{list.title}</h1>
            <VipListStatusBadge status={list.status} />
          </div>
          {list.description ? (
            <p className="mt-1 text-sm text-muted-foreground break-words">
              {list.description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {canCheckIn ? (
            <Button size="sm" onClick={() => setDoorman(true)}>
              Modo portaria
            </Button>
          ) : null}
          {canLifecycle && list.status !== "open" ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void lifecycle("open")}
              disabled={busy}
            >
              Abrir
            </Button>
          ) : null}
          {canLifecycle && list.status !== "closed" ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void lifecycle("close")}
              disabled={busy}
            >
              Fechar
            </Button>
          ) : null}
          {canLifecycle && list.status !== "archived" ? (
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
      </header>

      <VipListStats stats={stats} />

      {/* ===== Link público (Fase 10E) ===== */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-semibold">Link público</h2>
            <p className="text-xs text-muted-foreground break-words">
              Compartilhe para que convidados se cadastrem sozinhos.
            </p>
          </div>
          {canLifecycle ? (
            <Button
              size="sm"
              variant={list.public_enabled ? "secondary" : "default"}
              onClick={() => void togglePublic()}
              disabled={busy}
            >
              {list.public_enabled ? "Desativar" : "Ativar link público"}
            </Button>
          ) : null}
        </div>
        {list.public_enabled ? (
          <>
            {(() => {
              const base =
                typeof window !== "undefined"
                  ? `${window.location.protocol}//${window.location.host.replace(/^parceiro\./, "")}`
                  : "https://roxou.com.br";
              const publicUrl = `${base}/vip/${list.public_slug}`;
              return (
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input value={publicUrl} readOnly className="text-xs" />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void copyLink(publicUrl)}
                      >
                        Copiar
                      </Button>
                      <Button size="sm" asChild>
                        <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                          Abrir
                        </a>
                      </Button>
                    </div>
                  </div>

                  {promoters.length > 0 ? (
                    <div className="space-y-2 pt-2 border-t border-border/40">
                      <p className="text-xs font-medium">Links por promoter</p>
                      <ul className="space-y-2">
                        {promoters.map((p) => {
                          const url = `${publicUrl}?promoter=${p.slug}`;
                          const s = computePromoterStats(entries, p.id);
                          return (
                            <li
                              key={p.id}
                              className="flex flex-col gap-1 rounded border border-border/40 p-2 min-w-0"
                            >
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-sm font-medium truncate">
                                  {p.name}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {s.signups} inscritos · {s.people} convidados ·{" "}
                                  {s.checkedIn} check-ins · {s.noShow} no-show
                                </span>
                              </div>
                              <div className="flex flex-col sm:flex-row gap-1">
                                <Input value={url} readOnly className="text-[10px]" />
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => void copyLink(url)}
                                >
                                  Copiar
                                </Button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}
                </div>
              );
            })()}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Ative para gerar o link público <code>/vip/{list.public_slug}</code>.
          </p>
        )}
      </Card>



      <div className="flex gap-2 border-b overflow-x-auto">
        <button
          className={`px-3 py-2 text-sm whitespace-nowrap ${tab === "entries" ? "border-b-2 border-primary font-semibold" : "text-muted-foreground"}`}
          onClick={() => setTab("entries")}
        >
          Convidados
        </button>
        <button
          className={`px-3 py-2 text-sm whitespace-nowrap ${tab === "checkin" ? "border-b-2 border-primary font-semibold" : "text-muted-foreground"}`}
          onClick={() => setTab("checkin")}
        >
          Check-in rápido
        </button>
      </div>

      {tab === "entries" ? (
        <div className="space-y-4">
          {canEdit ? (
            <Card className="p-4">
              <VipEntryForm
                onSubmit={handleAdd}
                promoters={promoters}
                onCreatePromoter={handleCreatePromoter}
              />
            </Card>
          ) : null}
          <Input
            placeholder="Buscar nome, telefone ou promoter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <VipEntryTable
            entries={filteredEntries}
            onCheckIn={handleCheckIn}
            onCancel={handleCancel}
            onNoShow={handleNoShow}
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
