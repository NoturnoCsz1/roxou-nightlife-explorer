/**
 * PartnerMetricsCards — Fase 9D
 * Cards de KPI compactos. Reservas e VIP são placeholders nesta fase.
 */
import { Eye, MousePointerClick, Heart, CalendarCheck, Crown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { PartnerMetricsTotals } from "../services/partnerMetrics";

interface Props {
  totals: PartnerMetricsTotals;
  label?: string;
}

function Kpi({
  icon: Icon,
  label,
  value,
  placeholder,
}: {
  icon: typeof Eye;
  label: string;
  value: number;
  placeholder?: boolean;
}) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs min-w-0">
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{label}</span>
        </div>
        <div className="mt-2 text-2xl font-semibold">
          {placeholder ? "—" : value.toLocaleString("pt-BR")}
        </div>
        {placeholder ? (
          <div className="text-[10px] text-muted-foreground mt-1">em breve</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function PartnerMetricsCards({ totals, label }: Props) {
  return (
    <section aria-label={label ?? "Métricas"}>
      {label ? (
        <h3 className="text-sm font-medium text-muted-foreground mb-2">{label}</h3>
      ) : null}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi icon={Eye} label="Visualizações" value={totals.views} />
        <Kpi icon={Heart} label="Favoritos" value={totals.favorites} />
        <Kpi icon={MousePointerClick} label="Cliques" value={totals.clicks} />
        <Kpi icon={CalendarCheck} label="Reservas" value={0} placeholder />
        <Kpi icon={Crown} label="Lista VIP" value={0} placeholder />
      </div>
    </section>
  );
}

export default PartnerMetricsCards;
