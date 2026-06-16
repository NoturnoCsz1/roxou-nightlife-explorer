import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ReservationStatusBadge } from "./ReservationStatusBadge";
import type { PartnerReservationRow } from "../services/partnerReservations";

export function ReservationTable({
  reservations,
  onView,
  onConfirm,
  onCancel,
  onComplete,
  canCancel,
  canConfirm,
  canComplete,
}: {
  reservations: PartnerReservationRow[];
  onView?: (r: PartnerReservationRow) => void;
  onConfirm?: (r: PartnerReservationRow) => void;
  onCancel?: (r: PartnerReservationRow) => void;
  onComplete?: (r: PartnerReservationRow) => void;
  canCancel?: boolean;
  canConfirm?: boolean;
  canComplete?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Quando</TableHead>
            <TableHead>Pessoas</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.map((r) => {
            const d = new Date(r.reservation_date);
            return (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.phone || r.email || "—"}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {d.toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell>{r.people_count}</TableCell>
                <TableCell>
                  <ReservationStatusBadge status={r.status} />
                </TableCell>
                <TableCell className="space-x-1 text-right">
                  {onView && (
                    <Button size="sm" variant="ghost" onClick={() => onView(r)}>
                      Ver
                    </Button>
                  )}
                  {canConfirm && r.status === "pending" && onConfirm && (
                    <Button size="sm" onClick={() => onConfirm(r)}>
                      Confirmar
                    </Button>
                  )}
                  {canComplete && r.status === "confirmed" && onComplete && (
                    <Button size="sm" variant="secondary" onClick={() => onComplete(r)}>
                      Concluir
                    </Button>
                  )}
                  {canCancel && r.status !== "cancelled" && onCancel && (
                    <Button size="sm" variant="ghost" onClick={() => onCancel(r)}>
                      Cancelar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default ReservationTable;
