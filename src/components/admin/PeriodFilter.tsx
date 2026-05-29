import { cn } from "@/lib/utils";
import { DashboardPeriod, getPeriodLabel } from "@/lib/dashboardPeriod";

const periods: DashboardPeriod[] = ["hoje", "7d", "30d", "mes"];

interface PeriodFilterProps {
  value: DashboardPeriod;
  onChange: (p: DashboardPeriod) => void;
}

const PeriodFilter = ({ value, onChange }: PeriodFilterProps) => (
  <div className="inline-flex gap-0.5 rounded-xl bg-muted/60 p-1 backdrop-blur-sm border border-border/20">
    {periods.map((p) => (
      <button
        key={p}
        onClick={() => onChange(p)}
        className={cn(
          "relative rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-200",
          value === p
            ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {getPeriodLabel(p)}
      </button>
    ))}
  </div>
);

export default PeriodFilter;
