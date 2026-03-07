import { CalendarDays, CalendarCheck, CalendarRange, List } from "lucide-react";

export type DateFilter = "hoje" | "amanha" | "fds" | "todos";

const filters: { key: DateFilter; label: string; icon: React.ElementType }[] = [
  { key: "hoje", label: "Hoje", icon: CalendarDays },
  { key: "amanha", label: "Amanhã", icon: CalendarCheck },
  { key: "fds", label: "Fim de Semana", icon: CalendarRange },
  { key: "todos", label: "Todos", icon: List },
];

interface Props {
  selected: DateFilter;
  onSelect: (filter: DateFilter) => void;
}

const DateFilterPills = ({ selected, onSelect }: Props) => (
  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
    {filters.map((f) => {
      const active = selected === f.key;
      return (
        <button
          key={f.key}
          onClick={() => onSelect(f.key)}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold tracking-wide transition-all duration-200 ${
            active
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
