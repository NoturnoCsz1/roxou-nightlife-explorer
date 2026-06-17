/**
 * GlassCard — superfície glassmorphism padrão do Partner Pro.
 *
 * Wrapper visual sobre uma <div>. Aceita variantes "default" (glass leve),
 * "strong" (mais opaco) e "gradient" (borda gradiente Roxou). Não tem lógica.
 */
import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "strong" | "gradient";
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingMap = {
  none: "",
  sm: "p-3",
  md: "p-4 md:p-5",
  lg: "p-5 md:p-6",
} as const;

const variantMap = {
  default: "partner-glass",
  strong: "partner-glass-strong",
  gradient: "partner-gradient-border",
} as const;

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = "default", interactive = false, padding = "md", ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          variantMap[variant],
          paddingMap[padding],
          interactive && "partner-glass-hover cursor-pointer",
          "text-foreground",
          className,
        )}
        {...rest}
      />
    );
  },
);

GlassCard.displayName = "GlassCard";

export default GlassCard;
