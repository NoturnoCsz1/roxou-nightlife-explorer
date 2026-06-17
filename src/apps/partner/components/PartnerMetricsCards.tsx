/**
 * PartnerMetricsCards — FIX real metrics
 * Cards de KPI compactos. Reservas e Lista VIP usam dados reais
 * (partner_reservations e partner_vip_list_entries) via getPartnerAnalytics.
 */
import { Eye, MousePointerClick, Heart, CalendarCheck, Crown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { PartnerMetricsTotals } from "../services/partnerMetrics";

interface Props {
  totals: PartnerMetricsTotals;
  label?: string;
  loading?: boolean;
  error?: string | null;
  /**
   * Marca métricas sem fonte real ativa (apenas exibe um hint discreto
   * "sem dados", mantendo o valor 0). Não usar "em breve".
   */
  missingSources?: Partial<Record<keyof PartnerMetricsTotals, boolean>>;
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Eye;
  label: string;
  value: number;
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
          {value.toLocaleString("pt-BR")}
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

export function PartnerMetricsCards({
  totals,
  label,
  loading,
  error,
  missingSources,
}: Props) {
  return (
    <section aria-label={label ?? "Métricas"}>
      {label ? (
        <h3 className="text-sm font-medium text-muted-foreground mb-2">{label}</h3>
      ) : null}

      {error ? (
        <p className="text-xs text-destructive mb-2">{error}</p>
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))
        ) : (
          <>
            <Kpi
              icon={Eye}
              label="Visualizações"
              value={totals.views}
              hint={missingSources?.views ? "sem dados" : undefined}
            />
            <Kpi
              icon={Heart}
              label="Favoritos"
              value={totals.favorites}
              hint={missingSources?.favorites ? "sem dados" : undefined}
            />
            <Kpi
              icon={MousePointerClick}
              label="Cliques"
              value={totals.clicks}
              hint={missingSources?.clicks ? "sem dados" : undefined}
            />
            <Kpi
              icon={CalendarCheck}
              label="Reservas"
              value={totals.reservations}
            />
            <Kpi icon={Crown} label="Lista VIP" value={totals.vipSignups} />
          </>
        )}
      </div>
    </section>
  );
}

export default PartnerMetricsCards;
