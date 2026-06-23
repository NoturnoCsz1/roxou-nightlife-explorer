/**
 * PartnerActionTile — tile compacto com ícone, label, hint opcional e chevron.
 * Usado nos hubs (Reservas, Config). Chevron aparece somente quando há `to`.
 */
import { memo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PartnerActionTileProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  to?: string;
  onClick?: () => void;
  badge?: string;
  comingSoon?: boolean;
  className?: string;
}

function Inner({ icon: Icon, label, hint, badge, comingSoon }: PartnerActionTileProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-3 min-w-0">
      <div className="h-9 w-9 shrink-0 rounded-xl bg-white/8 flex items-center justify-center">
        <Icon className="h-4 w-4 text-foreground/80" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-foreground truncate">{label}</span>
          {comingSoon ? (
            <span className="shrink-0 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/25 px-1.5 py-0.5 text-[9px] uppercase tracking-wider">
              Em breve
            </span>
          ) : null}
          {badge ? (
            <span className="shrink-0 rounded-full bg-violet-500/20 text-violet-200 border border-violet-400/30 px-1.5 py-0.5 text-[10px] font-semibold">
              {badge}
            </span>
          ) : null}
        </div>
        {hint ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

function PartnerActionTileImpl(props: PartnerActionTileProps) {
  const { to, onClick, className } = props;
  const base =
    "block w-full rounded-2xl border border-white/8 bg-card/40 hover:bg-card/60 transition-colors";
  if (to) {
    return (
      <Link to={to} className={cn(base, "group", className)}>
        <div className="flex items-center">
          <div className="flex-1 min-w-0">
            <Inner {...props} />
          </div>
          <ChevronRight className="mr-3 h-4 w-4 text-muted-foreground/60 group-hover:text-foreground/80 shrink-0" />
        </div>
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cn(base, "text-left", className)}>
      <Inner {...props} />
    </button>
  );
}

export const PartnerActionTile = memo(PartnerActionTileImpl);
export default PartnerActionTile;
