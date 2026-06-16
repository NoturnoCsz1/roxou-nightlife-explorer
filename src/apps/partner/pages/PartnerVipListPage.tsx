/**
 * PartnerVipListPage — Fase 9I
 *
 * Lista todas as listas VIP do parceiro selecionado, com ação para criar nova.
 * Página órfã: ainda não registrada em App.tsx.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listVipLists,
  createVipList,
  type PartnerVipList,
  type VipListPayload,
} from "../services/partnerVipLists";
import { usePartnerAuth, canManageEvents } from "../hooks/usePartnerAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VipListTable } from "../components/VipListTable";
import { VipListEmptyState } from "../components/VipListEmptyState";
import { VipListForm } from "../components/VipListForm";

const PartnerVipListPage = () => {
  const { selectedPartner, role } = usePartnerAuth();
  const navigate = useNavigate();
  const partnerId = selectedPartner?.id ?? null;
  const canCreate = canManageEvents(role);

  const [lists, setLists] = useState<PartnerVipList[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const reload = async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
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

  if (!partnerId) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-2xl font-bold">Lista VIP</h1>
        <p className="text-muted-foreground">Selecione um estabelecimento.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
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

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : lists.length ? (
        <VipListTable
          lists={lists}
          onOpen={(l) => navigate(`/lista-vip/${l.id}`)}
        />
      ) : (
        <VipListEmptyState />
      )}
    </main>
  );
};

export default PartnerVipListPage;
