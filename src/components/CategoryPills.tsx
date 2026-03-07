import { categoryLabels, EventCategory } from "@/data/events";
import { Music, Mic2, Beer, Tent, Guitar, Disc3, Headphones } from "lucide-react";

const categoryIcons: Record<EventCategory, React.ElementType> = {
  festa: Music,
  show: Mic2,
  bar: Beer,
  festival: Tent,
  sertanejo: Guitar,
  funk: Disc3,
  eletronica: Headphones,
};

interface Props {
  selected?: EventCategory | null;
  onSelect: (cat: EventCategory | null) => void;
}

const CategoryPills = ({ selected, onSelect }: Props) => {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      <button
        onClick={() => onSelect(null)}
        className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
          !selected
            ? "gradient-primary text-primary-foreground neon-glow"
            : "bg-secondary text-secondary-foreground"
        }`}
      >
        Todos
      </button>
      {(Object.keys(categoryLabels) as EventCategory[]).map((cat) => {
        const Icon = categoryIcons[cat];
        const active = selected === cat;
        return (
          <button
            key={cat}
            onClick={() => onSelect(active ? null : cat)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
              active
                ? "gradient-primary text-primary-foreground neon-glow"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {categoryLabels[cat]}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryPills;
