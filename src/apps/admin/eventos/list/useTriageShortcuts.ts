// Hook que registra os atalhos de teclado do Modo Revisão (Fase 3B).
// Lógica copiada literalmente do useEffect original em EventosList.tsx.

/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { NavigateFunction } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { EventRow } from "./types";
import { getEventEditPath } from "./types";
import type { EventosListActions } from "./useEventosListActions";

interface TriageDeps {
  triageMode: boolean;
  focusedId: string | null;
  setFocusedId: Dispatch<SetStateAction<string | null>>;
  filtered: EventRow[];
  events: EventRow[];
  setEvents: Dispatch<SetStateAction<EventRow[]>>;
  navigate: NavigateFunction;
  actions: EventosListActions;
  // Manter a mesma lista de deps do hook original para preservar o
  // comportamento do efeito (re-registra quando filtros mudam):
  search: string;
  activeCategory: string | null;
  activeStatus: string | null;
  activePartner: string;
  activeDateFilter: string;
  onlyIncomplete: boolean;
  onlyNeedsReview: boolean;
  originFilter: string;
  extraFilter: string;
}

export function useTriageShortcuts(deps: TriageDeps) {
  const {
    triageMode,
    focusedId,
    setFocusedId,
    filtered,
    events,
    setEvents,
    navigate,
    actions,
  } = deps;

  useEffect(() => {
    if (!triageMode) return;
    const handler = (ev: KeyboardEvent) => {
      const tag = (ev.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;

      // Triage works across ALL filtered events (drafts, published, archived…)
      const list = filtered;
      if (list.length === 0) return;
      const currentIdx = focusedId ? list.findIndex((x) => x.id === focusedId) : -1;
      const idx = currentIdx >= 0 ? currentIdx : 0;
      const cur = list[idx];
      const k = ev.key.toLowerCase();

      if (k === "arrowright") {
        ev.preventDefault();
        const next = list[Math.min(idx + 1, list.length - 1)];
        if (next) setFocusedId(next.id);
      } else if (k === "arrowleft") {
        ev.preventDefault();
        const prev = list[Math.max(idx - 1, 0)];
        if (prev) setFocusedId(prev.id);
      } else if (k === "a" && cur) {
        ev.preventDefault();
        if (cur.status === "published") {
          toast.info("Já publicado");
          return;
        }
        actions.handleQuickApprove(cur);
      } else if (k === "d" && cur) {
        ev.preventDefault();
        // Toggle destaque mesmo em publicados
        if (cur.status === "published") {
          supabase
            .from("events")
            .update({ featured: !cur.featured })
            .eq("id", cur.id)
            .then(({ error }) => {
              if (error) {
                toast.error("Falha ao alternar destaque");
                return;
              }
              setEvents((prev) =>
                prev.map((x) => (x.id === cur.id ? { ...x, featured: !cur.featured } : x))
              );
              toast.success(cur.featured ? "Destaque removido" : "🔥 Destaque ativado");
            });
        } else {
          actions.handleQuickApprove(cur, { featured: true });
        }
      } else if (k === "u" && cur) {
        ev.preventDefault();
        if (cur.status === "published") {
          supabase
            .from("events")
            .update({ aura_pick: !cur.aura_pick })
            .eq("id", cur.id)
            .then(({ error }) => {
              if (error) {
                toast.error("Falha ao alternar Aura");
                return;
              }
              setEvents((prev) =>
                prev.map((x) => (x.id === cur.id ? { ...x, aura_pick: !cur.aura_pick } : x))
              );
              toast.success(cur.aura_pick ? "Aura Pick removido" : "🤖 Aura Pick");
            });
        } else {
          actions.handleQuickApprove(cur, { auraPick: true });
        }
      } else if (k === "x" && cur) {
        ev.preventDefault();
        actions.handleArchive(cur);
      } else if (k === "r" && cur) {
        ev.preventDefault();
        navigate(getEventEditPath(cur.id));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    deps.triageMode,
    deps.focusedId,
    deps.events,
    deps.search,
    deps.activeCategory,
    deps.activeStatus,
    deps.activePartner,
    deps.activeDateFilter,
    deps.onlyIncomplete,
    deps.onlyNeedsReview,
    deps.originFilter,
    deps.extraFilter,
  ]);
}
