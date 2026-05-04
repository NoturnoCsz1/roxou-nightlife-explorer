import {
  Flame,
  Music,
  Mic2,
  Beer,
  Zap,
  PartyPopper,
  Trophy,
  GraduationCap,
  Utensils,
  Palette,
  Sofa,
  Tag,
  type LucideIcon,
} from "lucide-react";

const CATEGORIES = [
  { key: "festa", label: "Festas", icon: PartyPopper, color: "bg-primary/15 text-primary" },
  { key: "show", label: "Shows", icon: Mic2, color: "bg-blue-500/15 text-blue-400" },
  { key: "balada", label: "Baladas", icon: Zap, color: "bg-accent/15 text-accent" },
  { key: "bar", label: "Bares", icon: Beer, color: "bg-emerald-500/15 text-emerald-400" },
  { key: "lounge", label: "Lounges", icon: Sofa, color: "bg-purple-500/15 text-purple-400" },
  { key: "espetinho", label: "Espetinhos", icon: Flame, color: "bg-red-500/15 text-red-400" },
  { key: "sertanejo", label: "Sertanejo", icon: Music, color: "bg-orange-500/15 text-orange-400" },
  { key: "funk", label: "Funk", icon: Flame, color: "bg-pink-500/15 text-pink-400" },
  { key: "futebol", label: "Futebol", icon: Trophy, color: "bg-yellow-500/15 text-yellow-400" },
  { key: "universitario", label: "Universitário", icon: GraduationCap, color: "bg-indigo-500/15 text-indigo-400" },
  { key: "restaurante", label: "Restaurantes", icon: Utensils, color: "bg-primary/15 text-primary shadow-[0_0_12px_hsl(var(--v3-neon)/0.45)]" },
  { key: "cultural", label: "Cultural", icon: Palette, color: "bg-fuchsia-500/15 text-fuchsia-400" },
];

/** Icon resolver — guarantees every category renders an icon (Tag as fallback). */
export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  festa: PartyPopper,
  show: Mic2,
  balada: Zap,
  bar: Beer,
  lounge: Sofa,
  espetinho: Flame,
  sertanejo: Music,
  funk: Flame,
  futebol: Trophy,
  universitario: GraduationCap,
  restaurante: Utensils,
  cultural: Palette,
  festival: Music,
  eletronica: Zap,
};

export function getCategoryIcon(key?: string | null): LucideIcon {
  if (!key) return Tag;
  return CATEGORY_ICON_MAP[key] ?? Tag;
}

interface CategoryChipsProps {
  selected?: string;
  onSelect: (category: string) => void;
}

export default function CategoryChips({ selected, onSelect }: CategoryChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
      {CATEGORIES.map(({ key, label, icon: Icon, color }) => (
        <button
          key={key}
          onClick={() => onSelect(selected === key ? "" : key)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium shrink-0 transition-all border ${
            selected === key
              ? "bg-primary text-primary-foreground border-primary shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
              : `${color} border-transparent hover:border-border`
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
