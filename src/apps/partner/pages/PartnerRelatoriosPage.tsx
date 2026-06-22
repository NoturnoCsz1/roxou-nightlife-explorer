/**
 * PartnerRelatoriosPage — Relatórios Partner Pro.
 * Tabs: Hoje · Semana · Mês · IA. Reaproveita componentes existentes.
 */
import { useEffect, useMemo, useState } from "react";
import { LineChart } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { usePartnerAuth } from "../hooks/usePartnerAuth";
import { PartnerScreen } from "../components/PartnerScreen";
import { PartnerEmptyState } from "../components/PartnerEmptyState";
import { DailyOperationsReport } from "../components/DailyOperationsReport";
import { WeeklyHeatmap } from "../components/WeeklyHeatmap";
import { GrowthSummaryCard } from "../components/GrowthSummaryCard";
import { ExecutiveAnalyticsHero } from "../components/ExecutiveAnalyticsHero";
import { OccupancyInsightsPremium } from "../components/OccupancyInsightsPremium";
import {
  listReservations,
  listReservationTypes,
  listReservationWaitlist,
  type PartnerReservationRow,
  type PartnerReservationType,
  type ReservationWaitlistEntry,
} from "../services/partnerReservations";
import {
  getPartnerAnalytics,
  type PartnerAnalytics,
} from "../services/partnerAnalytics";

type Tab = "today" | "week" | "month" | "ai";

const PartnerRelatoriosPage = () => {
  const { selectedPartnerId, isLoading, canEditProfile } = usePartnerAuth();
  const [tab, setTab] = useState<Tab>("today");
  const [rows, setRows] = useState<PartnerReservationRow[]>([]);
  const [types, setTypes] = useState<PartnerReservationType[]>([]);
  const [waitlist, setWaitlist] = useState<ReservationWaitlistEntry[]>([]);
  const [weekly, setWeekly] = useState<PartnerAnalytics | null>(null);
  const [monthly, setMonthly] = useState<PartnerAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedPartnerId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listReservations(selectedPartnerId, { limit: 300 }),
      listReservationTypes(selectedPartnerId),
      listReservationWaitlist(selectedPartnerId),
      getPartnerAnalytics(selectedPartnerId, "7d"),
      getPartnerAnalytics(selectedPartnerId, "30d"),
    ])
      .then(([r, t, w, a7, a30]) => {
        if (cancelled) return;
        setRows(r);
        setTypes(t);
        setWaitlist(w);
        setWeekly(a7);
        setMonthly(a30);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPartnerId]);

  if (isLoading) {
    return (
      <PartnerScreen title="Relatórios">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </PartnerScreen>
    );
  }

  if (!selectedPartnerId) {
    return (
      <PartnerScreen title="Relatórios">
        <PartnerEmptyState />
      </PartnerScreen>
    );
  }

  return (
    <PartnerScreen
      title="Relatórios"
      subtitle={loading ? "Atualizando…" : "Operação e crescimento"}
      right={<LineChart className="h-5 w-5 text-muted-foreground" />}
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="grid w-full grid-cols-4 bg-white/5 border border-white/8">
          <TabsTrigger value="today" className="text-xs">Hoje</TabsTrigger>
          <TabsTrigger value="week" className="text-xs">Semana</TabsTrigger>
          <TabsTrigger value="month" className="text-xs">Mês</TabsTrigger>
          <TabsTrigger value="ai" className="text-xs">IA</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-3">
          <DailyOperationsReport
            reservations={rows}
            waitlist={waitlist}
            types={types}
          />
        </TabsContent>

        <TabsContent value="week" className="mt-3 space-y-3">
          <WeeklyHeatmap rows={rows} />
          {weekly ? <GrowthSummaryCard data={weekly} /> : null}
        </TabsContent>

        <TabsContent value="month" className="mt-3 space-y-3">
          {monthly ? (
            <ExecutiveAnalyticsHero data={monthly} periodLabel="Últimos 30 dias" />
          ) : (
            <p className="text-sm text-muted-foreground">
              Carregando dados do mês…
            </p>
          )}
          {monthly ? <GrowthSummaryCard data={monthly} /> : null}
        </TabsContent>

        <TabsContent value="ai" className="mt-3">
          <OccupancyInsightsPremium
            partnerId={selectedPartnerId}
            canEdit={canEditProfile}
          />
        </TabsContent>
      </Tabs>
    </PartnerScreen>
  );
};

export default PartnerRelatoriosPage;
