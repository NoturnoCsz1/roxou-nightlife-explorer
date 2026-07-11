import { Suspense, type ReactNode } from "react";

/**
 * Fallback leve compartilhado pelas árvores de rotas (Onda 3).
 * Mantém exatamente o mesmo visual anterior — não altera UX.
 */
export const LazyFallback = () => (
  <div className="min-h-[40vh] flex items-center justify-center">
    <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
  </div>
);

export const L = (el: ReactNode) => (
  <Suspense fallback={<LazyFallback />}>{el}</Suspense>
);
