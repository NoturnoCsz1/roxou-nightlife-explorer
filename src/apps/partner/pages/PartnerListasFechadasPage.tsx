/**
 * PartnerListasFechadasPage — FASE 6B
 *
 * Listas encerradas/canceladas/expiradas (até 7 dias).
 * Ações: Reabrir · Duplicar para nova data · Arquivar.
 *
 * Duplicação SEMPRE cria nova sessão limpa (sem participantes, check-ins,
 * promoters automáticos, QR ou histórico). Copia apenas título, descrição,
 * limites e regras.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, RotateCcw, Copy, Archive } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { PartnerScreen } from "../components/PartnerScreen";
import { PartnerEmptyState } from "../components/PartnerEmptyState";
import { usePartnerAuth, canManageEvents } from "../hooks/usePartnerAuth";
import {
  archiveVipList,
  createVipList,
  deriveVipListState,
  listVipLists,
  openVipList,
  type PartnerVipList,
} from "@modules/partner/vip";
import { closeDuePartnerVipLists } from "../services/partnerMaintenance";

const DAY = 24 * 60 * 60 * 1000;

const todaySpIsoLocal = (offsetDays = 0): string => {
  const sp = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
  );
  sp.setHours(20, 0, 0, 0);
  sp.setDate(sp.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${sp.getFullYear()}-${pad(sp.getMonth() + 1)}-${pad(sp.getDate())}T${pad(sp.getHours())}:${pad(sp.getMinutes())}`;
};

const formatDay = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleDateString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
      })
    : "—";

const PartnerListasFechadasPage = () => {
  const { selectedPartner, role } = usePartnerAuth();
  const partnerId = selectedPartner?.id ?? null;
  const canManage = canManageEvents(role);

  const [lists, setLists] = useState<PartnerVipList[]>([]);
  const [loading, setLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const [dupTarget, setDupTarget] = useState<PartnerVipList | null>(null);
  const [dupDate, setDupDate] = useState("");
  const [duping, setDuping] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<PartnerVipList | null>(null);

  const load = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      await closeDuePartnerVipLists();
      setLists(await listVipLists(partnerId));
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return lists
      .filter((l) => {
        const op = deriveVipListState(l, 0, null);
        if (op === "open" || op === "sold_out") return false;
        const age =
          (now - new Date(l.updated_at ?? l.created_at).getTime()) / DAY;
        if (!showArchived && (op === "archived" || age > 7)) return false;
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.updated_at ?? b.created_at).getTime() -
          new Date(a.updated_at ?? a.created_at).getTime(),
      );
  }, [lists, showArchived]);

  const handleReopen = async (l: PartnerVipList) => {
    try {
      await openVipList(l.id);
      toast({ title: "Lista reaberta" });
      void load();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    }
  };

  const openDup = (l: PartnerVipList) => {
    setDupTarget(l);
    setDupDate(todaySpIsoLocal(1));
  };

  const handleDuplicate = async () => {
    if (!partnerId || !dupTarget) return;
    setDuping(true);
    try {
      // Cria NOVA sessão limpa — copia somente metadados.
      const startsIso = dupDate ? new Date(dupDate).toISOString() : null;
      await createVipList(partnerId, {
        title: dupTarget.title,
        description: dupTarget.description,
        max_entries: dupTarget.max_entries,
        starts_at: startsIso,
        ends_at: null,
        // NÃO copia: participantes, check-ins, promoters, QR, status anterior.
      });
      toast({ title: "Nova sessão criada", description: "Sem participantes ou check-ins anteriores." });
      setDupTarget(null);
      void load();
    } catch (err) {
      toast({ title: "Erro ao duplicar", description: (err as Error).message });
    } finally {
      setDuping(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    try {
      await archiveVipList(archiveTarget.id);
      toast({ title: "Lista arquivada" });
      setArchiveTarget(null);
      void load();
    } catch (err) {
      toast({ title: "Erro", description: (err as Error).message });
    }
  };

  if (!partnerId) {
    return (
      <PartnerScreen title="Listas fechadas">
        <PartnerEmptyState ctaLabel="Voltar" ctaTo="/listas" />
      </PartnerScreen>
    );
  }

  return (
    <PartnerScreen
      title="Listas fechadas"
      subtitle={selectedPartner?.name ?? undefined}
    >
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setShowArchived((v) => !v)}
      >
        {showArchived ? "Ocultar arquivadas" : "Mostrar todas (inclui arquivadas)"}
      </Button>

      {loading && lists.length === 0 ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhuma lista fechada nos últimos 7 dias.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map((l) => {
            const op = deriveVipListState(l, 0, null);
            return (
              <Card key={l.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{l.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDay(l.starts_at)} · Encerrada
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-white/5 text-[10px] uppercase shrink-0"
                    >
                      {op}
                    </Badge>
                  </div>
                  {canManage ? (
                    <div className="flex flex-wrap gap-2">
                      {op !== "archived" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleReopen(l)}
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1" />
                          Reabrir
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDup(l)}
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Duplicar
                      </Button>
                      {op !== "archived" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose-300"
                          onClick={() => setArchiveTarget(l)}
                        >
                          <Archive className="h-3.5 w-3.5 mr-1" />
                          Arquivar
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Duplicar */}
      <Sheet open={!!dupTarget} onOpenChange={(o) => !o && setDupTarget(null)}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Duplicar para nova data</SheetTitle>
            <SheetDescription>
              Cria uma sessão NOVA. Não copia participantes, check-ins,
              promoters, QR, notificações ou logs.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="dup-date">Nova data e hora</Label>
              <Input
                id="dup-date"
                type="datetime-local"
                value={dupDate}
                onChange={(e) => setDupDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDupDate(todaySpIsoLocal(0))}
              >
                Hoje
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDupDate(todaySpIsoLocal(1))}
              >
                Amanhã
              </Button>
            </div>
            <div className="rounded-lg border border-white/8 bg-white/5 p-3 text-[11px] space-y-1">
              <p className="font-semibold text-foreground/90 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Será copiado
              </p>
              <p className="text-muted-foreground">
                ✓ Nome · ✓ Descrição · ✓ Limites · ✓ Regras
              </p>
              <p className="font-semibold text-foreground/90 mt-2">Não copiado</p>
              <p className="text-muted-foreground">
                ✗ Participantes · ✗ Check-ins · ✗ QR · ✗ Notificações
              </p>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setDupTarget(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleDuplicate()} disabled={duping}>
              {duping ? "Criando…" : "Criar nova sessão"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Arquivar */}
      <AlertDialog
        open={!!archiveTarget}
        onOpenChange={(o) => !o && setArchiveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar lista?</AlertDialogTitle>
            <AlertDialogDescription>
              {archiveTarget?.title} sai da operação. Continua acessível em
              "Mostrar todas".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleArchive()}>
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PartnerScreen>
  );
};

export default PartnerListasFechadasPage;
