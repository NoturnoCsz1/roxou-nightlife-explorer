/**
 * PartnerVipListPage — FIX 10F
 *
 * Lista todas as listas VIP do parceiro com abas operacionais:
 * Ativas (open + sold_out) · Fechadas · Encerradas · Arquivadas.
 *
 * Dispara `close_due_partner_vip_lists` antes do fetch principal
 * para garantir o fechamento automático real.
 */
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  listVipLists,
  createVipList,
  deriveVipListState,
  type PartnerVipList,
  type VipListPayload,
  type VipListOperationalState,
} from "../services/partnerVipLists";
import { closeDuePartnerVipLists } from "../services/partnerMaintenance";
import { usePartnerAuth, canManageEvents } from "../hooks/usePartnerAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { VipListTable } from "../components/VipListTable";
import { VipListEmptyState } from "../components/VipListEmptyState";
import { VipListForm } from "../components/VipListForm";

type Bucket = "active" | "closed" | "ended" | "archived";

const bucketOf = (l: PartnerVipList): Bucket => {
  const op: VipListOperationalState = deriveVipListState(l, 0, null);
  if (op === "archived") return "archived";
  if (op === "ended") return "ended";
  if (op === "closed") return "closed";
  return "active";
};

const PartnerVipListPage = () => {
  const { selectedPartner, role } = usePartnerAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const partnerId = selectedPartner?.id ?? null;
  const canCreate = canManageEvents(role);

  const [lists, setLists] = useState<PartnerVipList[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<Bucket>("active");

  const reload = async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      await closeDuePartnerVipLists();
      setLists(await listVipLists(partnerId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  const handleCreate = async (payload: VipListPayload) => {
    if (!partnerId) return;
    setCreating(true);
    try {
      await createVipList(partnerId, payload);
      setShowForm(false);
      await reload();
    } finally {
      setCreating(false);
    }
  };

  const buckets = useMemo(() => {
    const acc: Record<Bucket, PartnerVipList[]> = {
      active: [],
      closed: [],
      ended: [],
      archived: [],
    };
    for (const l of lists) acc[bucketOf(l)].push(l);
    return acc;
  }, [lists]);

  if (!partnerId) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-2xl font-bold">Lista VIP</h1>
        <p className="text-muted-foreground">Selecione um estabelecimento.</p>
      </main>
    );
  }

  const open = (l: PartnerVipList) => navigate(`/lista-vip/${l.id}`);

  const renderTab = (key: Bucket) => {
    const rows = buckets[key];
    if (!rows.length) {
      return (
        <p className="text-sm text-muted-foreground py-6">
          Nada por aqui ainda.
        </p>
      );
    }
    if (key === "active") {
      return <VipListTable lists={rows} onOpen={open} />;
    }
    return <VipListTable lists={rows} onOpen={open} compact dim />;
  };

  return (
    <main className="min-h-screen w-full max-w-7xl mx-auto space-y-6 p-4 sm:p-6 overflow-x-hidden">
      <header className="flex items-center justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Listas VIP</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie convidados especiais de {selectedPartner?.name}.
          </p>
        </div>
        {canCreate ? (
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancelar" : "Nova lista"}
          </Button>
        ) : null}
      </header>

      {showForm ? (
        <Card className="p-4">
          <VipListForm onSubmit={handleCreate} submitting={creating} />
        </Card>
      ) : null}

      {loading && !lists.length ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : lists.length === 0 ? (
        <VipListEmptyState />
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as Bucket)}>
          <TabsList className="w-full overflow-x-auto justify-start whitespace-nowrap flex-nowrap">
            <TabsTrigger value="active" className="shrink-0">
              Ativas {buckets.active.length ? `(${buckets.active.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="closed" className="shrink-0">
              Fechadas {buckets.closed.length ? `(${buckets.closed.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="ended" className="shrink-0">
              Encerradas {buckets.ended.length ? `(${buckets.ended.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="archived" className="shrink-0">
              Arquivadas {buckets.archived.length ? `(${buckets.archived.length})` : ""}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="mt-4">{renderTab("active")}</TabsContent>
          <TabsContent value="closed" className="mt-4">{renderTab("closed")}</TabsContent>
          <TabsContent value="ended" className="mt-4">{renderTab("ended")}</TabsContent>
          <TabsContent value="archived" className="mt-4">{renderTab("archived")}</TabsContent>
        </Tabs>
      )}
    </main>
  );
};

export default PartnerVipListPage;
