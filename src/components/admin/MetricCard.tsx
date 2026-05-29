import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  className?: string;
  accent?: "primary" | "accent" | "green" | "amber";
}

const accentStyles = {
  primary: {
    iconBg: "bg-primary/15",
    iconColor: "text-primary",
    glow: "shadow-[0_0_24px_-6px_hsl(var(--primary)/0.25)]",
    bar: "from-primary/60 to-primary/0",
  },
  accent: {
    iconBg: "bg-accent/15",
    iconColor: "text-accent",
    glow: "shadow-[0_0_24px_-6px_hsl(var(--accent)/0.25)]",
    bar: "from-accent/60 to-accent/0",
  },
  green: {
    iconBg: "bg-green-500/15",
    iconColor: "text-green-400",
    glow: "shadow-[0_0_24px_-6px_rgba(34,197,94,0.2)]",
    bar: "from-green-500/60 to-green-500/0",
  },
  amber: {
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
    glow: "shadow-[0_0_24px_-6px_rgba(245,158,11,0.2)]",
    bar: "from-amber-500/60 to-amber-500/0",
  },
};

const MetricCard = ({ title, value, icon: Icon, trend, className, accent = "primary" }: MetricCardProps) => {
  const s = accentStyles[accent];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm p-4 transition-all duration-300 hover:border-border/60",
        s.glow,
        className
      )}
    >
      {/* Top gradient bar */}
      <div className={cn("absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r", s.bar)} />

      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5">
          <span className="text-[11px] text-muted-foreground font-medium tracking-wide uppercase">{title}</span>
          <p className="text-2xl font-bold text-foreground tracking-tight">{typeof value === "number" ? value.toLocaleString("pt-BR") : value}</p>
          {trend && (
            <p className="text-[11px] text-muted-foreground leading-snug">{trend}</p>
          )}
        </div>
        <div className={cn("flex items-center justify-center h-9 w-9 rounded-xl shrink-0", s.iconBg)}>
          <Icon className={cn("h-4.5 w-4.5", s.iconColor)} />
        </div>
      </div>
    </div>
  );
};

export default MetricCard;
