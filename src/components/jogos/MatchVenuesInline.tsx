import { useState } from "react";
import { ChevronDown, Tv } from "lucide-react";
import MatchVenuesQuickList, { type QuickBar } from "./MatchVenuesQuickList";

interface Props {
  bars: QuickBar[];
  count?: number;
}

/**
 * Linha compacta "X bares cadastrados transmitem este jogo · Ver bares".
 * Substitui a renderização permanente de MatchVenuesQuickList abaixo de cada card.
 */
export default function MatchVenuesInline({ bars, count }: Props) {
  const [open, setOpen] = useState(false);
  const n = count ?? bars.length;
  if (n <= 0) return null;
  return (
    <div className="mt-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-left"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2 text-[12px] font-bold text-emerald-200">
          <Tv className="h-3.5 w-3.5" />
          {n} {n === 1 ? "bar cadastrado transmite este jogo" : "bares cadastrados transmitem este jogo"}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-emerald-300">
          {open ? "Ocultar" : "Ver bares"}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="mt-2">
          <MatchVenuesQuickList bars={bars} limit={Math.max(3, Math.min(6, bars.length))} title="Onde assistir" />
        </div>
      )}
    </div>
  );
}
