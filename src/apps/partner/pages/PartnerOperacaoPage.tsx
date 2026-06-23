/**
 * PartnerOperacaoPage — FASE 5
 *
 * Painel da operação diária do parceiro.
 *  - Abrir sessão de hoje
 *  - Encerrar operação (com confirmação)
 *  - Limpar notificações resolvidas
 *  - Ver histórico de sessões
 *  - Reabrir sessão recente
 *  - Excluir arquivados locais (digitar LIMPAR)
 *
 * Toda a persistência é local (localStorage). Não altera Supabase nem RLS.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  PlayCircle,
  PowerOff,
  Trash2,
  History,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";

import { PartnerScreen } from "../components/PartnerScreen";
import { usePartnerAuth } from "../hooks/usePartnerAuth";
import {
  closeSession,
  getCurrentSession,
  getOperationalDayKey,
  getSessionHistory,
  isSessionOpen,
  openSession,
  reopenSession,
  type PartnerSession,
} from "../lib/partnerSessions";
import {
  clearResolved,
  getResolvedIds,
} from "../lib/partnerNotificationDismissal";
import { clearScope, getArchivedIds } from "../lib/partnerLocalArchive";

const formatDayKey = (key: string): string => {
  const [y, m, d] = key.split("-");
  if (!y || !m || !d) return key;
  return `${d}/${m}/${y}`;
};

const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const PartnerOperacaoPage = () => {
  const { selectedPartner } = usePartnerAuth();
  const partnerId = selectedPartner?.id ?? "";

  const [, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);

  const [closeOpen, setCloseOpen] = useState(false);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purgeText, setPurgeText] = useState("");
  const [reopenTarget, setReopenTarget] = useState<PartnerSession | null>(null);

  const current = useMemo(
    () => (partnerId ? getCurrentSession(partnerId) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [partnerId, /* tick */],
  );
  const open = partnerId ? isSessionOpen(partnerId) : false;
  const history = useMemo(
    () => (partnerId ? getSessionHistory(partnerId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [partnerId],
  );
  const resolvedCount = getResolvedIds().size;
  const archivedReservations = getArchivedIds("reservations").size;
  const archivedWaitlist = getArchivedIds("waitlist").size;
  const archivedNotifs = getArchivedIds("notifications").size;
  const todayKey = getOperationalDayKey();

  const handleOpen = () => {
    if (!partnerId) return;
    const s = openSession(partnerId);
    toast.success("Operação aberta", {
      description: `Sessão de ${formatDayKey(s.dayKey)} iniciada.`,
    });
    refresh();
  };

  const handleClose = () => {
    if (!partnerId) return;
    const s = closeSession(partnerId);
    setCloseOpen(false);
    if (s) {
      toast.success("Operação encerrada", {
        description: "Os registros foram enviados para o histórico.",
      });
    } else {
      toast("Nenhuma sessão aberta para encerrar");
    }
    refresh();
  };

  const handleClearResolved = () => {
    const n = clearResolved();
    toast.success(`${n} notificação${n === 1 ? "" : "ões"} resolvida${n === 1 ? "" : "s"} limpa${n === 1 ? "" : "s"}.`);
    refresh();
  };

  const handleReopen = () => {
    if (!partnerId || !reopenTarget) return;
    const s = reopenSession(partnerId, reopenTarget.id);
    setReopenTarget(null);
    if (s) {
      toast.success("Sessão reaberta", {
        description: `Operação de ${formatDayKey(s.dayKey)} ativa novamente.`,
      });
    } else {
      toast.error("Não foi possível reabrir essa sessão.");
    }
    refresh();
  };

  const handlePurge = () => {
    if (purgeText.trim() !== "LIMPAR") {
      toast.error("Digite LIMPAR exatamente para confirmar.");
      return;
    }
    clearScope("reservations");
    clearScope("waitlist");
    clearScope("notifications");
    setPurgeOpen(false);
    setPurgeText("");
    toast.success("Arquivados locais removidos.");
    refresh();
  };

  return (
    <PartnerScreen
      title="Operação diária"
      subtitle={selectedPartner?.name ?? undefined}
    >
      {/* Status da operação */}
      <Card>
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">
                Hoje · {formatDayKey(todayKey)}
              </p>
              <p className="mt-0.5 text-base font-semibold">
                {open ? "Operação aberta" : "Nenhuma operação aberta"}
              </p>
              {current?.openedAt ? (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Aberta em {formatDateTime(current.openedAt)}
                </p>
              ) : null}
            </div>
            <Badge
              variant="outline"
              className={
                open
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : "bg-zinc-500/15 text-zinc-300 border-zinc-500/30"
              }
            >
              {open ? "Ativa" : "Fechada"}
            </Badge>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {open ? (
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => setCloseOpen(true)}
              >
                <PowerOff className="h-4 w-4 mr-2" />
                Encerrar operação
              </Button>
            ) : (
              <Button
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={handleOpen}
                disabled={!partnerId}
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Abrir reservas de hoje
              </Button>
            )}
          </div>

          {!open ? (
            <p className="text-[12px] text-muted-foreground">
              Ao abrir a sessão, fila e reservas começam zeradas visualmente e
              notificações resolvidas são limpas.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* Notificações & arquivados */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Manutenção rápida</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-2 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">Notificações resolvidas</p>
              <p className="text-[11px] text-muted-foreground">
                {resolvedCount} marcada{resolvedCount === 1 ? "" : "s"} como resolvida{resolvedCount === 1 ? "" : "s"}.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearResolved}
              disabled={resolvedCount === 0}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Limpar
            </Button>
          </div>

          <div className="border-t border-white/5" />

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">Arquivados locais</p>
              <p className="text-[11px] text-muted-foreground">
                {archivedReservations} reserva{archivedReservations === 1 ? "" : "s"} ·{" "}
                {archivedWaitlist} fila · {archivedNotifs} notif.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              asChild
            >
              <Link to="/configuracoes/limpeza">Gerenciar</Link>
            </Button>
          </div>

          <div className="border-t border-white/5" />

          <Button
            size="sm"
            variant="ghost"
            className="w-full justify-start text-rose-300 hover:text-rose-200 hover:bg-rose-500/10"
            onClick={() => setPurgeOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir arquivados (irreversível)
          </Button>
        </CardContent>
      </Card>

      {/* Histórico de sessões */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico de sessões
          </CardTitle>
          <span className="text-[11px] text-muted-foreground">
            {history.length} registro{history.length === 1 ? "" : "s"}
          </span>
        </CardHeader>
        <CardContent className="p-0 sm:px-3 pb-3">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 py-6">
              Nenhuma sessão encerrada ainda.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {history.map((s) => {
                const canReopen =
                  s.dayKey === todayKey ||
                  s.dayKey ===
                    getOperationalDayKey(
                      new Date(Date.now() - 24 * 60 * 60 * 1000),
                    );
                return (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {formatDayKey(s.dayKey)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDateTime(s.openedAt)}
                        {s.closedAt ? ` → ${formatDateTime(s.closedAt)}` : ""}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-zinc-500/15 text-zinc-300 border-zinc-500/30"
                    >
                      Arquivada
                    </Badge>
                    {canReopen ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={() => setReopenTarget(s)}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Reabrir
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="pt-2">
        <Button variant="ghost" size="sm" className="w-full" asChild>
          <Link to="/configuracoes">← Voltar a Configurações</Link>
        </Button>
      </div>

      {/* Confirmar encerrar */}
      <AlertDialog open={closeOpen} onOpenChange={setCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Encerrar operação?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Encerrar a operação irá arquivar reservas, listas e notificações
              desta sessão. Os dados continuarão no histórico. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClose}
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              Encerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar reabrir */}
      <AlertDialog
        open={!!reopenTarget}
        onOpenChange={(o) => !o && setReopenTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir sessão?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa sessão voltará para operação. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReopen}>
              Reabrir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Excluir arquivados */}
      <AlertDialog open={purgeOpen} onOpenChange={setPurgeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              Excluir arquivados locais?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove os arquivamentos locais (reservas, fila e
              notificações) deste dispositivo. Não afeta o banco de dados.
              Digite <span className="font-mono font-bold">LIMPAR</span> para
              confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={purgeText}
            onChange={(e) => setPurgeText(e.target.value)}
            placeholder="LIMPAR"
            className="mt-2"
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPurgeText("")}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePurge}
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PartnerScreen>
  );
};

export default PartnerOperacaoPage;
