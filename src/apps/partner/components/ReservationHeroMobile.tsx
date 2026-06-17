/**
 * ReservationHeroMobile — Hero simplificado para mobile.
 *
 * Reaproveita os dados já calculados (sem novas queries).
 * Mostra: ocupação central + 3 KPIs (Confirmadas, Receita prevista, Fila de espera).
 */
import { useMemo } from "react";
import { CheckCircle2, DollarSign, Hourglass, Sparkles } from "lucide-react";
import { GlassCard } from "./ui";
import { formatDateHeader, isTodaySP } from "@/lib/dateUtils";
import type {
  PartnerReservationRow,
  ReservationStatsResult,
  ReservationWaitlistEntry,
} from "../services/partnerReservations";

interface Props {
  partnerName?: string | null;
  rows: PartnerReservationRow[];
  waitlist: ReservationWaitlistEntry[];
  stats: ReservationStatsResult;
}

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

export function ReservationHeroMobile({
  partnerName,
  rows,
  waitlist,
  stats,
}: Props) {
  const todayRows = useMemo(
    () =>
      rows.filter((r) => {
        const d = new Date(r.reservation_date);
        return !Number.isNaN(d.getTime()) && isTodaySP(d);
      }),
    [rows],
  );

  const confirmedToday = useMemo(
    () =>
      todayRows.filter(
        (r) => r.status === "confirmed" || r.status === "completed",
      ).length,
    [todayRows],
  );

  const expectedRevenue = useMemo(
    () =>
      todayRows
        .filter(
          (r) =>
            r.status !== "cancelled" &&
            r.status !== "expired" &&
            r.status !== "no_show",
        )
        .reduce((acc, r) => acc + (Number(r.total_price) || 0), 0),
    [todayRows],
  );

  const waitlistActive = useMemo(
    () =>
      waitlist.filter(
        (w) => w.status === "waiting" || w.status === "notified",
      ).length,
    [waitlist],
  );

  const occupancyPct = stats.capacityUsed;

  return (
    <GlassCard
      variant="gradient"
      padding="lg"
      className="relative overflow-hidden min-w-0"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full blur-3xl opacity-50"
        style={{ background: "var(--partner-gradient)" }}
      />
      <div className="relative flex flex-col gap-4 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-foreground/60">
            <Sparkles className="h-3 w-3" /> Hoje
          </div>
          <h2 className="mt-0.5 text-lg font-semibold leading-tight truncate">
            {partnerName ?? "Operação do dia"}
          </h2>
          <p className="text-[11px] text-foreground/55 capitalize truncate">
            {formatDateHeader(new Date())}
          </p>
        </div>

        {/* Destaque central */}
        <div className="flex flex-col items-center justify-center py-2">
          <div className="partner-gradient-text text-5xl font-bold leading-none tabular-nums">
            {occupancyPct}%
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-wider text-foreground/60">
            Ocupação atual
          </div>
        </div>

        {/* 3 KPIs */}
        <div className="grid grid-cols-3 gap-2 min-w-0">
          <MiniStat
            icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />}
            value={confirmedToday}
            label="Confirmadas"
          />
          <MiniStat
            icon={<DollarSign className="h-3.5 w-3.5 text-amber-300" />}
            value={formatBRL(expectedRevenue)}
            label="Receita prevista"
          />
          <MiniStat
            icon={<Hourglass className="h-3.5 w-3.5 text-violet-300" />}
            value={waitlistActive}
            label="Fila de espera"
          />
        </div>
      </div>
    </GlassCard>
  );
}

function MiniStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/5 bg-white/[0.04] px-2.5 py-2">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-foreground/55 truncate">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-0.5 text-base font-semibold truncate tabular-nums">
        {value}
      </div>
    </div>
  );
}

export default ReservationHeroMobile;
