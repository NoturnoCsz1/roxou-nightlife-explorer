import { useRef, useEffect } from "react";
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

const DateFilterPills = ({ active, onScrollTo }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<Record<DateAnchor, HTMLButtonElement | null>>({ hoje: null, amanha: null, fds: null });

  useEffect(() => {
    if (!active) return;
    const pill = pillRefs.current[active];
    const container = containerRef.current;
    if (!pill || !container) return;
    const scrollTarget = pill.offsetLeft - container.offsetWidth / 2 + pill.offsetWidth / 2;
    container.scrollTo({ left: scrollTarget, behavior: "smooth" });
  }, [active]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-x-auto overflow-y-hidden scrollbar-hide -mx-4 md:mx-0"
    >
      <div className="flex flex-nowrap gap-2 px-4 md:px-0 pb-1 min-w-max">
      {anchors.map((f) => {
        const isActive = active === f.key;
        return (
          <button
            key={f.key}
            ref={el => { pillRefs.current[f.key] = el; }}
            onClick={() => onScrollTo(f.key)}
            className={`flex flex-shrink-0 whitespace-nowrap items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold tracking-wide transition-all duration-300 ease-out ${
              isActive
                ? "gradient-primary text-primary-foreground neon-glow scale-105"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80 scale-100"
            }`}
          >
            <f.icon className={`h-3.5 w-3.5 transition-transform duration-300 ${isActive ? "animate-scale-in" : ""}`} />
            {f.label}
          </button>
        );
      })}
    </div>
  );
};

export default DateFilterPills;
