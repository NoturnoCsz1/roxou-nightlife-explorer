/**
 * ReservationPendingCard — resumo de pendências operacionais do dia (mobile).
 *
 * Sem novas queries: derive de rows + waitlist já carregados.
 */
import { useMemo } from "react";
import { CheckCircle2, Clock, Hourglass } from "lucide-react";
import { GlassCard, SectionHeader } from "./ui";
import { isTodaySP } from "@/lib/dateUtils";
import type {
  PartnerReservationRow,
  ReservationWaitlistEntry,
} from "@modules/partner/reservations";

interface Props {
  reservations: PartnerReservationRow[];
  waitlist: ReservationWaitlistEntry[];
}

export function ReservationPendingCard({ reservations, waitlist }: Props) {
  const data = useMemo(() => {
    const today = reservations.filter((r) => {
      const d = new Date(r.reservation_date);
      return !Number.isNaN(d.getTime()) && isTodaySP(d);
    });
    const pendingPayment = today.filter(
      (r) => r.status === "pending_payment" || r.status === "pending",
    ).length;
    const queue = waitlist.filter(
      (w) => w.status === "waiting" || w.status === "notified",
    ).length;
    const released = today.filter((r) => !!r.released_at).length;
    return { pendingPayment, queue, released };
  }, [reservations, waitlist]);

  const allZero =
    data.pendingPayment === 0 && data.queue === 0 && data.released === 0;

  return (
    <GlassCard padding="md" className="min-w-0">
      <SectionHeader title="Pendências" description="O que precisa de atenção" />
      {allZero ? (
        <p className="mt-2 text-sm text-foreground/55">
          Operação tranquila hoje.
        </p>
      ) : (
        <ul className="mt-3 space-y-2 min-w-0">
          <Row
            icon={<Clock className="h-4 w-4 text-amber-300" />}
            text={`${data.pendingPayment} aguardando pagamento`}
            dim={data.pendingPayment === 0}
          />
          <Row
            icon={<Hourglass className="h-4 w-4 text-violet-300" />}
            text={`${data.queue} ${data.queue === 1 ? "pessoa" : "pessoas"} na fila`}
            dim={data.queue === 0}
          />
          <Row
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-300" />}
            text={`${data.released} ${data.released === 1 ? "mesa liberada" : "mesas liberadas"}`}
            dim={data.released === 0}
          />
        </ul>
      )}
    </GlassCard>
  );
}

function Row({
  icon,
  text,
  dim,
}: {
  icon: React.ReactNode;
  text: string;
  dim?: boolean;
}) {
  return (
    <li
      className={`flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-sm min-w-0 ${
        dim ? "opacity-50" : ""
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{text}</span>
    </li>
  );
}

export default ReservationPendingCard;
