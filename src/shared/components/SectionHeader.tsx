import { ChevronRight } from "lucide-react";

interface SectionHeaderProps {
  emoji?: string;
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
}

const SectionHeader = ({ emoji, title, subtitle, onSeeAll }: SectionHeaderProps) => (
  <div className="flex items-end justify-between mb-4">
    <div>
      <h2 className="text-lg font-black font-display text-foreground leading-tight flex items-center gap-2">
        {emoji && <span className="text-xl">{emoji}</span>}
        {title}
      </h2>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      )}
    </div>
    {onSeeAll && (
      <button
        onClick={onSeeAll}
        className="flex items-center gap-0.5 text-xs font-semibold text-primary transition hover:text-accent"
      >
        Ver todos
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
);

export default SectionHeader;
