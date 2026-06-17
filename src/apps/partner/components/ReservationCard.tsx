import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Phone, Mail, Calendar, Clock } from "lucide-react";
import { ReservationStatusBadge } from "./ReservationStatusBadge";
import type { PartnerReservationRow } from "../services/partnerReservations";

const formatRemaining = (ms: number) => {
  if (ms <= 0) return "00:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
  onCancel,
  onComplete,
  onNoShow,
  canCancel,
  canConfirm,
  canComplete,
}: {
  reservation: PartnerReservationRow;
  onView?: (r: PartnerReservationRow) => void;
  onConfirm?: (r: PartnerReservationRow) => void;
  onConfirmPayment?: (r: PartnerReservationRow) => void;
  onCancel?: (r: PartnerReservationRow) => void;
  onComplete?: (r: PartnerReservationRow) => void;
  onNoShow?: (r: PartnerReservationRow) => void;
  canCancel?: boolean;
  canConfirm?: boolean;
  canComplete?: boolean;
}) {
  const date = new Date(reservation.reservation_date);
  const isPendingPayment = reservation.status === "pending_payment";
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
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" /> {reservation.people_count}
          </span>
          {reservation.phone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3" /> {reservation.phone}
            </span>
          )}
          {reservation.email && (
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3 w-3" /> {reservation.email}
            </span>
          )}
          {isPendingPayment && reservation.expires_at && (
            <Countdown expiresAt={reservation.expires_at} />
          )}
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {onView && (
            <Button size="sm" variant="outline" onClick={() => onView(reservation)}>
              Ver
            </Button>
          )}
          {canConfirm && isPendingPayment && onConfirmPayment && (
            <Button size="sm" onClick={() => onConfirmPayment(reservation)}>
              Confirmar pagamento
            </Button>
          )}
          {canConfirm && reservation.status === "pending" && onConfirm && (
            <Button size="sm" onClick={() => onConfirm(reservation)}>
              Confirmar
            </Button>
          )}
          {canComplete && reservation.status === "confirmed" && onComplete && (
            <Button size="sm" variant="secondary" onClick={() => onComplete(reservation)}>
              Concluir
            </Button>
          )}
          {canComplete && reservation.status === "confirmed" && onNoShow && (
            <Button size="sm" variant="ghost" onClick={() => onNoShow(reservation)}>
              No-show
            </Button>
          )}
          {canCancel &&
            reservation.status !== "cancelled" &&
            reservation.status !== "completed" &&
            reservation.status !== "expired" &&
            onCancel && (
              <Button size="sm" variant="ghost" onClick={() => onCancel(reservation)}>
                Cancelar
              </Button>
            )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ReservationCard;
