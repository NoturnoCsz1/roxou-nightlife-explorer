import { cn } from "@/lib/utils";
import { DashboardPeriod, getPeriodLabel } from "@/lib/dashboardPeriod";

const periods: DashboardPeriod[] = ["hoje", "7d", "30d", "mes"];

interface PeriodFilterProps {
  value: DashboardPeriod;
  onChange: (p: DashboardPeriod) => void;
}

const PeriodFilter = ({ value, onChange }: PeriodFilterProps) => (
  <div className="flex gap-1.5 flex-wrap">
    {periods.map((p) => (
      <button
        key={p}
        onClick={() => onChange(p)}
        className={cn(
          "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
          value === p
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        )}
      >
        {getPeriodLabel(p)}
      </button>
    ))}
  </div>
);

export default PeriodFilter;
