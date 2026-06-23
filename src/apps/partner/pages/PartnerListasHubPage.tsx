/**
 * PartnerListasHubPage — FASE 6B
 *
 * Hub slim de Listas VIP, espelha o de Reservas. Hero KPI + tiles de
 * navegação para subpáginas especializadas.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  ScanLine,
  Users,
  History,
  Settings,
  UserCog,
  PlayCircle,
  ListChecks,
  Megaphone,
  X,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { PartnerScreen } from "../components/PartnerScreen";
import { PartnerEmptyState } from "../components/PartnerEmptyState";
import { PartnerActionTile } from "../components/PartnerActionTile";
import { VipListForm } from "../components";
import { usePartnerAuth, canManageEvents } from "../hooks/usePartnerAuth";
import { onFabClick } from "../components/PartnerFab";
import {
  createVipList,
  deriveVipListState,
  listVipLists,
  type PartnerVipList,
  type VipListPayload,
} from "../services/partnerVipLists";
import { listPromoters } from "../services/partnerPromoters";
import { closeDuePartnerVipLists } from "../services/partnerMaintenance";

const formatTime = (iso: string | null): string => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDay = (iso: string | null): string => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  });
};

const PartnerListasHubPage = () => {
  const navigate = useNavigate();
  const { selectedPartner, role } = usePartnerAuth();
  const partnerId = selectedPartner?.id ?? null;
  const canCreate = canManageEvents(role);

  const [lists, setLists] = useState<PartnerVipList[]>([]);
  const [promotersCount, setPromotersCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      await closeDuePartnerVipLists();
      const [ls, pr] = await Promise.all([
        listVipLists(partnerId),
        listPromoters(partnerId).catch(() => []),
      ]);
      setLists(ls);
      setPromotersCount(pr.length);
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => onFabClick("vip:new", () => setFormOpen(true)), []);

  const buckets = useMemo(() => {
    const open: PartnerVipList[] = [];
    const closed: PartnerVipList[] = [];
    for (const l of lists) {
      const op = deriveVipListState(l, 0, null);
      if (op === "open" || op === "sold_out") open.push(l);
      else closed.push(l);
    }
    return { open, closed };
  }, [lists]);

  const upcoming = useMemo(() => {
    const future = buckets.open
      .slice()
      .sort((a, b) => {
        const ta = new Date(a.starts_at ?? a.created_at).getTime();
        const tb = new Date(b.starts_at ?? b.created_at).getTime();
        return ta - tb;
      });
    return future[0] ?? null;
  }, [buckets.open]);

  const handleCreate = async (payload: VipListPayload) => {
    if (!partnerId) return;
    setCreating(true);
    try {
      const created = await createVipList(partnerId, payload);
      toast({ title: "Lista criada" });
      setFormOpen(false);
      void load();
      navigate(`/lista-vip/${created.id}`);
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    } finally {
      setCreating(false);
    }
  };

  if (!partnerId) {
    return (
      <PartnerScreen title="Listas VIP">
        <PartnerEmptyState ctaLabel="Voltar" ctaTo="/" />
      </PartnerScreen>
    );
  }

  return (
    <PartnerScreen
      title="Listas VIP"
      subtitle={selectedPartner?.name ?? undefined}
    >
      {/* Hero KPI */}
      <Card className="rounded-2xl border-white/8 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5">
        <CardContent className="p-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Listas abertas
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {buckets.open.length}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Encerradas
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {buckets.closed.length}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Promoters
            </p>
            <p className="text-2xl font-semibold tabular-nums">{promotersCount}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Total
            </p>
            <p className="text-2xl font-semibold tabular-nums">{lists.length}</p>
          </div>
        </CardContent>
      </Card>

      {/* Próxima lista */}
      {upcoming ? (
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center">
              <ListChecks className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Próxima lista
              </p>
              <p className="text-sm font-medium truncate">{upcoming.title}</p>
              <p className="text-[11px] text-muted-foreground">
                {formatDay(upcoming.starts_at)} · {formatTime(upcoming.starts_at)}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/lista-vip/${upcoming.id}`)}
            >
              Abrir
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Ações rápidas */}
      <section className="space-y-2" aria-label="Ações rápidas">
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground px-1">
          Gerenciar
        </h2>
        <div className="grid gap-2">
          <PartnerActionTile
            icon={ListChecks}
            label="Listas abertas"
            hint="Hoje, semana e todas"
            to="/listas/abertas"
            badge={buckets.open.length ? String(buckets.open.length) : undefined}
          />
          <PartnerActionTile
            icon={X}
            label="Listas fechadas"
            hint="Reabrir, duplicar e arquivar"
            to="/listas/fechadas"
            badge={
              buckets.closed.length ? String(buckets.closed.length) : undefined
            }
          />
          <PartnerActionTile
            icon={Users}
            label="Participantes"
            hint="Confirmados, pendentes, check-ins"
            to="/listas/participantes"
          />
          <PartnerActionTile
            icon={Megaphone}
            label="Promoters"
            hint="Links e desempenho"
            to="/listas/promoters"
            badge={promotersCount ? String(promotersCount) : undefined}
          />
          <PartnerActionTile
            icon={ScanLine}
            label="Validador QR"
            hint="Check-in por código"
            to="/validator"
          />
          <PartnerActionTile
            icon={History}
            label="Histórico"
            hint="Sessões por dia"
            to="/listas/historico"
          />
          <PartnerActionTile
            icon={PlayCircle}
            label="Operação diária"
            hint="Abrir, encerrar e arquivar"
            to="/listas/operacao"
          />
          <PartnerActionTile
            icon={UserCog}
            label="Equipe e acessos"
            hint="Validador, recepção, gerente"
            to="/listas/equipe"
          />
          <PartnerActionTile
            icon={Settings}
            label="Configurações"
            hint="Inscrições, limites e links"
            to="/listas/configuracoes"
          />
        </div>
        {canCreate ? (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="w-full rounded-2xl border border-dashed border-white/15 px-3 py-3 text-sm text-foreground/80 hover:bg-white/[0.04] transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Criar nova lista
          </button>
        ) : null}
      </section>

      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Nova lista VIP</SheetTitle>
          </SheetHeader>
          <div className="py-3">
            <VipListForm onSubmit={handleCreate} submitting={creating} />
          </div>
        </SheetContent>
      </Sheet>

      {loading && !lists.length ? (
        <p className="text-xs text-muted-foreground text-center">Carregando…</p>
      ) : null}
    </PartnerScreen>
  );
};

export default PartnerListasHubPage;
