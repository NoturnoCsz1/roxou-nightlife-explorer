// Botão "Carregar mais" — paginação local de visibleCount (Fase 3B).

import type { EventosListCtx } from "./useEventosList";

export function EventosListPagination({ ctx }: { ctx: EventosListCtx }) {
  const { visibleCount, setVisibleCount, filtered } = ctx;
  if (visibleCount >= filtered.length) return null;
  return (
    <button
      onClick={() => setVisibleCount(visibleCount + 80)}
      className="mx-auto flex rounded-2xl border border-primary/30 bg-primary/10 px-5 py-2 text-xs font-black uppercase text-primary hover:bg-primary/20"
    >
      Carregar mais {Math.min(80, filtered.length - visibleCount)} eventos
    </button>
  );
}
