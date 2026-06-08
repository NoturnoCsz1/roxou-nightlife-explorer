import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** "chip" = pequeno badge inline; "banner" = faixa full-width premium */
  variant?: "chip" | "banner";
  className?: string;
}

/**
 * SpotlightBadge — selo "🏆 Destaque do Mês" para parceiros patrocinados.
 *
 * - Variant `chip`: badge compacto inline (ao lado do nome, no card)
 * - Variant `banner`: faixa horizontal de topo (perfil do parceiro)
 *
 * Estilo: roxo/neon Roxou + toque dourado premium, glassmorphism.
 */
export default function SpotlightBadge({ variant = "chip", className }: Props) {
  if (variant === "banner") {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-amber-300/40",
          "bg-gradient-to-r from-primary/25 via-amber-500/15 to-primary/20",
          "shadow-[0_0_30px_-8px_hsl(45_95%_55%/0.35)]",
          "px-4 py-3 flex items-center gap-3",
          className,
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,hsl(45_95%_60%/0.25),transparent_60%)] pointer-events-none" />
        <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 border border-amber-300/40 shadow-[0_0_18px_-4px_hsl(45_95%_55%/0.6)]">
          <Crown className="h-4.5 w-4.5 text-amber-200" strokeWidth={2.4} />
        </div>
        <div className="relative z-10 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200/90">
            🏆 Patrocínio Premium
          </p>
          <p className="text-sm font-display font-black text-foreground leading-tight">
            Destaque do Mês na Roxou
          </p>
        </div>
      </div>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
        "text-[9px] font-extrabold uppercase tracking-wider",
        "bg-gradient-to-r from-amber-400/25 via-primary/20 to-amber-400/25",
        "text-amber-200 border border-amber-300/50",
        "shadow-[0_0_12px_-3px_hsl(45_95%_55%/0.55)]",
        "backdrop-blur-sm",
        className,
      )}
    >
      <Crown className="h-2.5 w-2.5" strokeWidth={2.5} />
      Destaque do Mês
    </span>
  );
}
