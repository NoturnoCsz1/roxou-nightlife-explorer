// ─── useHomeCarousels — estado do carrossel hero (autoplay) ───
// Extraído de src/pages/v3/V3Home.tsx (Fase 5). Comportamento idêntico.

import { useEffect, useState } from "react";
import type { Ev } from "../types";

export function useHomeCarousels(heroEvents: Ev[]) {
  const [heroIdx, setHeroIdx] = useState(0);
  const [isHeroPaused, setIsHeroPaused] = useState(false);

  // Autoplay do hero — avança a cada 4500ms, para com > 1 evento
  useEffect(() => {
    const total = (heroEvents ?? []).length;
    if (total <= 1 || isHeroPaused) return;
    const id = setInterval(() => {
      setHeroIdx(prev => (prev + 1) % total);
    }, 4500);
    return () => clearInterval(id);
  }, [(heroEvents ?? []).length, isHeroPaused]);

  return { heroIdx, setHeroIdx, isHeroPaused, setIsHeroPaused };
}
