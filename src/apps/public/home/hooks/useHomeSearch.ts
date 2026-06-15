// ─── useHomeSearch — filtros locais (categoria + vibe) ───
// Extraído de src/pages/v3/V3Home.tsx (Fase 5). Comportamento idêntico.

import { useMemo, useState } from "react";
import type { Ev } from "../types";
import { safeEvents } from "../utils";

export function useHomeSearch(events: Ev[], trendingIds: { id: string; views: number }[]) {
  const [catFilter, setCatFilter] = useState("");
  const [vibeFilter, setVibeFilter] = useState("");

  const filtered = useMemo(
    () => (catFilter ? safeEvents(events).filter(e => e.category === catFilter) : []),
    [events, catFilter],
  );

  const vibeFiltered = useMemo(() => {
    const list = safeEvents(events);
    const trendSet = new Set((trendingIds ?? []).map(t => t.id));
    const musicSubs = new Set(["show", "sertanejo", "rock", "pagode", "mpb", "pop_rock", "samba"]);
    if (vibeFilter === "bombando") return list.filter(e => trendSet.has(e.id));
    if (vibeFilter === "musica") return list.filter(e => e.category === "show" || musicSubs.has(e.sub_category || ""));
    if (vibeFilter === "happy") return list.filter(e => ["bar", "gastrobar", "restaurante"].includes(e.category));
    if (vibeFilter === "grandes") return list.filter(e => ["festival", "festa"].includes(e.category));
    return [];
  }, [events, trendingIds, vibeFilter]);

  return { catFilter, setCatFilter, vibeFilter, setVibeFilter, filtered, vibeFiltered };
}
