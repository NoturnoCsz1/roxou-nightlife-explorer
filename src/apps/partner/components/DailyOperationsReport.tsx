/**
 * DailyOperationsReport — Relatório operacional diário (Reservas Pro).
 *
 * Resumo: total, confirmadas, pendentes, canceladas, expiradas, no-show,
 * check-ins, mesas liberadas, e fila de espera. Agrupamento por horário
 * (slot HH:mm). Filtro de data simples.
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { ReservationStatusBadge } from "./ReservationStatusBadge";
import type {
  PartnerReservationRow,
  ReservationWaitlistEntry,
  PartnerReservationType,
} from "@modules/partner/reservations";

const formatPhoneBR = (raw: string | null | undefined): string => {
  if (!raw) return "";
  const d = raw.replace(/\D/g, "").replace(/^55/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
};

const todayLocalDate = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const slotKey = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

interface Props {
  reservations: PartnerReservationRow[];
  waitlist: ReservationWaitlistEntry[];
  types: PartnerReservationType[];
  canConfirm?: boolean;
  canComplete?: boolean;
  canCancel?: boolean;
  canRelease?: boolean;
  onConfirmPayment?: (r: PartnerReservationRow) => void;
  onComplete?: (r: PartnerReservationRow) => void;
  onNoShow?: (r: PartnerReservationRow) => void;
  onCancel?: (r: PartnerReservationRow) => void;
  onRelease?: (r: PartnerReservationRow) => void;
  onNotifyWaitlist?: (e: ReservationWaitlistEntry) => void;
  onCancelWaitlist?: (e: ReservationWaitlistEntry) => void;
}

export function DailyOperationsReport({
  reservations,
  waitlist,
  types,
  canConfirm,
  canComplete,
  canCancel,
  canRelease,
  onConfirmPayment,
  onComplete,
  onNoShow,
  onCancel,
  onRelease,
  onNotifyWaitlist,
  onCancelWaitlist,
}: Props) {
  const [date, setDate] = useState<string>(todayLocalDate());

  const typeMap = useMemo(() => {
    const m = new Map<string, PartnerReservationType>();
    for (const t of types) m.set(t.id, t);
    return m;
  }, [types]);

  const dayRows = useMemo(() => {
    return reservations.filter((r) => {
      const d = new Date(r.reservation_date);
      const pad = (n: number) => String(n).padStart(2, "0");
      const k = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      return k === date;
    });
  }, [reservations, date]);

  const summary = useMemo(() => {
    const acc = {
      total: dayRows.length,
      confirmed: 0,
      pending: 0,
      cancelled: 0,
      expired: 0,
      noShow: 0,
      checkIns: 0,
      released: 0,
    };
    for (const r of dayRows) {
      if (r.status === "confirmed" || r.status === "completed") acc.confirmed += 1;
      if (r.status === "pending" || r.status === "pending_payment") acc.pending += 1;
      if (r.status === "cancelled") acc.cancelled += 1;
      if (r.status === "expired") acc.expired += 1;
      if (r.status === "no_show") acc.noShow += 1;
      if (r.checked_in_at) acc.checkIns += 1;
      if (r.released_at) acc.released += 1;
    }
    return acc;
  }, [dayRows]);

  const bySlot = useMemo(() => {
    const acc = new Map<string, PartnerReservationRow[]>();
    for (const r of dayRows) {
      const k = slotKey(r.reservation_date);
      if (!acc.has(k)) acc.set(k, []);
      acc.get(k)!.push(r);
    }
    return Array.from(acc.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [dayRows]);

  const activeWaitlist = useMemo(
    () => waitlist.filter((w) => w.status === "waiting" || w.status === "notified"),
    [waitlist],
  );

  const kpis = [
    { label: "Total", value: summary.total, cls: "" },
    { label: "Confirmadas", value: summary.confirmed, cls: "text-emerald-500" },
    { label: "Pendentes", value: summary.pending, cls: "text-amber-500" },
    { label: "Canceladas", value: summary.cancelled, cls: "text-rose-500" },
    { label: "Expiradas", value: summary.expired, cls: "text-zinc-400" },
    { label: "No-show", value: summary.noShow, cls: "text-orange-500" },
    { label: "Check-ins", value: summary.checkIns, cls: "text-sky-500" },
    { label: "Mesas liberadas", value: summary.released, cls: "text-blue-500" },
    { label: "Lista de espera", value: activeWaitlist.length, cls: "text-primary" },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Relatório operacional do dia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-w-xs">
            <Label className="text-xs">Data</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {kpis.map((k) => (
              <div
                key={k.label}
                className="rounded-md border border-border/60 bg-card/40 p-3"
              >
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {k.label}
                </p>
                <p className={`mt-1 text-2xl font-semibold tabular-nums ${k.cls}`}>
                  {k.value}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Agrupamento por horário</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {bySlot.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma reserva neste dia.
            </p>
          ) : (
            bySlot.map(([slot, list]) => (
              <div key={slot} className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wide text-primary">
                  {slot} ({list.length})
                </p>
                {list.map((r) => {
                  const type = r.reservation_type_id
                    ? typeMap.get(r.reservation_type_id)
                    : null;
                  const phone = (r.phone ?? "").replace(/[^0-9]/g, "");
                  return (
                    <div
                      key={r.id}
                      className="rounded-md border border-border/60 bg-card/40 p-3 text-xs space-y-2"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{r.name}</p>
                          {r.phone ? (
                            <p className="text-muted-foreground break-all">
                              {formatPhoneBR(r.phone)}
                            </p>
                          ) : null}
                          <p className="text-muted-foreground">
                            👥 {r.people_count}{" "}
                            {r.people_count === 1 ? "pessoa" : "pessoas"}
                            {type ? ` · ${type.name}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <ReservationStatusBadge status={r.status} />
                          {r.payment_status ? (
                            <Badge variant="outline" className="text-[10px]">
                              {r.payment_status}
                            </Badge>
                          ) : null}
                          {r.checked_in_at ? (
                            <Badge className="bg-sky-500/15 text-sky-500 text-[10px]">
                              Check-in
                            </Badge>
                          ) : null}
                          {r.released_at ? (
                            <Badge className="bg-blue-500/15 text-blue-500 text-[10px]">
                              Liberada
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {phone && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-h-[44px] w-full"
                            onClick={() =>
                              window.open(
                                `https://wa.me/55${phone}`,
                                "_blank",
                                "noopener,noreferrer",
                              )
                            }
                          >
                            <MessageCircle className="mr-1 h-3.5 w-3.5" /> WhatsApp
                          </Button>
                        )}
                        {canConfirm &&
                          r.status === "pending_payment" &&
                          onConfirmPayment && (
                            <Button
                              size="sm"
                              className="min-h-[44px] w-full"
                              onClick={() => onConfirmPayment(r)}
                            >
                              Confirmar pgto
                            </Button>
                          )}
                        {canComplete && r.status === "confirmed" && onComplete && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="min-h-[44px] w-full"
                            onClick={() => onComplete(r)}
                          >
                            Concluir
                          </Button>
                        )}
                        {canComplete && r.status === "confirmed" && onNoShow && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="min-h-[44px] w-full"
                            onClick={() => onNoShow(r)}
                          >
                            No-show
                          </Button>
                        )}
                        {canRelease &&
                          r.status === "confirmed" &&
                          !r.released_at &&
                          onRelease && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="min-h-[44px] w-full"
                              onClick={() => onRelease(r)}
                            >
                              Liberar mesa
                            </Button>
                          )}
                        {canCancel &&
                          r.status !== "cancelled" &&
                          r.status !== "completed" &&
                          r.status !== "expired" &&
                          onCancel && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="min-h-[44px] w-full"
                              onClick={() => onCancel(r)}
                            >
                              Cancelar
                            </Button>
                          )}
                        {r.public_token && (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="min-h-[44px] w-full"
                          >
                            <Link to={`/reserva/sucesso/${r.public_token}`}>
                              <ExternalLink className="mr-1 h-3.5 w-3.5" />
                              Comprovante
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Lista de espera ({activeWaitlist.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {activeWaitlist.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sem clientes em fila no momento.
            </p>
          ) : (
            activeWaitlist.map((entry, idx) => {
              const type = typeMap.get(entry.reservation_type_id);
              const fixed = type && type.requires_guest_count === false;
              const people = fixed ? type!.seats : entry.guests_count;
              const phone = entry.phone.replace(/[^0-9]/g, "");
              return (
                <div
                  key={entry.id}
                  className="rounded-md border border-border/60 bg-card/40 p-3 text-xs space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">
                        <span className="mr-1 inline-flex rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                          #{idx + 1}
                        </span>
                        {entry.name}
                      </p>
                      <p className="text-muted-foreground break-all">
                        {formatPhoneBR(entry.phone)}
                      </p>
                      <p className="text-muted-foreground">
                        👥 {people} {people === 1 ? "pessoa" : "pessoas"}
                        {fixed ? " incluídas" : ""}
                        {type ? ` · ${type.name}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline">{entry.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {onNotifyWaitlist && entry.status === "waiting" && (
                      <Button
                        size="sm"
                        className="min-h-[44px] w-full"
                        onClick={() => onNotifyWaitlist(entry)}
                      >
                        Notificar
                      </Button>
                    )}
                    {phone && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-[44px] w-full"
                        onClick={() =>
                          window.open(
                            `https://wa.me/55${phone}`,
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                      >
                        <MessageCircle className="mr-1 h-3.5 w-3.5" /> WhatsApp
                      </Button>
                    )}
                    {onCancelWaitlist &&
                      entry.status !== "cancelled" &&
                      entry.status !== "expired" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="min-h-[44px] w-full"
                          onClick={() => onCancelWaitlist(entry)}
                        >
                          Cancelar
                        </Button>
                      )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default DailyOperationsReport;
