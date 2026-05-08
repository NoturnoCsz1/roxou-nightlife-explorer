import { Component, ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight } from "lucide-react";

/**
 * Home section protection layer.
 *
 * Each major section of V3Home is wrapped with HomeSectionBoundary so that
 * a runtime error in one section never blanks the whole Home. The boundary
 * logs the section name and renders a discreet fallback in its place.
 */

type Variant = "error" | "empty" | "loading";

export function HomeSectionFallback({
  variant = "error",
  message,
  cta,
  className,
}: {
  variant?: Variant;
  message?: string;
  cta?: { label: string; to: string } | null;
  className?: string;
}) {
  const defaultMessage =
    variant === "loading"
      ? "Carregando…"
      : variant === "empty"
        ? "Nada por aqui agora."
        : "Não foi possível carregar esta seção agora.";

  return (
    <section className={`px-4 py-4 ${className || ""}`}>
      <div className="rounded-2xl border border-border/40 bg-card/60 px-4 py-4 text-center">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          {variant === "error" && <AlertTriangle className="h-3.5 w-3.5 text-accent" />}
          <p className="text-xs font-medium">{message || defaultMessage}</p>
        </div>
        {cta && (
          <Link
            to={cta.to}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/90 px-4 py-2 text-[11px] font-black uppercase tracking-wide text-primary-foreground transition-transform active:scale-95"
          >
            {cta.label} <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </section>
  );
}

interface BoundaryProps {
  name: string;
  children: ReactNode;
  fallback?: ReactNode;
  /** When true, render nothing on error (use only for purely decorative sections). */
  silent?: boolean;
}

interface BoundaryState {
  hasError: boolean;
}

export class HomeSectionBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error(`[V3Home] section "${this.props.name}" failed`, error);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.silent) return null;
      if (this.props.fallback) return this.props.fallback;
      return <HomeSectionFallback variant="error" />;
    }
    return this.props.children;
  }
}

export default HomeSectionBoundary;
