/**
 * PartnerHomePage — Início Partner Pro (mobile-first).
 *
 * Hero de ocupação com anel + status, KPIs do dia, central de alertas e
 * Bottom Sheet de ações rápidas. Reaproveita services existentes e não
 * altera regras de negócio, RLS, edge functions ou banco.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Hourglass,
  LineChart,
  Settings,
  CheckCircle2,
  AlertTriangle,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { usePartnerAuth } from "../hooks/usePartnerAuth";
import {
  computeReservationStats,
  listReservations,
  listReservationTypes,
  listReservationWaitlist,
  type PartnerReservationRow,
  type PartnerReservationType,
  type ReservationWaitlistEntry,
} from "../services/partnerReservations";
import { PartnerScreen } from "../components/PartnerScreen";
import { OccupancyRing } from "../components/OccupancyRing";
import { PartnerActionsSheet } from "../components/PartnerActionsSheet";
import { PartnerNotificationsCenter } from "../components/PartnerNotificationsCenter";
import { PartnerEmptyState } from "../components/PartnerEmptyState";
import { OccupancySkeleton, PartnerCardSkeleton } from "../components/PartnerSkeletons";
import { trackPartnerClient } from "../lib/partnerInteractions";

const SHORTCUTS: Array<{ to: string; icon: typeof Calendar; label: string }> = [
  { to: "/reservas", icon: Calendar, label: "Reservas" },
  { to: "/fila", icon: Hourglass, label: "Fila" },
  { to: "/relatorios", icon: LineChart, label: "Relatórios" },
  { to: "/configuracoes", icon: Settings, label: "Config." },
];

function Kpi({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "default" | "warning" | "success" | "danger";
}) {
  const toneCls =
    tone === "warning"
      ? "text-amber-300"
      : tone === "danger"
        ? "text-rose-300"
        : tone === "success"
          ? "text-emerald-300"
          : "text-foreground";
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3 min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${toneCls}`}>
        {value}
      </div>
      {hint ? (
        <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

const PartnerHomePage = () => {
  const { selectedPartner, selectedPartnerId, isLoading } = usePartnerAuth();
  const [rows, setRows] = useState<PartnerReservationRow[]>([]);
  const [types, setTypes] = useState<PartnerReservationType[]>([]);
  const [waitlist, setWaitlist] = useState<ReservationWaitlistEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedPartnerId) {
      setRows([]);
      setTypes([]);
      setWaitlist([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listReservations(selectedPartnerId, { limit: 200 }),
      listReservationTypes(selectedPartnerId),
      listReservationWaitlist(selectedPartnerId),
    ])
      .then(([r, t, w]) => {
        if (cancelled) return;
        setRows(r);
        setTypes(t);
        setWaitlist(w);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPartnerId]);

  const totalCapacity = useMemo(
    () =>
      types.reduce(
        (acc, t) => acc + (t.quantity ?? 0) * (t.seats ?? 0),
        0,
      ),
    [types],
  );

  const stats = useMemo(
    () => computeReservationStats(rows, totalCapacity),
    [rows, totalCapacity],
  );

  const kpis = useMemo(() => {
    const today = new Date();
    const startToday = new Date(today);
    startToday.setHours(0, 0, 0, 0);
    const dayStart = startToday.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const yStart = dayStart - 24 * 60 * 60 * 1000;
    const weekStart = dayStart - 7 * 24 * 60 * 60 * 1000;

    let checkins = 0;
    let pending = 0;
    let noShow = 0;
    let revenueToday = 0;
    let reservasToday = 0;
    let reservasYesterday = 0;
    let reservasWeek = 0;

    for (const r of rows) {
      const d = new Date(r.reservation_date).getTime();
      const created = new Date(r.created_at).getTime();
      const isToday = d >= dayStart && d < dayEnd;
      const isY = d >= yStart && d < dayStart;
      if (isToday) {
        reservasToday += 1;
        if (r.status === "completed") checkins += 1;
        if (r.status === "pending" || r.status === "pending_payment") pending += 1;
        if (r.status === "no_show") noShow += 1;
        if (
          (r.status === "confirmed" || r.status === "completed") &&
          typeof r.total_price === "number"
        ) {
          revenueToday += Number(r.total_price) || 0;
        }
      }
      if (isY) reservasYesterday += 1;
      if (created >= weekStart) reservasWeek += 1;
    }

    const fila = waitlist.filter((w) => w.status === "waiting").length;
    const avg7 = reservasWeek / 7;
    const diffY = reservasYesterday > 0
      ? Math.round(((reservasToday - reservasYesterday) / reservasYesterday) * 100)
      : reservasToday > 0
        ? 100
        : 0;
    const diff7 = avg7 > 0
      ? Math.round(((reservasToday - avg7) / avg7) * 100)
      : reservasToday > 0
        ? 100
        : 0;

    return {
      reservasHoje: reservasToday,
      checkins,
      pending,
      noShow,
      fila,
      revenueToday,
      diffYesterday: diffY,
      diff7Days: diff7,
    };
  }, [rows, waitlist]);

  useEffect(() => {
    if (!loading && selectedPartnerId) {
      trackPartnerClient("partner_home_summary_view", {
        reservasHoje: kpis.reservasHoje,
        fila: kpis.fila,
      });
    }
  }, [loading, selectedPartnerId, kpis.reservasHoje, kpis.fila]);

  if (isLoading) {
    return (
      <PartnerScreen title="Início">
        <OccupancySkeleton />
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <PartnerCardSkeleton key={i} />
          ))}
        </div>
      </PartnerScreen>
    );
  }

  if (!selectedPartnerId) {
    return (
      <PartnerScreen title="Início">
        <PartnerEmptyState />
      </PartnerScreen>
    );
  }

  return (
    <>
      <PartnerScreen
        title={selectedPartner?.name ?? "Início"}
        subtitle={loading ? "Atualizando…" : "Visão operacional de hoje"}
      >
        {/* Hero de ocupação */}
        <Card className="border-white/8 bg-gradient-to-br from-white/[0.04] to-white/[0.01] overflow-hidden">
          <CardContent className="p-4 flex items-center gap-4">
            <OccupancyRing
              value={stats.capacityUsed}
              reservedSeats={stats.reservedSeats}
              totalCapacity={stats.totalCapacity}
            />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Ocupação agora
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground/90">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="tabular-nums">
                  {stats.reservedSeats} lugares confirmados
                </span>
              </div>
              {stats.pendingSeats > 0 ? (
                <div className="flex items-center gap-2 text-sm text-amber-300/90">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span className="tabular-nums">
                    {stats.pendingSeats} aguardando pagamento
                  </span>
                </div>
              ) : null}
              <div className="flex items-center gap-2 text-sm text-emerald-300/90">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>
                  {stats.confirmedRate}% taxa de confirmação
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs do dia */}
        <div className="grid grid-cols-2 gap-2.5">
          <Kpi
            label="Reservas hoje"
            value={kpis.reservasHoje}
            hint="criadas no dia"
          />
          <Kpi
            label="Check-ins"
            value={kpis.checkins}
            tone="success"
            hint="presenças do dia"
          />
          <Kpi
            label="Pendentes"
            value={kpis.pending}
            tone={kpis.pending > 0 ? "warning" : "default"}
            hint="aguardando hoje"
          />
          <Kpi
            label="Fila"
            value={kpis.fila}
            tone={kpis.fila > 0 ? "warning" : "default"}
            hint="na lista de espera"
          />
        </div>

        {/* Atalhos */}
        <div className="grid grid-cols-4 gap-2">
          {SHORTCUTS.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="flex flex-col items-center gap-1 rounded-xl border border-white/8 bg-white/[0.03] px-2 py-3 text-[11px] font-medium text-foreground/80 hover:bg-white/[0.06] transition"
            >
              <s.icon className="h-4.5 w-4.5 text-foreground/70" />
              <span>{s.label}</span>
            </Link>
          ))}
        </div>

        {/* Central de alertas */}
        <PartnerNotificationsCenter rows={rows} waitlist={waitlist} />

        <div className="flex justify-end">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/relatorios">Ver relatórios completos →</Link>
          </Button>
        </div>
      </PartnerScreen>

      <PartnerActionsSheet
        partnerSlug={selectedPartner?.slug ?? null}
        partnerName={selectedPartner?.name ?? null}
      />
    </>
  );
};

export default PartnerHomePage;
