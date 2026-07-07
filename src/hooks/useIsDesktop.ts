// ─── useIsDesktop — matchMedia hook alinhado ao breakpoint `lg` (1024px) do Tailwind ───
// Usado para renderizar condicionalmente HomeMobile x HomeDesktop, evitando montagem
// dupla das duas árvores React. Leitura síncrona no primeiro render evita flash.

import { useEffect, useState } from "react";

const QUERY = "(min-width: 1024px)";

function getInitial(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    // Fallback SSR / ambiente sem matchMedia: assume mobile-first.
    return false;
  }
  return window.matchMedia(QUERY).matches;
}

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean>(getInitial);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(QUERY);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    // Sincroniza caso o valor tenha mudado entre render e efeito.
    setIsDesktop(mql.matches);
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }
    // Safari <14
    mql.addListener(handler);
    return () => mql.removeListener(handler);
  }, []);

  return isDesktop;
}
