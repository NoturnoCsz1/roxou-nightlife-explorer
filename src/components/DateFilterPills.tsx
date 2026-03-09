import { CalendarDays, CalendarCheck, CalendarRange } from "lucide-react";

export type DateAnchor = "hoje" | "amanha" | "fds";

const anchors: { key: DateAnchor; label: string; icon: React.ElementType }[] = [
  { key: "hoje", label: "Hoje", icon: CalendarDays },
  { key: "amanha", label: "Amanhã", icon: CalendarCheck },
  { key: "fds", label: "Fim de Semana", icon: CalendarRange },
];

interface Props {
  onScrollTo: (anchor: DateAnchor) => void;
}

const DateFilterPills = ({ onScrollTo }: Props) => (
  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
    {anchors.map((f) => (
      <button
        key={f.key}
        onClick={() => onScrollTo(f.key)}
        className="flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold tracking-wide transition-all duration-200 bg-secondary text-secondary-foreground hover:bg-secondary/80 active:gradient-primary active:text-primary-foreground"
      >
        <f.icon className="h-3.5 w-3.5" />
        {f.label}
      </button>
    ))}
  </div>
);

export default DateFilterPills;
