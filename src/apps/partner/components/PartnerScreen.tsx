/**
 * PartnerScreen — wrapper padrão das telas Partner Pro v2.
 * Header sticky + safe areas + scroll container responsivo.
 */
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  /** quando true não adiciona padding-bottom extra (útil para telas com FAB já gerenciado) */
  noBottomGap?: boolean;
  /** layout mais largo para telas densas (dashboard) */
  wide?: boolean;
}

export function PartnerScreen({
  title,
  subtitle,
  right,
  children,
  className,
  noBottomGap,
  wide,
}: Props) {
  return (
    <section
      className={cn("w-full mx-auto min-w-0", wide ? "max-w-3xl xl:max-w-5xl" : "max-w-3xl", className)}
    >
      <header
        className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-background/85 backdrop-blur-md border-b border-border/40"
        style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-foreground truncate">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                {subtitle}
              </p>
            ) : null}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      </header>
      <div
        className={cn("pt-4 space-y-4", !noBottomGap && "pb-28")}
      >
        {children}
      </div>
    </section>
  );
}

export default PartnerScreen;
