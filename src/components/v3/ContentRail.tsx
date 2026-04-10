import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ReactNode } from "react";

interface ContentRailProps {
  title: string;
  subtitle?: string;
  linkTo?: string;
  linkLabel?: string;
  children: ReactNode;
}

export default function ContentRail({ title, subtitle, linkTo, linkLabel = "Ver tudo", children }: ContentRailProps) {
  return (
    <section className="py-4">
      <div className="flex items-end justify-between px-4 mb-3">
        <div>
          <h2 className="font-display font-bold text-lg text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {linkTo && (
          <Link to={linkTo} className="flex items-center gap-0.5 text-xs text-primary font-medium shrink-0">
            {linkLabel} <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide snap-x snap-mandatory">
        {children}
      </div>
    </section>
  );
}
