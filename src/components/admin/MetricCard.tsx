import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  className?: string;
}

const MetricCard = ({ title, value, icon: Icon, trend, className }: MetricCardProps) => (
  <div className={cn("rounded-xl border border-border/40 bg-card p-4", className)}>
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-xs text-muted-foreground font-medium">{title}</span>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <p className="text-2xl font-bold text-foreground">{value}</p>
    {trend && <p className="text-[11px] text-muted-foreground mt-1">{trend}</p>}
  </div>
);

export default MetricCard;
