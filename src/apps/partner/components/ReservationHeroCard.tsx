/**
 * ReservationHeroCard — visão operacional premium do dia.
 *
 * Apenas UI: consome reservas, waitlist, tipos e stats já carregados.
 * Sem queries, sem regras de negócio.
 */
import { useMemo } from "react";
import { Calendar, Clock, TrendingUp, Users, AlertCircle, DollarSign, Sparkles } from "lucide-react";
import { GlassCard, StatusDot } from "./ui";
import {
  formatDateFull,
  getDateKeySP,
  isTodaySP,
} from "@/lib/dateUtils";
import type {
  PartnerReservationRow,
  PartnerReservationType,
  ReservationStatsResult,
  ReservationWaitlistEntry,
} from "../services/partnerReservations";

interface Props {
  partnerName?: string | null;
  rows: PartnerReservationRow[];
  waitlist: ReservationWaitlistEntry[];
  types: PartnerReservationType[];
  stats: ReservationStatsResult;
}

const fmtHM = (d: Date) =>
  d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

export function ReservationHeroCard({
  partnerName,
  rows,
  waitlist,
  types,
  stats,
}: Props) {
  const todayKey = getDateKeySP(new Date());
  const now = Date.now();

  const todayRows = useMemo(
    () =>
      rows.filter((r) => {
        const d = new Date(r.reservation_date);
        return !Number.isNaN(d.getTime()) && isTodaySP(d);
      }),
    [rows],
  );

  const confirmedToday = todayRows.filter(
    (r) => r.status === "confirmed" || r.status === "completed",
  ).length;
  const pendingToday = todayRows.filter(
    (r) => r.status === "pending" || r.status === "pending_payment",
  ).length;
  const waitlistToday = waitlist.filter(
    (w) => w.status === "waiting" || w.status === "notified",
  ).length;
  void todayKey;

  const expectedRevenue = todayRows
    .filter((r) => r.status !== "cancelled" && r.status !== "expired" && r.status !== "no_show")
    .reduce((acc, r) => acc + (Number(r.total_price) || 0), 0);

  const nextReservation = useMemo(() => {
    const upcoming = todayRows
      .filter(
        (r) =>
          (r.status === "confirmed" || r.status === "pending" || r.status === "pending_payment") &&
          new Date(r.reservation_date).getTime() >= now,
      )
      .sort(
        (a, b) =>
          new Date(a.reservation_date).getTime() -
          new Date(b.reservation_date).getTime(),
      );
    return upcoming[0] ?? null;
  }, [todayRows, now]);

  const totalCapacity = stats.totalCapacity;
  const occupied = stats.reservedSeats + stats.pendingSeats;
  const freeSeats = Math.max(totalCapacity - occupied, 0);

  // Próxima mesa livre — estimativa simples: próximo término de reserva ativa
  const nextFreeAt = useMemo(() => {
    const active = todayRows
      .filter((r) => r.status === "confirmed" && r.checked_in_at && !r.released_at)
      .map((r) => {
        const startMs = new Date(r.checked_in_at as string).getTime();
        const dur = (r.duration_minutes ?? 90) * 60_000;
        return startMs + dur;
      })
      .filter((t) => t > now)
      .sort((a, b) => a - b);
    return active[0] ?? null;
  }, [todayRows, now]);

  const occupancyPct = stats.capacityUsed;

  return (
    <GlassCard
      variant="gradient"
      padding="lg"
      className="relative overflow-hidden min-h-[220px] md:min-h-[260px]"
    >
      {/* halo gradiente */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-50"
        style={{ background: "var(--partner-gradient)" }}
      />

      <div className="relative flex flex-col gap-5">
        {/* topo */}
        <div className="flex items-start justify-between gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-foreground/60">
              <Sparkles className="h-3.5 w-3.5" /> Hoje
            </div>
            <h2 className="mt-1 text-xl md:text-2xl font-semibold leading-tight truncate">
              {partnerName ?? "Operação do dia"}
            </h2>
            <p className="text-xs md:text-sm text-foreground/60 capitalize truncate">
              {formatDateFull(new Date())}
            </p>
          </div>
          <div className="shrink-0 hidden sm:flex flex-col items-end">
            <div className="text-[11px] uppercase tracking-wider text-foreground/60">
              Ocupação
            </div>
            <div className="partner-gradient-text text-3xl md:text-4xl font-bold leading-none">
              {occupancyPct}%
            </div>
          </div>
        </div>

        {/* KPIs principais */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <HeroStat
            icon={<StatusDot kind="confirmed" />}
            label="Confirmadas"
            value={confirmedToday}
          />
          <HeroStat
            icon={<StatusDot kind="pending" />}
            label="Pendentes"
            value={pendingToday}
          />
          <HeroStat
            icon={<StatusDot kind="waitlist" />}
            label="Lista de espera"
            value={waitlistToday}
          />
          <HeroStat
            icon={<DollarSign className="h-3.5 w-3.5 text-violet-300" />}
            label="Receita prevista"
            value={formatBRL(expectedRevenue)}
          />
        </div>

        {/* Mini cards operacionais */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <MiniCard
            icon={<Calendar className="h-3.5 w-3.5" />}
            label="Próxima reserva"
            value={
              nextReservation
                ? fmtHM(new Date(nextReservation.reservation_date))
                : "—"
            }
            hint={nextReservation?.name ?? "Sem agenda"}
          />
          <MiniCard
            icon={<Clock className="h-3.5 w-3.5" />}
            label="Próxima mesa livre"
            value={nextFreeAt ? fmtHM(new Date(nextFreeAt)) : "—"}
            hint={nextFreeAt ? "Estimado" : "Disponível agora"}
          />
          <MiniCard
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label="Ocupação"
            value={`${occupancyPct}%`}
            hint={`${occupied}/${totalCapacity} lugares`}
            highlight={occupancyPct >= 80}
          />
          <MiniCard
            icon={<Users className="h-3.5 w-3.5" />}
            label="Mesas livres"
            value={String(freeSeats)}
            hint={types.length ? `${types.length} tipos` : "Sem tipos"}
          />
        </div>

        {occupancyPct >= 90 && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            Alta ocupação. Considere abrir lista de espera automática.
          </div>
        )}
      </div>
    </GlassCard>
  );
}

function HeroStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-white/[0.03] border border-white/5 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-foreground/60 truncate">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-lg sm:text-xl font-semibold leading-tight truncate">
        {value}
      </div>
    </div>
  );
}

function MiniCard({
  icon,
  label,
  value,
  hint,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-xl px-3 py-2 border ${
        highlight
          ? "bg-amber-500/10 border-amber-500/30"
          : "bg-white/[0.04] border-white/10"
      }`}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-foreground/60 truncate">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-0.5 text-sm sm:text-base font-semibold truncate">
        {value}
      </div>
      {hint && (
        <div className="text-[10px] text-foreground/50 truncate">{hint}</div>
      )}
    </div>
  );
}

export default ReservationHeroCard;
