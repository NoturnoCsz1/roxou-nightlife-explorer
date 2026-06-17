import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Phone, Mail, Calendar, Clock, MessageCircle } from "lucide-react";
import { ReservationStatusBadge } from "./ReservationStatusBadge";
import type { PartnerReservationRow } from "../services/partnerReservations";

const formatRemaining = (ms: number) => {
  if (ms <= 0) return "00:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const formatPhoneBR = (raw: string | null | undefined): string => {
  if (!raw) return "";
  const d = raw.replace(/\D/g, "").replace(/^55/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
};

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);
  const ms = new Date(expiresAt).getTime() - now;
  return (
    <span className="inline-flex items-center gap-1 text-amber-500">
      <Clock className="h-3 w-3" />
      {formatRemaining(ms)}
    </span>
  );
}

export function ReservationCard({
  reservation,
  onView,
  onConfirm,
  onConfirmPayment,
  onWaiveDeposit,
  onCancel,
  onComplete,
  onNoShow,
  onRelease,
  canCancel,
  canConfirm,
  canComplete,
  canRelease,
}: {
  reservation: PartnerReservationRow;
  onView?: (r: PartnerReservationRow) => void;
  onConfirm?: (r: PartnerReservationRow) => void;
  onConfirmPayment?: (r: PartnerReservationRow) => void;
  onWaiveDeposit?: (r: PartnerReservationRow) => void;
  onCancel?: (r: PartnerReservationRow) => void;
  onComplete?: (r: PartnerReservationRow) => void;
  onNoShow?: (r: PartnerReservationRow) => void;
  onRelease?: (r: PartnerReservationRow) => void;
  canCancel?: boolean;
  canConfirm?: boolean;
  canComplete?: boolean;
  canRelease?: boolean;
}) {
  const date = new Date(reservation.reservation_date);
  const isPendingPayment = reservation.status === "pending_payment";
  const hasDeposit =
    (reservation.deposit_amount ?? 0) > 0 ||
    reservation.payment_status === "paid" ||
    reservation.payment_status === "waived";
  return (
    <Card className="bg-card/60">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold">{reservation.name}</p>
            <p className="text-xs text-muted-foreground">
              <Calendar className="mr-1 inline h-3 w-3" />
              {date.toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <ReservationStatusBadge status={reservation.status} />
        </div>
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          {reservation.phone && (
            <span className="inline-flex items-center gap-1 break-all">
              <Phone className="h-3 w-3 shrink-0" /> {formatPhoneBR(reservation.phone)}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3 shrink-0" />
            {reservation.people_count}{" "}
            {reservation.people_count === 1 ? "pessoa" : "pessoas"}
          </span>
          {reservation.email && (
            <span className="inline-flex items-center gap-1 break-all">
              <Mail className="h-3 w-3 shrink-0" /> {reservation.email}
            </span>
          )}
          {isPendingPayment && reservation.expires_at && (
            <Countdown expiresAt={reservation.expires_at} />
          )}
        </div>
        {hasDeposit ? (
          <div className="grid grid-cols-3 gap-1 rounded-md border border-border/40 bg-background/40 p-2 text-[11px]">
            <div>
              <p className="text-muted-foreground">Total</p>
              <p className="font-semibold">
                R$ {Number(reservation.total_price ?? 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Sinal</p>
              <p className="font-semibold">
                R$ {Number(reservation.deposit_amount ?? 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Restante</p>
              <p className="font-semibold">
                R${" "}
                {Number(
                  reservation.remaining_amount ??
                    Math.max(
                      (reservation.total_price ?? 0) -
                        (reservation.deposit_amount ?? 0),
                      0,
                    ),
                ).toFixed(2)}
              </p>
            </div>
            <div className="col-span-3">
              <p className="text-muted-foreground">
                Pagamento:{" "}
                <span
                  className={
                    reservation.payment_status === "paid"
                      ? "font-semibold text-emerald-500"
                      : reservation.payment_status === "waived"
                        ? "font-semibold text-blue-500"
                        : reservation.payment_status === "refunded"
                          ? "font-semibold text-rose-500"
                          : "font-semibold text-amber-500"
                  }
                >
                  {reservation.payment_status}
                </span>
              </p>
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-1">
          {onView && (
            <Button size="sm" variant="outline" onClick={() => onView(reservation)}>
              Ver
            </Button>
          )}
          {reservation.phone && (
        <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-3">
          {onView && (
            <Button size="sm" variant="outline" onClick={() => onView(reservation)} className="min-h-[44px] w-full">
              Ver
            </Button>
          )}
          {reservation.phone && (
            <Button
              size="sm"
              variant="outline"
              className="min-h-[44px] w-full"
              onClick={() => {
                const phone = (reservation.phone ?? "").replace(/[^0-9]/g, "");
                if (!phone) return;
                window.open(`https://wa.me/55${phone}`, "_blank", "noopener,noreferrer");
              }}
            >
              <MessageCircle className="mr-1 h-3.5 w-3.5" /> WhatsApp
            </Button>
          )}
          {canConfirm && isPendingPayment && onConfirmPayment && (
            <Button size="sm" onClick={() => onConfirmPayment(reservation)} className="min-h-[44px] w-full">
              Confirmar pagamento
            </Button>
          )}
          {canConfirm && isPendingPayment && onWaiveDeposit && (
            <Button size="sm" variant="secondary" onClick={() => onWaiveDeposit(reservation)} className="min-h-[44px] w-full">
              Dispensar sinal
            </Button>
          )}
          {canConfirm && reservation.status === "pending" && onConfirm && (
            <Button size="sm" onClick={() => onConfirm(reservation)} className="min-h-[44px] w-full">
              Confirmar
            </Button>
          )}
          {canComplete && reservation.status === "confirmed" && onComplete && (
            <Button size="sm" variant="secondary" onClick={() => onComplete(reservation)} className="min-h-[44px] w-full">
              Concluir
            </Button>
          )}
          {canComplete && reservation.status === "confirmed" && onNoShow && (
            <Button size="sm" variant="ghost" onClick={() => onNoShow(reservation)} className="min-h-[44px] w-full">
              No-show
            </Button>
          )}
          {canRelease &&
            reservation.status === "confirmed" &&
            !reservation.released_at &&
            onRelease && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRelease(reservation)}
                title="Libera a mesa imediatamente para outras reservas"
                className="min-h-[44px] w-full"
              >
                Liberar mesa
              </Button>
            )}
          {canCancel &&
            reservation.status !== "cancelled" &&
            reservation.status !== "completed" &&
            reservation.status !== "expired" &&
            onCancel && (
              <Button size="sm" variant="ghost" onClick={() => onCancel(reservation)} className="min-h-[44px] w-full">
                Cancelar
              </Button>
            )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ReservationCard;
