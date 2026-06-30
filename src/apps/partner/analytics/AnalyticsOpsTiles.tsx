import {
  Crown,
  CalendarCheck,
  UserCheck,
  Sparkles,
} from "lucide-react";
import { GlassCard } from "../components/ui/GlassCard";
import type { PartnerAnalytics } from "../services/partnerAnalytics";

export function OpsTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Crown;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="partner-glass-hover hover-lift animate-fade-in rounded-lg border border-white/5 bg-background/40 p-3 min-h-[96px] flex flex-col justify-between">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate uppercase tracking-wide">{label}</span>
      </div>
      <div>
        <div className="text-xl font-bold tabular-nums">
          {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
        </div>
        {hint ? <div className="text-[10px] text-muted-foreground truncate">{hint}</div> : null}
      </div>
    </div>
  );
}

export function MedalBadge({ pos }: { pos: 0 | 1 | 2 }) {
  const map = ["🥇", "🥈", "🥉"] as const;
  return <span className="text-base leading-none">{map[pos]}</span>;
}

export function PromoterRow({
  rank,
  name,
  signups,
  checkins,
  conversion,
}: {
  rank: number;
  name: string;
  signups: number;
  checkins: number;
  conversion: number;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-background/30 p-3 flex items-center gap-3">
      {rank < 3 ? (
        <MedalBadge pos={rank as 0 | 1 | 2} />
      ) : (
        <span className="text-xs text-muted-foreground w-5 text-center tabular-nums">{rank + 1}</span>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{name}</div>
        <div className="text-[11px] text-muted-foreground tabular-nums">
          {signups} inscritos · {checkins} check-ins
        </div>
      </div>
      <div className="text-xs font-semibold tabular-nums text-primary shrink-0">{conversion}%</div>
    </div>
  );
}

/** KPIs operacionais — primeira dobra, renderização síncrona. */
export function AnalyticsOpsTiles({
  data,
  periodLabel,
}: {
  data: PartnerAnalytics;
  periodLabel: string;
}) {
  return (
    <GlassCard padding="md">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Operação</h3>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{periodLabel}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <OpsTile icon={Crown} label="Inscrições VIP" value={data.kpis.vipSignups} />
        <OpsTile icon={CalendarCheck} label="Reservas" value={data.kpis.reservations} />
        <OpsTile icon={UserCheck} label="Check-ins" value={data.kpis.checkins} />
        <OpsTile
          icon={Sparkles}
          label="Taxa presença"
          value={`${data.kpis.attendanceRate}%`}
          hint={`${data.kpis.noShows} no-show`}
        />
      </div>
    </GlassCard>
  );
}
