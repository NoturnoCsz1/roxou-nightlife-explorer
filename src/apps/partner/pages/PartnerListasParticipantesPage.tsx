/**
 * PartnerListasParticipantesPage — FASE 6B
 *
 * Seleciona uma lista VIP (aberta por padrão) e exibe participantes em
 * abas Confirmados · Pendentes · Check-ins · Cancelados. Busca por nome,
 * telefone, promoter. Exporta CSV.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Download, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { toast } from "@/hooks/use-toast";

import { PartnerScreen } from "../components/PartnerScreen";
import { PartnerEmptyState } from "../components/PartnerEmptyState";
import { VipEntryTable, VipEntryForm } from "../components";
import { usePartnerAuth, canManageEvents } from "../hooks/usePartnerAuth";
import { onFabClick } from "../components/PartnerFab";
import {
  addVipEntry,
  cancelVipEntry,
  checkInVipEntry,
  listVipEntries,
  listVipLists,
  noShowVipEntry,
  type PartnerVipEntry,
  type PartnerVipList,
  type VipEntryPayload,
  deriveVipListState,
} from "../services/partnerVipLists";

type Bucket = "approved" | "pending" | "checkin" | "cancelled";

const PartnerListasParticipantesPage = () => {
  const { selectedPartner, role } = usePartnerAuth();
  const partnerId = selectedPartner?.id ?? null;
  const canManage = canManageEvents(role);

  const [lists, setLists] = useState<PartnerVipList[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [entries, setEntries] = useState<PartnerVipEntry[]>([]);
  const [tab, setTab] = useState<Bucket>("approved");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!partnerId) return;
    void (async () => {
      try {
        const ls = await listVipLists(partnerId);
        setLists(ls);
        // Default: primeira lista aberta
        const open = ls.find((l) => {
          const op = deriveVipListState(l, 0, null);
          return op === "open" || op === "sold_out";
        });
        setSelectedId((prev) => prev || open?.id || ls[0]?.id || "");
      } catch (err) {
        toast({ title: "Erro", description: (err as Error).message });
      }
    })();
  }, [partnerId]);

  const loadEntries = useCallback(async () => {
    if (!selectedId) {
      setEntries([]);
      return;
    }
    setLoading(true);
    try {
      setEntries(await listVipEntries(selectedId));
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  useEffect(() => onFabClick("vip:entry:new", () => setAddOpen(true)), []);

  const buckets = useMemo(() => {
    const acc: Record<Bucket, PartnerVipEntry[]> = {
      approved: [],
      pending: [],
      checkin: [],
      cancelled: [],
    };
    for (const e of entries) {
      if (e.status === "checked_in") acc.checkin.push(e);
      else if (e.status === "cancelled" || e.status === "no_show")
        acc.cancelled.push(e);
      else if (e.status === "approved") acc.approved.push(e);
      else acc.pending.push(e);
    }
    return acc;
  }, [entries]);

  const filtered = useMemo(() => {
    const list = buckets[tab];
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.phone ?? "").toLowerCase().includes(q) ||
        (e.promoter_name_snapshot ?? "").toLowerCase().includes(q),
    );
  }, [buckets, tab, search]);

  const wrap = (fn: () => Promise<unknown>, ok: string) => async () => {
    try {
      await fn();
      toast({ title: ok });
      void loadEntries();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    }
  };

  const handleAdd = async (payload: VipEntryPayload) => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      await addVipEntry(selectedId, payload);
      toast({ title: "Participante adicionado" });
      setAddOpen(false);
      void loadEntries();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      toast({ title: "Nada para exportar" });
      return;
    }
    const header = ["nome", "telefone", "pessoas", "status", "promoter", "criado_em"];
    const lines = filtered.map((e) =>
      [
        e.name,
        e.phone ?? "",
        e.people_count,
        e.status,
        e.promoter_name_snapshot ?? "",
        e.created_at,
      ].join(","),
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `participantes-${selectedId}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!partnerId) {
    return (
      <PartnerScreen title="Participantes">
        <PartnerEmptyState ctaLabel="Voltar" ctaTo="/listas" />
      </PartnerScreen>
    );
  }

  return (
    <PartnerScreen
      title="Participantes"
      subtitle={selectedPartner?.name ?? undefined}
    >
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Lista
        </label>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma lista" />
          </SelectTrigger>
          <SelectContent>
            {lists.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedId ? (
        <PartnerEmptyState ctaLabel="Criar lista" ctaTo="/listas" />
      ) : (
        <>
          <Tabs value={tab} onValueChange={(v) => setTab(v as Bucket)}>
            <div className="-mx-1 overflow-x-auto scrollbar-hide">
              <TabsList className="inline-flex w-max min-w-full justify-start flex-nowrap bg-white/5 border border-white/8">
                <TabsTrigger value="approved" className="text-xs shrink-0 whitespace-nowrap">
                  Confirmados {buckets.approved.length ? `(${buckets.approved.length})` : ""}
                </TabsTrigger>
                <TabsTrigger value="pending" className="text-xs shrink-0 whitespace-nowrap">
                  Pendentes {buckets.pending.length ? `(${buckets.pending.length})` : ""}
                </TabsTrigger>
                <TabsTrigger value="checkin" className="text-xs shrink-0 whitespace-nowrap">
                  Check-ins {buckets.checkin.length ? `(${buckets.checkin.length})` : ""}
                </TabsTrigger>
                <TabsTrigger value="cancelled" className="text-xs shrink-0 whitespace-nowrap">
                  Cancelados {buckets.cancelled.length ? `(${buckets.cancelled.length})` : ""}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="mt-3 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar nome, telefone, promoter…"
                  className="pl-8 h-10"
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleExport} className="h-10">
                <Download className="h-4 w-4" />
              </Button>
              {canManage ? (
                <Button size="sm" onClick={() => setAddOpen(true)} className="h-10">
                  <Plus className="h-4 w-4" />
                </Button>
              ) : null}
            </div>

            <TabsContent value={tab} className="mt-3">
              {loading && entries.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6">Carregando…</p>
              ) : (
                <VipEntryTable
                  entries={filtered}
                  canCheckIn={canManage}
                  onCheckIn={(e) => wrap(() => checkInVipEntry(e.id), "Check-in realizado")()}
                  onCancel={(e) => wrap(() => cancelVipEntry(e.id), "Cancelado")()}
                  onNoShow={(e) => wrap(() => noShowVipEntry(e.id), "Marcado como no-show")()}
                />
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Adicionar participante</SheetTitle>
          </SheetHeader>
          <div className="py-3">
            <VipEntryForm onSubmit={handleAdd} submitting={submitting} />
          </div>
        </SheetContent>
      </Sheet>
    </PartnerScreen>
  );
};

export default PartnerListasParticipantesPage;
