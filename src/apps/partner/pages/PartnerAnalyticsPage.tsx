/**
 * PartnerAnalyticsPage — shell mobile-first.
 * Sub-blocos pesados (Top Promoters, Accordions) são lazy-loaded
 * para reduzir o bundle inicial do portal parceiro.
 */
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePartnerAuth } from "../hooks/usePartnerAuth";
import { PartnerEmptyState, ExecutiveAnalyticsHero, GrowthSummaryCard } from "../components";
import { AnalyticsOpsTiles } from "../analytics/AnalyticsOpsTiles";
import {
  getPartnerAnalytics,
  type AnalyticsPeriod,
  type PartnerAnalytics,
} from "../services/partnerAnalytics";

const AnalyticsTopPromoters = lazy(() => import("../analytics/AnalyticsTopPromoters"));
const AnalyticsAccordions = lazy(() => import("../analytics/AnalyticsAccordions"));

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "all", label: "Tudo" },
];

const PartnerAnalyticsPage = () => {
  const { selectedPartnerId, canViewAnalytics, isLoading } = usePartnerAuth();
  const [period, setPeriod] = useState<AnalyticsPeriod>("7d");
  const [data, setData] = useState<PartnerAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedPartnerId) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPartnerAnalytics(selectedPartnerId, period)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e) => {
        if (!cancelled) {
          console.error("[PARTNER_ANALYTICS]", e);
          setError("Não foi possível carregar as métricas agora.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPartnerId, period]);

  const showSkeleton = loading && !data;
  const empty = useMemo(() => data && !data.hasAnyData, [data]);
  const periodLabel = useMemo(
    () => PERIODS.find((p) => p.value === period)?.label ?? "",
    [period],
  );

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
        <h1 className="text-2xl font-bold">Analytics</h1>
        <PartnerEmptyState />
      </main>
    );
  }

  if (!canViewAnalytics) {
    return (
      <main className="min-h-screen p-6 space-y-4">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Disponível apenas para owner/admin do estabelecimento.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-6 space-y-4 max-w-5xl mx-auto overflow-x-hidden pb-24">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Analytics</h1>
          <p className="text-xs text-muted-foreground">Métricas reais do seu estabelecimento.</p>
        </div>
        <div
          role="tablist"
          aria-label="Período"
          className="inline-flex rounded-md border border-border p-0.5 bg-card self-start"
        >
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              type="button"
              role="tab"
              aria-selected={period === p.value}
              variant={period === p.value ? "default" : "ghost"}
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </header>

      {error ? (
        <Card>
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      {showSkeleton ? (
        <div className="space-y-3">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : null}

      {data && !showSkeleton ? (
        <>
          {empty ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Nenhum dado registrado ainda. Quando seus links públicos, listas VIP e reservas
                começarem a ser usados, as métricas aparecerão aqui.
              </CardContent>
            </Card>
          ) : null}

          <ExecutiveAnalyticsHero data={data} periodLabel={periodLabel} />
          <AnalyticsOpsTiles data={data} periodLabel={periodLabel} />
          <GrowthSummaryCard data={data} />

          <Suspense fallback={<Skeleton className="h-40 w-full" />}>
            <AnalyticsTopPromoters data={data} />
          </Suspense>

          <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            <AnalyticsAccordions data={data} />
          </Suspense>
        </>
      ) : null}
    </main>
  );
};

export default PartnerAnalyticsPage;
