/**
 * ReservationKpiGrid — grid premium de KPIs do dashboard de reservas.
 *
 * Substitui visualmente o ReservationStats sem alterar regras de negócio.
 * Consome ReservationStatsResult já calculado.
 */
import {
  CalendarCheck,
  CheckCircle2,
  DollarSign,
  Hourglass,
  TableProperties,
  UserCheck,
  XCircle,
} from "lucide-react";
import { KpiCard } from "./ui";
import type {
  PartnerReservationRow,
  ReservationStatsResult,
  ReservationWaitlistEntry,
} from "@modules/partner/reservations";
import { isTodaySP } from "@/lib/dateUtils";

interface Props {
  stats: ReservationStatsResult;
  rows: PartnerReservationRow[];
  waitlist: ReservationWaitlistEntry[];
}

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

export function ReservationKpiGrid({ stats, rows, waitlist }: Props) {
  const todayRows = rows.filter((r) => {
    const d = new Date(r.reservation_date);
    return !Number.isNaN(d.getTime()) && isTodaySP(d);
  });

  const confirmedToday = todayRows.filter(
    (r) => r.status === "confirmed" || r.status === "completed",
  ).length;

  const checkIns = todayRows.filter((r) => !!r.checked_in_at).length;
  const noShow = todayRows.filter((r) => r.status === "no_show").length;
  const released = todayRows.filter((r) => !!r.released_at).length;
  const waitlistActive = waitlist.filter(
    (w) => w.status === "waiting" || w.status === "notified",
  ).length;
  const revenueToday = todayRows
    .filter((r) => r.status !== "cancelled" && r.status !== "expired")
    .reduce((acc, r) => acc + (Number(r.total_price) || 0), 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 min-w-0">
      <KpiCard
        label="Hoje"
        value={todayRows.length}
        hint="Reservas do dia"
        icon={CalendarCheck}
        tone="neutral"
        className="min-h-[92px]"
      />
      <KpiCard
        label="Confirmadas"
        value={confirmedToday}
        hint="Mesas garantidas"
        icon={CheckCircle2}
        tone="confirmed"
        className="min-h-[92px]"
      />
      <KpiCard
        label="Receita"
        value={formatBRL(revenueToday)}
        hint="Prevista hoje"
        icon={DollarSign}
        tone="revenue"
        className="min-h-[92px]"
      />
      <KpiCard
        label="Lista de espera"
        value={waitlistActive}
        hint="Aguardando vaga"
        icon={Hourglass}
        tone="waitlist"
        className="min-h-[92px]"
      />
      {/* Cards extras apenas em telas maiores (sm+) */}
      <div className="hidden sm:contents">
        <KpiCard
          label="Check-ins"
          value={checkIns}
          hint="Clientes na casa"
          icon={UserCheck}
          tone="success"
          className="min-h-[92px]"
        />
        <KpiCard
          label="No-show"
          value={noShow}
          hint={`${stats.noShowRate}% no período`}
          icon={XCircle}
          tone="danger"
          className="min-h-[92px]"
        />
        <KpiCard
          label="Mesas liberadas"
          value={released}
          hint="Disponíveis novamente"
          icon={TableProperties}
          tone="neutral"
          className="min-h-[92px]"
        />
      </div>
    </div>
  );
}

export default ReservationKpiGrid;
