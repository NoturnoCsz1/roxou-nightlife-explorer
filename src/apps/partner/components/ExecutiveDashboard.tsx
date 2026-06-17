/**
 * ExecutiveDashboard — Visão executiva (Hoje / Semana / Mês).
 *
 * Apenas UI. Consome `rows` (PartnerReservationRow[]) já carregados.
 * Sem novas queries. Cálculos em useMemo.
 */
import { useMemo } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarHeart,
  DollarSign,
  Flame,
  Hourglass,
  Star,
  TrendingUp,
  Trophy,
  XCircle,
} from "lucide-react";
import { GlassCard, SectionHeader } from "./ui";
import { getDateKeySP, isTodaySP } from "@/lib/dateUtils";
import type {
  PartnerReservationRow,
  ReservationStatsResult,
  ReservationWaitlistEntry,
} from "../services/partnerReservations";

interface Props {
  rows: PartnerReservationRow[];
  waitlist: ReservationWaitlistEntry[];
  stats: ReservationStatsResult;
}

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

const REV = (r: PartnerReservationRow) =>
  r.status === "cancelled" || r.status === "expired" || r.status === "no_show"
    ? 0
    : Number(r.total_price) || 0;

const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function ExecutiveDashboard({ rows, waitlist, stats }: Props) {
  const data = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // --- HOJE ---
    const today = rows.filter((r) => {
      const d = new Date(r.reservation_date);
      return !Number.isNaN(d.getTime()) && isTodaySP(d);
    });
    const revenueToday = today.reduce((a, r) => a + REV(r), 0);
    const confirmedToday = today.filter(
      (r) => r.status === "confirmed" || r.status === "completed",
    ).length;
    const queue = waitlist.filter(
      (w) => w.status === "waiting" || w.status === "notified",
    ).length;

    // --- SEMANA (últimos 7 dias) vs SEMANA ANTERIOR ---
    const within = (r: PartnerReservationRow, daysAgo: number, span = 7) => {
      const t = new Date(r.reservation_date).getTime();
      const end = now - daysAgo * dayMs;
      const start = end - span * dayMs;
      return t >= start && t < end;
    };
    const last7 = rows.filter((r) => within(r, 0));
    const prev7 = rows.filter((r) => within(r, 7));
    const revenue7 = last7.reduce((a, r) => a + REV(r), 0);
    const revenuePrev7 = prev7.reduce((a, r) => a + REV(r), 0);
    const growth =
      revenuePrev7 > 0
        ? Math.round(((revenue7 - revenuePrev7) / revenuePrev7) * 100)
        : revenue7 > 0
          ? 100
          : 0;

    // pico horário (semana)
    const hourCount = new Map<number, number>();
    for (const r of last7) {
      if (r.status === "cancelled" || r.status === "expired") continue;
      const h = new Date(r.reservation_date).getHours();
      hourCount.set(h, (hourCount.get(h) ?? 0) + 1);
    }
    let peakHour = -1;
    let peakHourCount = 0;
    hourCount.forEach((v, h) => {
      if (v > peakHourCount) {
        peakHourCount = v;
        peakHour = h;
      }
    });

    // --- MÊS (últimos 30 dias) ---
    const last30 = rows.filter((r) => within(r, 0, 30));

    // melhor dia (data com maior receita)
    const dayRev = new Map<string, number>();
    for (const r of last30) {
      const d = new Date(r.reservation_date);
      if (Number.isNaN(d.getTime())) continue;
      const key = getDateKeySP(d);
      dayRev.set(key, (dayRev.get(key) ?? 0) + REV(r));
    }
    let bestDayKey: string | null = null;
    let bestDayRev = 0;
    dayRev.forEach((v, k) => {
      if (v > bestDayRev) {
        bestDayRev = v;
        bestDayKey = k;
      }
    });
    const bestDayLabel = bestDayKey
      ? (() => {
          const [y, m, d] = bestDayKey.split("-").map(Number);
          const anchor = new Date(`${bestDayKey}T12:00:00-03:00`);
          const wd = WD[anchor.getDay()];
          return `${wd} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
        })()
      : "—";

    // taxa de confirmação no mês (confirmed+completed) / (todas exceto pending puras pendentes ainda no futuro? — usar total)
    const confirmableMonth = last30.filter(
      (r) => r.status !== "expired",
    ).length;
    const confirmedMonth = last30.filter(
      (r) => r.status === "confirmed" || r.status === "completed",
    ).length;
    const confirmRate = confirmableMonth
      ? Math.round((confirmedMonth / confirmableMonth) * 100)
      : 0;

    return {
      revenueToday,
      confirmedToday,
      queue,
      occupancy: stats.capacityUsed,
      revenue7,
      growth,
      peakHour,
      bestDayLabel,
      bestDayRev,
      confirmRate,
      noShowRate: stats.noShowRate,
    };
  }, [rows, waitlist, stats]);

  return (
    <GlassCard padding="md" className="min-w-0 partner-fade-in">
      <SectionHeader
        title="Visão executiva"
        description="O essencial de hoje, semana e mês"
      />
      <div className="mt-3 space-y-4 min-w-0">
        <Block title="Hoje" tone="violet">
          <Insight
            icon={<DollarSign className="h-4 w-4" />}
            label="Receita prevista"
            value={BRL(data.revenueToday)}
          />
          <Insight
            icon={<CalendarHeart className="h-4 w-4" />}
            label="Confirmadas"
            value={String(data.confirmedToday)}
          />
          <Insight
            icon={<Hourglass className="h-4 w-4" />}
            label="Fila de espera"
            value={String(data.queue)}
          />
          <Insight
            icon={<TrendingUp className="h-4 w-4" />}
            label="Ocupação"
            value={`${data.occupancy}%`}
          />
        </Block>

        <Block title="Semana" tone="pink">
          <Insight
            icon={<DollarSign className="h-4 w-4" />}
            label="Receita 7d"
            value={BRL(data.revenue7)}
          />
          <Insight
            icon={
              data.growth >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-emerald-300" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-rose-300" />
              )
            }
            label="Crescimento vs anterior"
            value={`${data.growth > 0 ? "+" : ""}${data.growth}%`}
            tone={data.growth >= 0 ? "good" : "bad"}
          />
          <Insight
            icon={<Flame className="h-4 w-4" />}
            label="Horário mais movimentado"
            value={
              data.peakHour >= 0
                ? `${String(data.peakHour).padStart(2, "0")}:00`
                : "—"
            }
          />
        </Block>

        <Block title="Mês" tone="violet">
          <Insight
            icon={<Trophy className="h-4 w-4" />}
            label="Melhor dia"
            value={data.bestDayLabel}
            hint={data.bestDayRev > 0 ? BRL(data.bestDayRev) : undefined}
          />
          <Insight
            icon={<Star className="h-4 w-4" />}
            label="Taxa de confirmação"
            value={`${data.confirmRate}%`}
            tone={data.confirmRate >= 70 ? "good" : "neutral"}
          />
          <Insight
            icon={<XCircle className="h-4 w-4" />}
            label="No-show"
            value={`${data.noShowRate}%`}
            tone={data.noShowRate >= 15 ? "bad" : "neutral"}
          />
        </Block>
      </div>
    </GlassCard>
  );
}

function Block({
  title,
  tone,
  children,
}: {
  title: string;
  tone?: "violet" | "pink";
  children: React.ReactNode;
}) {
  const dot =
    tone === "pink"
      ? "bg-pink-400/80 shadow-[0_0_0_3px_rgba(236,72,153,0.18)]"
      : "bg-violet-400/80 shadow-[0_0_0_3px_rgba(168,85,247,0.18)]";
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 mb-2">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <h4 className="text-xs uppercase tracking-wider text-foreground/65 font-semibold">
          {title}
        </h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
        {children}
      </div>
    </div>
  );
}

function Insight({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "bad" | "neutral";
}) {
  const tint =
    tone === "good"
      ? "text-emerald-300"
      : tone === "bad"
        ? "text-rose-300"
        : "text-foreground";
  return (
    <div className="min-w-0 rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-2 flex items-center gap-3">
      <span className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.05] text-violet-200">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-foreground/55 truncate">
          {label}
        </div>
        <div className={`text-sm font-semibold truncate tabular-nums ${tint}`}>
          {value}
          {hint && (
            <span className="ml-1 text-[10px] text-foreground/50 font-normal">
              · {hint}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExecutiveDashboard;
