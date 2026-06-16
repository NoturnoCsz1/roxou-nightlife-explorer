import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Phone, Mail, Calendar } from "lucide-react";
import { ReservationStatusBadge } from "./ReservationStatusBadge";
import type { PartnerReservationRow } from "../services/partnerReservations";

export function ReservationCard({
  reservation,
  onView,
  onConfirm,
  onCancel,
  onComplete,
  canCancel,
  canConfirm,
  canComplete,
}: {
  reservation: PartnerReservationRow;
  onView?: (r: PartnerReservationRow) => void;
  onConfirm?: (r: PartnerReservationRow) => void;
  onCancel?: (r: PartnerReservationRow) => void;
  onComplete?: (r: PartnerReservationRow) => void;
  canCancel?: boolean;
  canConfirm?: boolean;
  canComplete?: boolean;
}) {
  const date = new Date(reservation.reservation_date);
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
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {onView && (
            <Button size="sm" variant="outline" onClick={() => onView(reservation)}>
              Ver
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
          {canCancel && reservation.status !== "cancelled" && onCancel && (
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
