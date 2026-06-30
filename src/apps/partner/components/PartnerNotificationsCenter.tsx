/**
 * PartnerNotificationsCenter — Fase 10 (UI only)
 *
 * Central de notificações operacionais derivada dos dados já carregados.
 * Não cria queries, RPCs, tabelas ou backend. Apenas useMemo sobre rows/waitlist.
 *
 * Sinais cobertos:
 * - Pendências de pagamento expirando (próximas 30min)
 * - Reservas confirmadas chegando agora (próximos 15min)
 * - Lista de espera há mais de 20min sem retorno
 * - No-shows recentes do dia (potencial fricção)
 * - Reservas encerradas sem liberação de mesa (ocupando recurso)
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Trash2,
  Users,
  X,
  ChevronRight,
} from "lucide-react";
import {
  getDismissedIds,
  getResolvedIds,
  markNotif,
  clearResolved as clearResolvedNotifs,
} from "../lib/partnerNotificationDismissal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard, SectionHeader } from "./ui";
import type {
  PartnerReservationRow,
  ReservationWaitlistEntry,
} from "../services/partnerReservations";

type Severity = "critical" | "warning" | "info" | "success";

interface NotificationItem {
  id: string;
  severity: Severity;
  icon: typeof Bell;
  title: string;
  description: string;
  timestamp?: string;
}

const SEVERITY_STYLE: Record<
  Severity,
  { dot: string; ring: string; chip: string }
> = {
  critical: {
    dot: "bg-rose-500",
    ring: "ring-rose-500/40",
    chip: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  },
  warning: {
    dot: "bg-amber-500",
    ring: "ring-amber-500/40",
    chip: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  info: {
    dot: "bg-sky-500",
    ring: "ring-sky-500/40",
    chip: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  },
  success: {
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/40",
    chip: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
};

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Crítico",
  warning: "Atenção",
  info: "Informação",
  success: "Tudo certo",
};

const minutesAgo = (iso: string): number => {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.round((Date.now() - t) / 60000));
};

const minutesUntil = (iso: string): number => {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.round((t - Date.now()) / 60000);
};

interface Props {
  rows: PartnerReservationRow[];
  waitlist: ReservationWaitlistEntry[];
  onOpenSection?: (section: "list" | "waitlist" | "report") => void;
  /** Evento de hoje (opcional) — alimenta insights guiados. */
  eventToday?: { id: string; title: string } | null;
  /** Slug do parceiro — usado nos insights de Bio/links. */
  partnerSlug?: string | null;
}

export function PartnerNotificationsCenter({
  rows,
  waitlist,
  onOpenSection,
  eventToday,
  partnerSlug,
}: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => getDismissedIds());
  const [resolved, setResolved] = useState<Set<string>>(() => getResolvedIds());

  // Re-sincroniza ao montar (caso outra aba tenha alterado).
  useEffect(() => {
    setDismissed(getDismissedIds());
    setResolved(getResolvedIds());
  }, []);

  const handleDismiss = useCallback((id: string) => {
    markNotif(id, "dismissed");
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const handleResolve = useCallback((id: string) => {
    markNotif(id, "resolved");
    setResolved((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const handleClearResolved = useCallback(() => {
    clearResolvedNotifs();
    setResolved(new Set());
  }, []);

  const items = useMemo<NotificationItem[]>(() => {
    const out: NotificationItem[] = [];
    const now = Date.now();

    // 1. Pendências de pagamento próximas do limite
    const pending = rows.filter(
      (r) => r.status === "pending_payment" || r.status === "pending",
    );
    pending.forEach((r) => {
      const mins = minutesUntil(r.reservation_date);
      if (mins > -60 && mins < 30) {
        out.push({
          id: `pending-${r.id}`,
          severity: mins < 10 ? "critical" : "warning",
          icon: AlertCircle,
          title: `Pagamento pendente · ${r.name ?? "Reserva"}`,
          description:
            mins <= 0
              ? "Reserva já no horário sem pagamento confirmado."
              : `Pagamento expira em ~${mins}min.`,
        });
      }
    });

    // 2. Chegadas iminentes (confirmadas próximos 15min)
    rows
      .filter((r) => r.status === "confirmed")
      .forEach((r) => {
        const mins = minutesUntil(r.reservation_date);
        if (mins >= 0 && mins <= 15) {
          out.push({
            id: `arrival-${r.id}`,
            severity: "info",
            icon: Clock,
            title: `Chegada em ${mins}min · ${r.name ?? "Reserva"}`,
            description: `${r.people_count ?? "?"} pessoas. Prepare a mesa.`,
          });
        }
      });

    // 3. Lista de espera silenciada (>20min sem notificação)
    waitlist.forEach((w) => {
      const created = (w as { created_at?: string }).created_at;
      const notified = (w as { last_notified_at?: string | null })
        .last_notified_at;
      if (notified) return;
      if (!created) return;
      const mins = minutesAgo(created);
      if (mins >= 20) {
        out.push({
          id: `wait-${w.id}`,
          severity: mins >= 45 ? "warning" : "info",
          icon: Users,
          title: `${w.name} na fila há ${mins}min`,
          description: "Considere notificar ou liberar uma mesa.",
        });
      }
    });

    // 4. No-shows do dia (informativo)
    const todayKey = new Date().toDateString();
    const noShows = rows.filter(
      (r) =>
        r.status === "no_show" &&
        new Date(r.reservation_date).toDateString() === todayKey,
    );
    if (noShows.length > 0) {
      out.push({
        id: "noshow-today",
        severity: "warning",
        icon: AlertCircle,
        title: `${noShows.length} no-show${noShows.length > 1 ? "s" : ""} hoje`,
        description: "Revise o relatório para entender o padrão.",
      });
    }

    // 5. Mesas ocupadas após conclusão sem liberação (passou do horário)
    rows
      .filter((r) => r.status === "completed")
      .forEach((r) => {
        if (r.released_at) return;
        const end =
          new Date(r.reservation_date).getTime() +
          (r.duration_minutes ?? 90) * 60000;
        const minsOver = Math.round((Date.now() - end) / 60000);
        if (minsOver >= 10) {
          out.push({
            id: `release-${r.id}`,
            severity: "warning",
            icon: AlertCircle,
            title: `Liberar mesa · ${r.name ?? "Reserva"}`,
            description: `Concluída há ${minsOver}min sem liberação.`,
          });
        }
      });

    return out
      .filter((i) => !dismissed.has(i.id) && !resolved.has(i.id))
      .sort((a, b) => {
        const order: Record<Severity, number> = {
          critical: 0,
          warning: 1,
          info: 2,
          success: 3,
        };
        return order[a.severity] - order[b.severity];
      });
  }, [rows, waitlist, dismissed, resolved]);

  const counts = useMemo(() => {
    const c: Record<Severity, number> = {
      critical: 0,
      warning: 0,
      info: 0,
      success: 0,
    };
    items.forEach((i) => {
      c[i.severity] += 1;
    });
    return c;
  }, [items]);

  return (
    <div className="space-y-3">
      <SectionHeader
        icon={Bell}
        title="Central de notificações"
        description={
          items.length === 0
            ? "Tudo sob controle. Nenhum alerta operacional ativo."
            : `${items.length} ${items.length === 1 ? "alerta ativo" : "alertas ativos"} agora.`
        }
        action={
          <div className="flex flex-wrap items-center gap-1.5">
            {(["critical", "warning", "info"] as Severity[]).map((s) =>
              counts[s] > 0 ? (
                <Badge
                  key={s}
                  variant="outline"
                  className={SEVERITY_STYLE[s].chip}
                >
                  {counts[s]} {SEVERITY_LABEL[s].toLowerCase()}
                </Badge>
              ) : null,
            )}
            {resolved.size > 0 ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={handleClearResolved}
                title="Remove permanentemente as notificações já resolvidas"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Limpar resolvidas ({resolved.size})
              </Button>
            ) : null}
          </div>
        }
      />

      {items.length === 0 ? (
        <GlassCard className="p-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold">Tudo sob controle</p>
            <p className="text-xs text-muted-foreground">
              Sem pendências críticas no momento.
            </p>
          </div>
        </GlassCard>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => {
            const style = SEVERITY_STYLE[it.severity];
            const Icon = it.icon;
            const targetSection: "list" | "waitlist" | "report" =
              it.id.startsWith("wait-")
                ? "waitlist"
                : it.id.startsWith("noshow")
                  ? "report"
                  : "list";
            const focus = () => onOpenSection?.(targetSection);
            return (
              <li key={it.id}>
                <GlassCard className="partner-hover-lift p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={focus}
                      aria-label={`Abrir ${it.title}`}
                      className="flex flex-1 items-start gap-3 min-w-0 text-left rounded-lg -m-1 p-1"
                    >
                      <div
                        className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.04] ring-2 ${style.ring}`}
                      >
                        <Icon className="h-4 w-4" />
                        <span
                          className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ${style.dot}`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-tight truncate">
                          {it.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                          {it.description}
                        </p>
                      </div>
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      {onOpenSection && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="partner-tap h-9 w-9"
                          onClick={focus}
                          aria-label="Ver detalhes"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="partner-tap h-9 w-9 text-emerald-300/80 hover:text-emerald-300"
                        onClick={() => handleResolve(it.id)}
                        aria-label="Marcar como resolvido"
                        title="Marcar como resolvido — some da lista"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="partner-tap h-9 w-9 text-muted-foreground"
                        onClick={() => handleDismiss(it.id)}
                        aria-label="Dispensar alerta (não cancela o cliente)"
                        title="Dispensar alerta — não cancela o cliente"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default PartnerNotificationsCenter;
