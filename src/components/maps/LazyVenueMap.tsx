import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";

const RoxouVenueMap = lazy(() => import("./RoxouVenueMap"));

type Props = {
  lat: number;
  lng: number;
  name: string;
  address?: string | null;
  height?: number;
};

class MapErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {}
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function MapSkeleton({ height }: { height: number }) {
  return (
    <div
      className="w-full rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden relative"
      style={{ height }}
      aria-hidden
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 animate-pulse" />
    </div>
  );
}

function MapErrorFallback({ height }: { height: number }) {
  return (
    <div
      className="w-full rounded-xl border border-border/40 bg-card/50 flex items-center justify-center text-xs text-muted-foreground px-4 text-center"
      style={{ height }}
    >
      Não foi possível carregar o mapa agora.
    </div>
  );
}

export default function LazyVenueMap({ height = 220, ...rest }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (shouldLoad) return;
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <div ref={ref} style={{ minHeight: height }}>
      {shouldLoad ? (
        <MapErrorBoundary fallback={<MapErrorFallback height={height} />}>
          <Suspense fallback={<MapSkeleton height={height} />}>
            <RoxouVenueMap height={height} {...rest} />
          </Suspense>
        </MapErrorBoundary>
      ) : (
        <MapSkeleton height={height} />
      )}
    </div>
  );
}
