/**
 * PartnerDashboardPage — Fase 9D (MVP funcional).
 * Continua sem rota registrada no App.tsx.
 */
import { useEffect, useState } from "react";
import { usePartnerAuth } from "../hooks/usePartnerAuth";
import {
  PartnerAwardBadge,
  PartnerEmptyState,
  PartnerMetricsCards,
  PartnerProfileCard,
  PartnerQuickActions,
  PartnerRecentEvents,
  PartnerSubscriptionCard,
} from "../components";
import {
  getPartnerCurrentAward,
  getPartnerDetails,
  getPartnerEventCounts,
  getPartnerRecentEvents,
  type PartnerAward,
  type PartnerDetails,
  type PartnerEventCounts,
  type PartnerEventRow,
} from "../services/partnerDashboard";
import { getPartnerAnalytics } from "../services/partnerAnalytics";
import type { PartnerMetricsTotals } from "../services/partnerMetrics";

const EMPTY_TOTALS: PartnerMetricsTotals = {
  views: 0,
  clicks: 0,
  favorites: 0,
  reservations: 0,
  vipSignups: 0,
};

const PartnerDashboardPage = () => {
  const { selectedPartnerId, subscription, isLoading } = usePartnerAuth();
  const [details, setDetails] = useState<PartnerDetails | null>(null);
  const [award, setAward] = useState<PartnerAward | null>(null);
  const [events, setEvents] = useState<PartnerEventRow[]>([]);
  const [counts, setCounts] = useState<PartnerEventCounts>({
    published: 0,
    active: 0,
    total: 0,
  });
  const [totals, setTotals] = useState<PartnerMetricsTotals>(EMPTY_TOTALS);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (!selectedPartnerId) {
      setDetails(null);
      setAward(null);
      setEvents([]);
      setTotals(EMPTY_TOTALS);
      return;
    }
    let cancelled = false;
    setLoadingData(true);
    setMetricsLoading(true);
    setMetricsError(null);

    Promise.all([
      getPartnerDetails(selectedPartnerId),
      getPartnerCurrentAward(selectedPartnerId),
      getPartnerRecentEvents(selectedPartnerId, 5),
      getPartnerEventCounts(selectedPartnerId),
    ])
      .then(([d, a, e, c]) => {
        if (cancelled) return;
        setDetails(d);
        setAward(a);
        setEvents(e);
        setCounts(c);
      })
      .finally(() => {
        if (!cancelled) setLoadingData(false);
      });

    getPartnerAnalytics(selectedPartnerId, "7d")
      .then((res) => {
        if (cancelled) return;
        setTotals({
          views: res.kpis.views,
          clicks: res.kpis.clicks,
          favorites: res.kpis.favorites,
          reservations: res.kpis.reservations,
          vipSignups: res.kpis.vipSignups,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[PARTNER_DASHBOARD_METRICS]", err);
        setMetricsError("Não foi possível carregar métricas");
        setTotals(EMPTY_TOTALS);
      })
      .finally(() => {
        if (!cancelled) setMetricsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPartnerId]);

  if (isLoading) {
    return (
      <main className="min-h-screen p-6">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </main>
    );
  }

  if (!selectedPartnerId) {
    return (
      <main className="min-h-screen p-6 space-y-4">
        <h1 className="text-2xl font-bold">Dashboard do Parceiro</h1>
        <PartnerEmptyState />
      </main>
    );
  }

  return (
    <main className="w-full max-w-7xl mx-auto px-4 py-4 md:py-6 space-y-4 overflow-x-hidden min-h-screen">
      <header className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">Dashboard do Parceiro</h1>
        {loadingData ? (
          <span className="text-xs text-muted-foreground">atualizando…</span>
        ) : null}
      </header>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4 min-w-0">
          <PartnerProfileCard partner={details} />
          <PartnerMetricsCards
            totals={totals}
            label="Últimos 7 dias"
            loading={metricsLoading}
            error={metricsError}
          />
          <PartnerRecentEvents events={events} />
        </div>
        <aside className="space-y-4 min-w-0">
          <PartnerSubscriptionCard subscription={subscription} />
          <PartnerAwardBadge award={award} />
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-border p-3">
              <div className="text-lg font-semibold">{counts.total}</div>
              <div className="text-[10px] text-muted-foreground">Total</div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-lg font-semibold">{counts.published}</div>
              <div className="text-[10px] text-muted-foreground">Publicados</div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-lg font-semibold">{counts.active}</div>
              <div className="text-[10px] text-muted-foreground">Ativos</div>
            </div>
          </div>
          <PartnerQuickActions />
        </aside>
      </div>
    </main>
  );
};

export default PartnerDashboardPage;
