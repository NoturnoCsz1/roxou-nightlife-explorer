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
  <div className={cn("rounded-xl border border-border/40 bg-card p-3", className)}>
    <div className="flex items-center justify-between mb-1">
      <span className="text-[11px] text-muted-foreground font-medium">{title}</span>
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
    </div>
    <p className="text-xl font-bold text-foreground">{value}</p>
    {trend && <p className="text-[10px] text-muted-foreground mt-0.5">{trend}</p>}
  </div>
);

export default MetricCard;
