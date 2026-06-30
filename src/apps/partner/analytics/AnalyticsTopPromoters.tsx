import { Trophy, Megaphone } from "lucide-react";
import { GlassCard } from "../components/ui/GlassCard";
import { PromoterRow } from "./AnalyticsOpsTiles";
import type { PartnerAnalytics } from "../services/partnerAnalytics";

export default function AnalyticsTopPromoters({ data }: { data: PartnerAnalytics }) {
  const topPromoters = data.promoters.slice(0, 3);
  return (
    <GlassCard padding="md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Top promoters</h3>
        </div>
        <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
          <Megaphone className="h-3 w-3" />
          {data.kpis.promotersActive} ativos
        </span>
      </div>
      {topPromoters.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum promoter com inscrições no período.</p>
      ) : (
        <div className="space-y-2">
          {topPromoters.map((p, idx) => (
            <PromoterRow
              key={p.promoterId ?? `none-${idx}`}
              rank={idx}
              name={p.name}
              signups={p.signups}
              checkins={p.checkins}
              conversion={p.conversion}
            />
          ))}
        </div>
      )}
    </GlassCard>
  );
}
