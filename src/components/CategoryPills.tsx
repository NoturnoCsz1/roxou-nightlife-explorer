import { Music, Mic2, Beer, Tent, Guitar, Disc3, Headphones, PartyPopper } from "lucide-react";
import { categoryConfig } from "@/lib/categoryConfig";

type EventCategory = "balada" | "show" | "bar" | "festival" | "sertanejo" | "funk" | "eletronica" | "festa";

const categoryIcons: Record<EventCategory, React.ElementType> = {
  balada: Music,
  show: Mic2,
  bar: Beer,
  festival: Tent,
  sertanejo: Guitar,
  funk: Disc3,
  eletronica: Headphones,
  festa: PartyPopper,
};

interface Props {
  selected?: EventCategory | null;
  onSelect: (cat: EventCategory | null) => void;
}

const CategoryPills = ({ selected, onSelect }: Props) => {
  return (
    <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
      <button
        onClick={() => onSelect(null)}
        className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold tracking-wide transition-all duration-200 ${
          !selected ? "gradient-primary text-primary-foreground neon-glow" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
        }`}
      >
        Todos
      </button>
      {(Object.keys(categoryConfig) as EventCategory[]).map((cat) => {
        const Icon = categoryIcons[cat];
        const active = selected === cat;
        const config = categoryConfig[cat];
        return (
          <button
            key={cat}
            onClick={() => onSelect(active ? null : cat)}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold tracking-wide transition-all duration-200 ${
              active ? `${config.badge} neon-glow` : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {config.label}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryPills;
