// ─── HomeSkeletons — placeholders + fallbacks + boundary ───
// Extraído de src/pages/v3/V3Home.tsx (Fase 5). JSX e classes idênticos.

import { Component, ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

export function HomeDataFallback() {
  return (
    <section className="px-4 py-6">
      <div className="rounded-3xl border border-primary/20 bg-card/70 px-5 py-6 text-center shadow-[0_0_28px_-16px_hsl(var(--primary))]">
        <p className="font-display text-base font-black text-foreground">Não foi possível carregar os eventos agora.</p>
        <Link to="/agenda" className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-black uppercase tracking-wide text-primary-foreground transition-transform active:scale-95">
          Ver agenda <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}

export class HomeBelowFoldBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[V3Home] erro ao renderizar área abaixo do hero", error);
  }

  render() {
    if (this.state.hasError) return <HomeDataFallback />;
    return this.props.children;
  }
}

export function HeroSkeleton() {
  return (
    <div className="relative h-[200px] md:h-[380px] bg-card/40 animate-pulse">
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
        <div className="h-3 w-16 bg-secondary/40 rounded" />
        <div className="h-5 md:h-8 w-3/4 bg-secondary/40 rounded" />
        <div className="h-3 md:h-4 w-1/2 bg-secondary/30 rounded" />
      </div>
    </div>
  );
}

export function EmptyHero() {
  return (
    <div className="relative h-[240px] flex items-center justify-center bg-card border-b border-border/30">
      <div className="text-center space-y-2">
        <Sparkles className="w-8 h-8 text-primary mx-auto opacity-50" />
        <p className="text-sm text-muted-foreground">Novos eventos em breve</p>
      </div>
    </div>
  );
}

export function RailSkeleton({ count = 3 }: { count?: number }) {
  return (
    <section className="py-3">
      <div className="px-4 mb-2"><div className="h-5 w-40 bg-secondary/50 rounded animate-pulse" /></div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-1">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="shrink-0 w-[230px] rounded-xl bg-card border border-border/30 animate-pulse">
            <div className="h-[130px] bg-secondary/30 rounded-t-xl" />
            <div className="p-2.5 space-y-2">
              <div className="h-4 w-3/4 bg-secondary/40 rounded" />
              <div className="h-3 w-1/2 bg-secondary/30 rounded" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function VenueRankSkeleton() {
  return (
    <section className="px-4 pt-5 pb-3">
      <div className="h-5 w-52 bg-secondary/50 rounded animate-pulse mb-4" />
      <div className="h-24 rounded-2xl bg-card border border-border/30 animate-pulse mb-3" />
      <div className="grid grid-cols-2 gap-2">
        {[0,1,2,3].map(i => <div key={i} className="h-32 rounded-xl bg-card border border-border/30 animate-pulse" />)}
      </div>
    </section>
  );
}

export function DesktopHomeSkeleton() {
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_320px] gap-5 px-6 py-6">
      <div className="space-y-6 min-w-0">
        <div className="h-[600px] rounded-3xl bg-card/60 border border-border/30 animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-40 rounded-2xl bg-card/60 border border-border/30 animate-pulse" />
          <div className="h-40 rounded-2xl bg-card/60 border border-border/30 animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[0,1,2].map(i => <div key={i} className="h-56 rounded-2xl bg-card/60 border border-border/30 animate-pulse" />)}
        </div>
      </div>
      <aside className="space-y-4">
        <div className="h-48 rounded-2xl bg-card/60 border border-border/30 animate-pulse" />
        <div className="h-64 rounded-2xl bg-card/60 border border-border/30 animate-pulse" />
        <div className="h-40 rounded-2xl bg-card/60 border border-border/30 animate-pulse" />
      </aside>
    </div>
  );
}
