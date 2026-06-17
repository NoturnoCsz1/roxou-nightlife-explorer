/**
 * GrowthSummaryCard — Sprint final Analytics premium.
 *
 * Strip horizontal de métricas de crescimento com scroll snap.
 */
import { Users, TrendingUp, MessageCircle, Mail } from "lucide-react";
import { GlassCard } from "./ui/GlassCard";
import type { PartnerAnalytics } from "../services/partnerAnalytics";

interface Props {
  data: PartnerAnalytics;
}

function Pill({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="snap-start shrink-0 w-[44%] min-w-[140px] rounded-lg bg-background/30 border border-white/5 p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="h-3 w-3 shrink-0" />
        <span className="truncate uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-1 text-lg font-bold tabular-nums text-foreground">
        {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
      </div>
      {hint ? (
        <div className="text-[10px] text-muted-foreground truncate">{hint}</div>
      ) : null}
    </div>
  );
}

export function GrowthSummaryCard({ data }: Props) {
  const { leads, kpis, vip } = data;
  const conversion =
    vip.signups > 0 ? Math.round((vip.checkins / vip.signups) * 100) : 0;
  return (
    <GlassCard padding="md">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Crescimento</h3>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
          dados acumulados
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory -mx-1 px-1 pb-1">
        <Pill icon={Users} label="Leads" value={leads.total} hint={`+${leads.newInPeriod} no período`} />
        <Pill icon={TrendingUp} label="Conversão" value={`${conversion}%`} hint="VIP → check-in" />
        <Pill icon={MessageCircle} label="WhatsApp" value={leads.whatsapp} hint="opt-in" />
        <Pill icon={Mail} label="E-mail" value={leads.email} hint="opt-in" />
        <Pill icon={Users} label="Reservas" value={kpis.reservations} />
      </div>
    </GlassCard>
  );
}

export default GrowthSummaryCard;
