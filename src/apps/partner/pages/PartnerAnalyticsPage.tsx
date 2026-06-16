/**
 * PartnerAnalyticsPage — FIX real metrics
 * Lê dados reais (VIP, leads, promoters, reservations, events) e exibe KPIs.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  MousePointerClick,
  Heart,
  CalendarCheck,
  Crown,
  Users,
  UserCheck,
  UserX,
  Megaphone,
  ClipboardList,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePartnerAuth } from "../hooks/usePartnerAuth";
import { PartnerEmptyState } from "../components";
import {
  getPartnerAnalytics,
  type AnalyticsPeriod,
  type PartnerAnalytics,
} from "../services/partnerAnalytics";

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "all", label: "Tudo" },
];

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Eye;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs min-w-0">
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{label}</span>
        </div>
        <div className="mt-2 text-2xl font-semibold tabular-nums">
          {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
        </div>
        {hint ? (
          <div className="text-[10px] text-muted-foreground mt-1 truncate">
            {hint}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

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
    <main className="min-h-screen p-4 md:p-6 space-y-6 max-w-5xl mx-auto overflow-x-hidden">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Analytics</h1>
          <p className="text-xs text-muted-foreground">
            Métricas reais do seu estabelecimento.
          </p>
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
          <CardContent className="p-4 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : null}

      {showSkeleton ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : null}

      {data && !showSkeleton ? (
        <>
          {empty ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                Nenhum dado registrado ainda. Quando seus links públicos,
                listas VIP e reservas começarem a ser usados, as métricas
                aparecerão aqui.
              </CardContent>
            </Card>
          ) : null}

          <section aria-label="KPIs principais">
            <h2 className="text-sm font-semibold text-muted-foreground mb-2">
              Visão geral
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <Kpi icon={Eye} label="Visualizações" value={data.kpis.views} />
              <Kpi icon={MousePointerClick} label="Cliques" value={data.kpis.clicks} />
              <Kpi icon={Heart} label="Favoritos" value={data.kpis.favorites} />
              <Kpi icon={Crown} label="Inscrições VIP" value={data.kpis.vipSignups} />
              <Kpi
                icon={UserCheck}
                label="Check-ins"
                value={data.kpis.checkins}
                hint={`${data.kpis.attendanceRate}% de presença`}
              />
              <Kpi icon={UserX} label="No-show" value={data.kpis.noShows} />
              <Kpi icon={Users} label="Leads" value={data.kpis.leads} />
              <Kpi
                icon={CalendarCheck}
                label="Reservas"
                value={data.kpis.reservations}
              />
            </div>
          </section>

          <section aria-label="Lista VIP">
            <h2 className="text-sm font-semibold text-muted-foreground mb-2">
              Lista VIP
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <Kpi icon={ClipboardList} label="Listas ativas" value={data.vip.active} />
              <Kpi icon={ClipboardList} label="Fechadas" value={data.vip.closed} />
              <Kpi icon={ClipboardList} label="Encerradas" value={data.vip.ended} />
              <Kpi icon={Crown} label="Inscritos" value={data.vip.signups} />
              <Kpi icon={UserCheck} label="Check-ins" value={data.vip.checkins} />
              <Kpi
                icon={Sparkles}
                label="Taxa presença"
                value={`${data.vip.attendanceRate}%`}
              />
            </div>
          </section>

          <section aria-label="Leads e CRM">
            <h2 className="text-sm font-semibold text-muted-foreground mb-2">
              Leads / CRM
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Kpi icon={Users} label="Total leads" value={data.leads.total} />
              <Kpi
                icon={ShieldCheck}
                label="WhatsApp ok"
                value={data.leads.whatsapp}
              />
              <Kpi icon={ShieldCheck} label="E-mail ok" value={data.leads.email} />
              <Kpi
                icon={ShieldCheck}
                label="Sem consentimento"
                value={data.leads.noConsent}
              />
              <Kpi
                icon={Sparkles}
                label="Novos no período"
                value={data.leads.newInPeriod}
              />
            </div>
          </section>

          <section aria-label="Ranking de promoters">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Ranking de promoters
              </h2>
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Megaphone className="h-3.5 w-3.5" />
                {data.kpis.promotersActive} ativos
              </span>
            </div>
            {data.promoters.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-xs text-muted-foreground">
                  Nenhum promoter com inscrições no período.
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Desktop: tabela */}
                <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="text-muted-foreground bg-muted/30">
                      <tr>
                        <th className="text-left py-2 px-3">Promoter</th>
                        <th className="text-right py-2 px-3">Inscritos</th>
                        <th className="text-right py-2 px-3">Check-ins</th>
                        <th className="text-right py-2 px-3">No-show</th>
                        <th className="text-right py-2 px-3">Conversão</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.promoters.map((p, idx) => (
                        <tr
                          key={p.promoterId ?? `none-${idx}`}
                          className="border-t border-border"
                        >
                          <td className="py-2 px-3">{p.name}</td>
                          <td className="text-right py-2 px-3 tabular-nums">
                            {p.signups}
                          </td>
                          <td className="text-right py-2 px-3 tabular-nums">
                            {p.checkins}
                          </td>
                          <td className="text-right py-2 px-3 tabular-nums">
                            {p.noShows}
                          </td>
                          <td className="text-right py-2 px-3 tabular-nums">
                            {p.conversion}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile: cards */}
                <div className="md:hidden space-y-2">
                  {data.promoters.map((p, idx) => (
                    <Card key={p.promoterId ?? `none-${idx}`}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">{p.name}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {p.conversion}% conv.
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                          <div>
                            <div className="text-foreground tabular-nums">
                              {p.signups}
                            </div>
                            <div>Inscritos</div>
                          </div>
                          <div>
                            <div className="text-foreground tabular-nums">
                              {p.checkins}
                            </div>
                            <div>Check-ins</div>
                          </div>
                          <div>
                            <div className="text-foreground tabular-nums">
                              {p.noShows}
                            </div>
                            <div>No-show</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </section>

          <p className="text-[11px] text-muted-foreground">
            Eventos vinculados a listas/reservas no período:{" "}
            <span className="tabular-nums text-foreground">
              {data.kpis.eventsLinked}
            </span>
          </p>
        </>
      ) : null}
    </main>
  );
};

export default PartnerAnalyticsPage;
