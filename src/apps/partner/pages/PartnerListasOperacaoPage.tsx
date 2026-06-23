/**
 * PartnerListasOperacaoPage — FASE 6B
 * Reaproveita a UI da Operação Diária com namespace ::listas (sessão
 * separada da de Reservas). UI mínima: abrir/encerrar/reabrir/histórico.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  PlayCircle,
  PowerOff,
  History,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { getOperationalDayKey } from "../lib/partnerSessions";
import {
  closeListasSession,
  getCurrentListasSession,
  getListasSessionHistory,
  isListasSessionOpen,
  openListasSession,
  reopenListasSession,
  type PartnerSession,
} from "../lib/partnerListasSessions";

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

const PartnerListasOperacaoPage = () => {
  const { selectedPartner } = usePartnerAuth();
  const partnerId = selectedPartner?.id ?? "";

  const [, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);
  const [closeOpen, setCloseOpen] = useState(false);
  const [reopenTarget, setReopenTarget] = useState<PartnerSession | null>(null);

  const current = useMemo(
    () => (partnerId ? getCurrentListasSession(partnerId) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [partnerId],
  );
  const open = partnerId ? isListasSessionOpen(partnerId) : false;
  const history = useMemo(
    () => (partnerId ? getListasSessionHistory(partnerId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [partnerId],
  );
  const todayKey = getOperationalDayKey();

  const handleOpen = () => {
    if (!partnerId) return;
    const s = openListasSession(partnerId);
    toast.success("Operação aberta", { description: `Sessão ${formatDayKey(s.dayKey)} iniciada.` });
    refresh();
  };
  const handleClose = () => {
    if (!partnerId) return;
    closeListasSession(partnerId);
    setCloseOpen(false);
    toast.success("Operação encerrada");
    refresh();
  };
  const handleReopen = () => {
    if (!partnerId || !reopenTarget) return;
    const s = reopenSessionSafe(partnerId, reopenTarget.id);
    setReopenTarget(null);
    if (s) {
      toast.success("Sessão reaberta", {
        description: `Operação de ${formatDayKey(s.dayKey)} ativa.`,
      });
    } else {
      toast.error("Não foi possível reabrir.");
    }
    refresh();
  };
  const reopenSessionSafe = (p: string, id: string): PartnerSession | null =>
    reopenListasSession(p, id);

  return (
    <PartnerScreen
      title="Operação de listas"
      subtitle={selectedPartner?.name ?? undefined}
    >
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
                Encerrar
              </Button>
            ) : (
              <Button
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={handleOpen}
                disabled={!partnerId}
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Abrir operação
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico
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
              {history.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{formatDayKey(s.dayKey)}</p>
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
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2"
                    onClick={() => setReopenTarget(s)}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Reabrir
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="pt-2">
        <Button variant="ghost" size="sm" className="w-full" asChild>
          <Link to="/listas">← Voltar ao hub</Link>
        </Button>
      </div>

      <AlertDialog open={closeOpen} onOpenChange={setCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Encerrar operação?
            </AlertDialogTitle>
            <AlertDialogDescription>
              A sessão atual vai para o histórico. As listas em si continuam
              acessíveis e podem ser arquivadas separadamente.
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

      <AlertDialog
        open={!!reopenTarget}
        onOpenChange={(o) => !o && setReopenTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir sessão?</AlertDialogTitle>
            <AlertDialogDescription>
              Voltará à operação ativa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReopen}>Reabrir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PartnerScreen>
  );
};

export default PartnerListasOperacaoPage;
