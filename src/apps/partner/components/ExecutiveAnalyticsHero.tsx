/**
 * ExecutiveAnalyticsHero — Sprint final Analytics premium.
 *
 * Hero executivo mobile-first com 4 KPIs principais em grid 2x2.
 * Consome apenas dados já carregados (PartnerAnalytics).
 */
import { Eye, Crown, UserCheck, TrendingUp } from "lucide-react";
import { GlassCard } from "./ui/GlassCard";
import type { PartnerAnalytics } from "../services/partnerAnalytics";

interface Props {
  data: PartnerAnalytics;
  periodLabel: string;
}

function HeroStat({
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
    <div className="min-w-0 rounded-lg bg-background/30 backdrop-blur-sm border border-white/5 p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground min-w-0">
        <Icon className="h-3 w-3 shrink-0" />
        <span className="truncate uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-1 text-xl md:text-2xl font-bold tabular-nums text-foreground">
        {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
      </div>
      {hint ? (
        <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export function ExecutiveAnalyticsHero({ data, periodLabel }: Props) {
  const { kpis } = data;
  const conversion =
    kpis.views > 0
      ? Math.round((kpis.vipSignups / kpis.views) * 100)
      : 0;

  return (
    <GlassCard
      variant="gradient"
      padding="md"
      className="relative overflow-hidden"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Visão executiva
          </p>
          <h2 className="text-base font-semibold text-foreground">
            Resumo do período
          </h2>
        </div>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground px-2 py-0.5 rounded-full bg-background/40 border border-white/5">
          {periodLabel}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <HeroStat icon={Eye} label="Visualizações" value={kpis.views} />
        <HeroStat icon={Crown} label="Inscrições VIP" value={kpis.vipSignups} />
        <HeroStat
          icon={UserCheck}
          label="Check-ins"
          value={kpis.checkins}
          hint={`${kpis.attendanceRate}% presença`}
        />
        <HeroStat
          icon={TrendingUp}
          label="Conversão"
          value={`${conversion}%`}
          hint="views → VIP"
        />
      </div>
    </GlassCard>
  );
}

export default ExecutiveAnalyticsHero;
