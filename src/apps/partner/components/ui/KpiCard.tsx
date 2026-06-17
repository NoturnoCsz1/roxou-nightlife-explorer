/**
 * KpiCard — card de métrica premium (90–110px de altura).
 *
 * Usado no novo grid de KPIs do dashboard de reservas. Sem lógica:
 * recebe label, valor e ícone, renderiza com gradiente sutil por tom.
 */
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard } from "./GlassCard";

export type KpiTone =
  | "neutral"
  | "confirmed"
  | "pending"
  | "waitlist"
  | "revenue"
  | "danger"
  | "success";

const toneRing: Record<KpiTone, string> = {
  neutral: "from-white/10 to-white/0",
  confirmed: "from-emerald-500/25 to-emerald-500/0",
  pending: "from-amber-500/25 to-amber-500/0",
  waitlist: "from-fuchsia-500/25 to-fuchsia-500/0",
  revenue: "from-violet-500/30 to-pink-500/0",
  danger: "from-rose-500/25 to-rose-500/0",
  success: "from-emerald-500/25 to-emerald-500/0",
};

const toneIcon: Record<KpiTone, string> = {
  neutral: "text-foreground/70 bg-white/5",
  confirmed: "text-emerald-300 bg-emerald-500/15",
  pending: "text-amber-300 bg-amber-500/15",
  waitlist: "text-fuchsia-300 bg-fuchsia-500/15",
  revenue: "text-violet-200 bg-violet-500/20",
  danger: "text-rose-300 bg-rose-500/15",
  success: "text-emerald-300 bg-emerald-500/15",
};

export interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: KpiTone;
  loading?: boolean;
  className?: string;
}

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  loading = false,
  className,
}: KpiCardProps) {
  return (
    <GlassCard
      padding="md"
      className={cn(
        "relative overflow-hidden min-h-[96px] flex flex-col justify-between animate-fade-in",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -top-12 -right-12 h-28 w-28 rounded-full blur-2xl opacity-80 bg-gradient-to-br",
          toneRing[tone],
        )}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-2 relative">
        <span className="text-[11px] uppercase tracking-wider text-foreground/60 font-medium leading-tight">
          {label}
        </span>
        {Icon && (
          <span className={cn("p-1.5 rounded-lg shrink-0", toneIcon[tone])}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <div className="relative">
        {loading ? (
          <div className="partner-skeleton h-7 w-20" />
        ) : (
          <div className="partner-kpi-value text-foreground">{value}</div>
        )}
        {hint && !loading && (
          <div className="text-[11px] text-foreground/55 mt-0.5 truncate">{hint}</div>
        )}
      </div>
    </GlassCard>
  );
}

export default KpiCard;
