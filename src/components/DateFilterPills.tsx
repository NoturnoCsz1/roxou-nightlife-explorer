import { CalendarDays, CalendarCheck, CalendarRange } from "lucide-react";

export type DateAnchor = "hoje" | "amanha" | "fds";

const anchors: { key: DateAnchor; label: string; icon: React.ElementType }[] = [
  { key: "hoje", label: "Hoje", icon: CalendarDays },
  { key: "amanha", label: "Amanhã", icon: CalendarCheck },
  { key: "fds", label: "Fim de Semana", icon: CalendarRange },
];

interface Props {
  active: DateAnchor | null;
  onScrollTo: (anchor: DateAnchor) => void;
}

const DateFilterPills = ({ active, onScrollTo }: Props) => (
  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
    {anchors.map((f) => {
      const isActive = active === f.key;
      return (
        <button
          key={f.key}
          onClick={() => onScrollTo(f.key)}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold tracking-wide transition-all duration-200 ${
            isActive
              ? "gradient-primary text-primary-foreground neon-glow"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          <f.icon className="h-3.5 w-3.5" />
          {f.label}
        </button>
      );
    })}
  </div>
);

export default DateFilterPills;
