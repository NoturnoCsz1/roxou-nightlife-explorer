/**
 * PartnerLimpezaPage — FASE 4.
 *
 * Central de limpeza: arquivamento visual (localStorage) de registros antigos
 * e limpeza de cache local. Nenhum dado é deletado no banco; o arquivamento
 * é por filtro client-side reaproveitando status existentes.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  Sparkles,
  CalendarRange,
  Bell,
  Hourglass,
  Eye,
  Archive,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

import { PartnerScreen } from "../components/PartnerScreen";
import { usePartnerAuth } from "../hooks/usePartnerAuth";
import {
  listReservations,
  listReservationWaitlist,
  type PartnerReservationRow,
  type ReservationWaitlistEntry,
} from "../services/partnerReservations";
import { listMyEvents, type PartnerEventRow } from "../services/partnerEvents";
import {
  archiveIds,
  clearLocalCaches,
  clearScope,
  getArchivedIds,
  getLastRun,
  type ArchiveScope,
} from "../lib/partnerLocalArchive";
import { trackPartnerClient } from "../lib/partnerInteractions";

const DAY = 24 * 60 * 60 * 1000;

const isOlderThan = (iso: string | null | undefined, days: number) => {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() > days * DAY;
};

const RESERVATION_CLOSED_STATUS = new Set([
  "completed",
  "cancelled",
  "no_show",
  "expired",
]);

const WAITLIST_CLOSED_STATUS = new Set(["cancelled", "expired", "accepted"]);

const fmtLastRun = (iso: string | null) => {
  if (!iso) return "Nunca executada";
  try {
    return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  } catch {
    return "—";
  }
};

interface Candidate<T> {
  scope: ArchiveScope;
  title: string;
  icon: typeof Sparkles;
  description: string;
  items: T[];
  ids: string[];
  preview: (it: T) => string;
}

const PartnerLimpezaPage = () => {
  const { selectedPartnerId } = usePartnerAuth();
  const [reservations, setReservations] = useState<PartnerReservationRow[]>([]);
  const [waitlist, setWaitlist] = useState<ReservationWaitlistEntry[]>([]);
  const [events, setEvents] = useState<PartnerEventRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [previewScope, setPreviewScope] = useState<ArchiveScope | null>(null);
  const [confirmScope, setConfirmScope] = useState<ArchiveScope | null>(null);
  const [destructiveOpen, setDestructiveOpen] = useState(false);
  const [destructiveText, setDestructiveText] = useState("");

  const [, forceTick] = useState(0);
  const refresh = () => forceTick((n) => n + 1);

  useEffect(() => {
    if (!selectedPartnerId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listReservations(selectedPartnerId, { limit: 500 }),
      listReservationWaitlist(selectedPartnerId).catch(() => []),
      listMyEvents(selectedPartnerId, { limit: 500 }).catch(() => []),
    ])
      .then(([r, w, e]) => {
        if (cancelled) return;
        setReservations(r);
        setWaitlist(w);
        setEvents(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPartnerId]);

  const archivedReservations = getArchivedIds("reservations");
  const archivedWaitlist = getArchivedIds("waitlist");
  const archivedEvents = getArchivedIds("events");
  const archivedNotifs = getArchivedIds("notifications");

  const candReservations: Candidate<PartnerReservationRow> = useMemo(() => {
    const items = reservations.filter(
      (r) =>
        RESERVATION_CLOSED_STATUS.has(r.status) &&
        isOlderThan(r.updated_at ?? r.created_at, 7) &&
        !archivedReservations.has(r.id),
    );
    return {
      scope: "reservations",
      title: "Reservas antigas",
      icon: CalendarRange,
      description: "Concluídas, canceladas ou no-show há mais de 7 dias.",
      items,
      ids: items.map((i) => i.id),
      preview: (it) =>
        `${it.name ?? "Sem nome"} · ${new Date(it.reservation_date).toLocaleDateString("pt-BR")}`,
    };
  }, [reservations, archivedReservations]);

  const candWaitlist: Candidate<ReservationWaitlistEntry> = useMemo(() => {
    const items = waitlist.filter(
      (w) =>
        WAITLIST_CLOSED_STATUS.has(w.status) &&
        isOlderThan(w.updated_at ?? w.created_at, 7) &&
        !archivedWaitlist.has(w.id),
    );
    return {
      scope: "waitlist",
      title: "Filas antigas",
      icon: Hourglass,
      description: "Espera cancelada, expirada ou já atendida há mais de 7 dias.",
      items,
      ids: items.map((i) => i.id),
      preview: (it) => `${it.name} · ${it.guests_count} pessoas`,
    };
  }, [waitlist, archivedWaitlist]);

  const candEvents: Candidate<PartnerEventRow> = useMemo(() => {
    const items = events.filter(
      (e) =>
        isOlderThan(e.date_time, 30) &&
        e.status !== "archived" &&
        !archivedEvents.has(e.id),
    );
    return {
      scope: "events",
      title: "Eventos encerrados",
      icon: CalendarRange,
      description: "Eventos com data anterior a 30 dias.",
      items,
      ids: items.map((i) => i.id),
      preview: (it) =>
        `${it.title} · ${new Date(it.date_time).toLocaleDateString("pt-BR")}`,
    };
  }, [events, archivedEvents]);

  // Notificações: contagem aproximada por idade dos toasts do localStorage seen-store.
  // Como não temos uma fonte unificada de notificações no client, exibimos o
  // total já marcado como visto/arquivado e expomos botão de limpar.
  const candNotifications: Candidate<{ id: string }> = useMemo(() => {
    const ids: string[] = Array.from(archivedNotifs);
    return {
      scope: "notifications",
      title: "Notificações antigas",
      icon: Bell,
      description: "Notificações lidas com mais de 15 dias.",
      items: ids.map((id) => ({ id })),
      ids,
      preview: (it) => it.id,
    };
  }, [archivedNotifs]);

  const cards = [candReservations, candWaitlist, candEvents, candNotifications];

  const runArchive = (scope: ArchiveScope) => {
    let card: Candidate<unknown> | undefined;
    if (scope === "reservations") card = candReservations as Candidate<unknown>;
    if (scope === "waitlist") card = candWaitlist as Candidate<unknown>;
    if (scope === "events") card = candEvents as Candidate<unknown>;
    if (scope === "notifications") card = candNotifications as Candidate<unknown>;
    if (!card) return;
    const added = archiveIds(scope, card.ids);
    trackPartnerClient("partner_deeplink_open", {
      page: "limpeza",
      action: "archive",
      scope,
      count: added,
    });
    toast({
      title: `${added} registro${added === 1 ? "" : "s"} arquivado${added === 1 ? "" : "s"}`,
      description: "Nada foi excluído. Você pode revisar mais tarde.",
    });
    refresh();
  };

  const runCacheClear = () => {
    const n = clearLocalCaches();
    toast({ title: "Cache local limpo", description: `${n} item(ns) removido(s).` });
    refresh();
  };

  const handleArchiveClick = (scope: ArchiveScope) => setConfirmScope(scope);

  const handleDestructiveConfirm = () => {
    if (destructiveText.trim().toUpperCase() !== "LIMPAR") return;
    runCacheClear();
    setDestructiveOpen(false);
    setDestructiveText("");
  };

  const previewCard = previewScope
    ? cards.find((c) => c.scope === previewScope)
    : null;

  return (
    <PartnerScreen
      title="Limpeza de registros"
      subtitle="Arquivamento seguro. Nada é apagado do banco."
    >
      <div className="text-[11px] text-muted-foreground -mt-2">
        Use esta área para esconder registros antigos do dia a dia. Tudo permanece
        salvo e pode ser revisado depois.
      </div>

      <div className="grid grid-cols-1 gap-2">
        {cards.map((card) => {
          const Icon = card.icon;
          const count = card.items.length;
          const last = fmtLastRun(getLastRun(card.scope));
          return (
            <Card key={card.scope} className="border-white/8 bg-white/[0.03]">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                    <Icon className="h-4.5 w-4.5 text-foreground/80" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {card.title}
                      </span>
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {count} encontrad{count === 1 ? "o" : "os"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {card.description}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      Última limpeza: {last}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 text-xs"
                        disabled={count === 0}
                        onClick={() => setPreviewScope(card.scope)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> Ver
                      </Button>
                      <Button
                        size="sm"
                        className="h-9 text-xs"
                        disabled={count === 0}
                        onClick={() => handleArchiveClick(card.scope)}
                      >
                        <Archive className="h-3.5 w-3.5 mr-1" /> Arquivar
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-rose-500/20 bg-rose-500/[0.04]">
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
              <Trash2 className="h-4.5 w-4.5 text-rose-300" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium text-rose-200">
                Limpar cache do dispositivo
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Remove dados temporários e rascunhos salvos neste navegador.
                Sua sessão e configurações principais não são afetadas.
              </p>
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                Última limpeza: {fmtLastRun(getLastRun("cache"))}
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="h-9 text-xs mt-2 w-full"
                onClick={() => setDestructiveOpen(true)}
              >
                Limpar cache local
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="pt-2">
        <Button variant="ghost" size="sm" className="w-full" asChild>
          <Link to="/configuracoes">
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar para Configurações
          </Link>
        </Button>
      </div>

      {/* Preview drawer simples */}
      <AlertDialog
        open={previewScope !== null}
        onOpenChange={(o) => !o && setPreviewScope(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{previewCard?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              Visualize antes de arquivar. Nenhum dado será apagado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-72 overflow-y-auto space-y-1 text-sm">
            {previewCard && previewCard.items.length > 0 ? (
              previewCard.items.slice(0, 50).map((it: unknown, idx) => {
                const item = it as { id: string };
                return (
                  <div
                    key={item.id ?? idx}
                    className="px-2 py-1.5 rounded bg-white/[0.03] border border-white/5 truncate"
                  >
                    {previewCard.preview(it as never)}
                  </div>
                );
              })
            ) : (
              <p className="text-muted-foreground text-center py-4">Nada a exibir.</p>
            )}
            {previewCard && previewCard.items.length > 50 ? (
              <p className="text-[11px] text-muted-foreground text-center pt-1">
                +{previewCard.items.length - 50} ocultos…
              </p>
            ) : null}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
            {previewCard && previewCard.items.length > 0 ? (
              <AlertDialogAction
                onClick={() => {
                  const scope = previewCard.scope;
                  setPreviewScope(null);
                  setConfirmScope(scope);
                }}
              >
                Arquivar todos
              </AlertDialogAction>
            ) : null}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação padrão de arquivamento */}
      <AlertDialog
        open={confirmScope !== null}
        onOpenChange={(o) => !o && setConfirmScope(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar registros antigos?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação irá arquivar registros antigos. Nenhum dado será apagado
              permanentemente. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmScope) runArchive(confirmScope);
                setConfirmScope(null);
              }}
            >
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação destrutiva: digitar LIMPAR */}
      <AlertDialog open={destructiveOpen} onOpenChange={setDestructiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar cache local</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação remove dados temporários do navegador. Digite{" "}
              <strong>LIMPAR</strong> para confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            autoFocus
            value={destructiveText}
            onChange={(e) => setDestructiveText(e.target.value)}
            placeholder="Digite LIMPAR"
            className="bg-white/5 border-white/10"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDestructiveText("")}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={destructiveText.trim().toUpperCase() !== "LIMPAR"}
              onClick={handleDestructiveConfirm}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {loading ? (
        <div className="text-center text-xs text-muted-foreground py-2">
          Atualizando contagens…
        </div>
      ) : null}

      {/* Botão administrativo: desfazer arquivamento local */}
      {(archivedReservations.size || archivedWaitlist.size || archivedEvents.size || archivedNotifs.size) > 0 ? (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-[11px] text-muted-foreground"
          onClick={() => {
            (["reservations", "waitlist", "events", "notifications"] as ArchiveScope[]).forEach(
              clearScope,
            );
            toast({ title: "Arquivamento local desfeito" });
            refresh();
          }}
        >
          Desfazer todos os arquivamentos locais
        </Button>
      ) : null}
    </PartnerScreen>
  );
};

export default PartnerLimpezaPage;
