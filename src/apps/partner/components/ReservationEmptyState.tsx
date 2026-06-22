import { CalendarOff, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Props {
  message?: string;
  /** Slot opcional para CTA secundário (ex: "Ver reservas", "Criar reserva") */
  ctaLabel?: string;
  ctaTo?: string;
  onCta?: () => void;
}

export function ReservationEmptyState({
  message = "Nenhuma reserva encontrada.",
  ctaLabel,
  ctaTo,
  onCta,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-card/40 p-10 text-center">
      <CalendarOff className="h-10 w-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {ctaLabel && (ctaTo || onCta) ? (
        ctaTo ? (
          <Button asChild size="sm" variant="outline" className="min-h-[40px]">
            <Link to={ctaTo}>
              {ctaLabel} <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={onCta} className="min-h-[40px]">
            {ctaLabel} <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        )
      ) : null}
    </div>
  );
}

export default ReservationEmptyState;
