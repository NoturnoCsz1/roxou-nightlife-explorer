/**
 * SectionHeader — cabeçalho consistente para seções do painel parceiro.
 */
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  icon: Icon,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-end justify-between gap-3 mb-3", className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {Icon && (
            <span className="p-1.5 rounded-lg bg-white/5 text-foreground/70">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <h2 className="text-base md:text-lg font-semibold tracking-tight text-foreground truncate">
            {title}
          </h2>
        </div>
        {description && (
          <p className="text-xs text-foreground/55 mt-0.5 truncate">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export default SectionHeader;
