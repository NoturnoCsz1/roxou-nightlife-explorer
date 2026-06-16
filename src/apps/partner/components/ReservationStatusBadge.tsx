import { Badge } from "@/components/ui/badge";
import type { PartnerReservationStatus } from "../services/partnerReservations";

const LABELS: Record<PartnerReservationStatus, string> = {
  pending: "Pendente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Concluída",
  no_show: "No-show",
};

const VARIANTS: Record<PartnerReservationStatus, string> = {
  pending: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  confirmed: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  cancelled: "bg-rose-500/15 text-rose-600 border-rose-500/30",
  completed: "bg-sky-500/15 text-sky-600 border-sky-500/30",
  no_show: "bg-zinc-500/15 text-zinc-500 border-zinc-500/30",
};

export function ReservationStatusBadge({
  status,
}: {
  status: PartnerReservationStatus;
}) {
  return (
    <Badge variant="outline" className={VARIANTS[status]}>
      {LABELS[status]}
    </Badge>
  );
}

export default ReservationStatusBadge;
