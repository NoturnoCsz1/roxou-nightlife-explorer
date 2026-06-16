/**
 * PartnerAnalyticsPage — Fase 9D (MVP).
 * Lê partner_metrics_daily e exibe totais de 7d e 30d.
 */
import { useEffect, useState } from "react";
import { usePartnerAuth } from "../hooks/usePartnerAuth";
import {
  PartnerEmptyState,
  PartnerMetricsCards,
} from "../components";
import {
  getPartnerMetrics,
  type PartnerMetricsRange,
} from "../services/partnerMetrics";

const PartnerAnalyticsPage = () => {
  const { selectedPartnerId, canViewAnalytics, isLoading } = usePartnerAuth();
  const [metrics, setMetrics] = useState<PartnerMetricsRange | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedPartnerId) {
      setMetrics(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getPartnerMetrics(selectedPartnerId)
      .then((m) => {
        if (!cancelled) setMetrics(m);
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

  const last7 = metrics?.last7 ?? {
    views: 0,
    clicks: 0,
    favorites: 0,
    reservations: 0,
    vipSignups: 0,
  };
  const last30 = metrics?.last30 ?? {
    views: 0,
    clicks: 0,
    favorites: 0,
    reservations: 0,
    vipSignups: 0,
  };

  return (
    <main className="min-h-screen p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold">Analytics</h1>
        {loading ? (
          <span className="text-xs text-muted-foreground">atualizando…</span>
        ) : null}
      </header>

      <PartnerMetricsCards totals={last7} label="Últimos 7 dias" />
      <PartnerMetricsCards totals={last30} label="Últimos 30 dias" />

      <section className="rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold mb-2">Série diária (30 dias)</h2>
        {metrics && metrics.daily.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="text-left py-1 pr-3">Data</th>
                  <th className="text-right py-1 pr-3">Views</th>
                  <th className="text-right py-1 pr-3">Cliques</th>
                  <th className="text-right py-1">Favoritos</th>
                </tr>
              </thead>
              <tbody>
                {metrics.daily.map((d) => (
                  <tr key={d.date} className="border-t border-border">
                    <td className="py-1 pr-3">
                      {new Date(d.date).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="text-right py-1 pr-3">{d.views}</td>
                    <td className="text-right py-1 pr-3">{d.clicks}</td>
                    <td className="text-right py-1">{d.favorites}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Ainda sem dados em partner_metrics_daily para este estabelecimento.
          </p>
        )}
      </section>
    </main>
  );
};

export default PartnerAnalyticsPage;
