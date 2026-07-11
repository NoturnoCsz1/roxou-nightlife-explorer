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
import type { PartnerReservationRow } from "@modules/partner/reservations";

const formatPhoneBR = (raw: string | null | undefined): string => {
  if (!raw) return "";
  const d = raw.replace(/\D/g, "").replace(/^55/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
};

export function ReservationTable({
  reservations,
  onView,
  onConfirm,
  onConfirmPayment,
  onCancel,
  onComplete,
  onNoShow,
  onRelease,
  canCancel,
  canConfirm,
  canComplete,
  canRelease,
}: {
  reservations: PartnerReservationRow[];
  onView?: (r: PartnerReservationRow) => void;
  onConfirm?: (r: PartnerReservationRow) => void;
  onConfirmPayment?: (r: PartnerReservationRow) => void;
  onCancel?: (r: PartnerReservationRow) => void;
  onComplete?: (r: PartnerReservationRow) => void;
  onNoShow?: (r: PartnerReservationRow) => void;
  onRelease?: (r: PartnerReservationRow) => void;
  canCancel?: boolean;
  canConfirm?: boolean;
  canComplete?: boolean;
  canRelease?: boolean;
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
                    {r.phone ? formatPhoneBR(r.phone) : r.email || "—"}
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
                <TableCell className="whitespace-nowrap">
                  {r.people_count} {r.people_count === 1 ? "pessoa" : "pessoas"}
                </TableCell>
                <TableCell>
                  <ReservationStatusBadge status={r.status} />
                </TableCell>
                <TableCell className="space-x-1 text-right">
                  {onView && (
                    <Button size="sm" variant="ghost" onClick={() => onView(r)}>
                      Ver
                    </Button>
                  )}
                  {canConfirm && r.status === "pending_payment" && onConfirmPayment && (
                    <Button size="sm" onClick={() => onConfirmPayment(r)}>
                      Confirmar pagamento
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
                  {canComplete && r.status === "confirmed" && onNoShow && (
                    <Button size="sm" variant="ghost" onClick={() => onNoShow(r)}>
                      No-show
                    </Button>
                  )}
                  {canRelease && r.status === "confirmed" && !r.released_at && onRelease && (
                    <Button size="sm" variant="outline" onClick={() => onRelease(r)}>
                      Liberar mesa
                    </Button>
                  )}
                  {canCancel &&
                    r.status !== "cancelled" &&
                    r.status !== "completed" &&
                    r.status !== "expired" &&
                    onCancel && (
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
