/**
 * PartnerRelatoriosPage — Relatórios Partner Pro.
 * Tabs: Hoje · Semana · Mês · IA. Reaproveita componentes existentes.
 */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LineChart } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AnalyticsSkeleton } from "../components/PartnerSkeletons";
import { trackPartnerClient } from "../lib/partnerInteractions";

import { usePartnerAuth } from "../hooks/usePartnerAuth";
import { PartnerScreen } from "../components/PartnerScreen";
import { PartnerEmptyState } from "../components/PartnerEmptyState";
import { DailyOperationsReport } from "../components/DailyOperationsReport";
import { WeeklyHeatmap } from "../components/WeeklyHeatmap";
import { GrowthSummaryCard } from "../components/GrowthSummaryCard";
import { ExecutiveAnalyticsHero } from "../components/ExecutiveAnalyticsHero";
import { OccupancyInsightsPremium } from "../components/OccupancyInsightsPremium";
import { ReservationKpiGrid } from "../components/ReservationKpiGrid";
import {
  computeReservationStats,
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

type Tab2 = Tab;
const TAB_PARAM: Record<Tab2, string> = {
  today: "hoje",
  week: "semana",
  month: "mes",
  ai: "ia",
};
const PARAM_TAB: Record<string, Tab2> = {
  hoje: "today",
  semana: "week",
  mes: "month",
  ia: "ai",
};

const PartnerRelatoriosPage = () => {
  const { selectedPartnerId, isLoading, canEditProfile } = usePartnerAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = PARAM_TAB[searchParams.get("tab") ?? ""] ?? "today";
  const [tab, setTab] = useState<Tab>(initialTab);
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

  useEffect(() => {
    const fromUrl = PARAM_TAB[searchParams.get("tab") ?? ""];
    if (fromUrl && fromUrl !== tab) setTab(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleTabChange = (v: string) => {
    const next = v as Tab;
    setTab(next);
    const sp = new URLSearchParams(searchParams);
    sp.set("tab", TAB_PARAM[next]);
    setSearchParams(sp, { replace: true });
    trackPartnerClient("partner_deeplink_open", { page: "relatorios", tab: TAB_PARAM[next] });
  };

  if (isLoading || (loading && !weekly)) {
    return (
      <PartnerScreen title="Relatórios">
        <AnalyticsSkeleton />
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
      <Tabs value={tab} onValueChange={handleTabChange} className="animate-in fade-in duration-200">
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
