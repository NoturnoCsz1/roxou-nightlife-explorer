/* eslint-disable @typescript-eslint/no-explicit-any -- setters genéricos preservam UX original */
import { Search } from "lucide-react";
import type { OrderBy, QualityFilter, Status } from "./types";
import { STATUS_META } from "./types";

interface Props {
  search: string; setSearch: (v: string) => void;
  statusFilter: "" | Status; setStatusFilter: (v: any) => void;
  cityF: string; setCityF: (v: string) => void;
  categoryF: string; setCategoryF: (v: string) => void;
  orderBy: OrderBy; setOrderBy: (v: OrderBy) => void;
  errorsOnly: boolean; setErrorsOnly: (v: boolean) => void;
  noCoordsOnly: boolean; setNoCoordsOnly: (v: boolean) => void;
  qualityFilter: QualityFilter; setQualityFilter: (v: QualityFilter) => void;
  cities: string[];
  categories: string[];
}

export function EstabelecimentosAuditFilters(p: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-card px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={p.search}
          onChange={e => p.setSearch(e.target.value)}
          placeholder="Buscar por nome ou slug..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(["", "draft", "ativo", "destaque", "oficial", "bloqueado"] as const).map(s => (
          <button
            key={s || "all"}
            onClick={() => p.setStatusFilter(s as any)}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
              p.statusFilter === s ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
            }`}
          >
            {s === "" ? "Todos" : STATUS_META[s as Status].label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <select value={p.cityF} onChange={e => p.setCityF(e.target.value)} className="rounded-lg border border-border/40 bg-card px-2 py-1 text-xs">
          <option value="">Todas as cidades</option>
          {p.cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={p.categoryF} onChange={e => p.setCategoryF(e.target.value)} className="rounded-lg border border-border/40 bg-card px-2 py-1 text-xs">
          <option value="">Todas categorias</option>
          {p.categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={p.orderBy} onChange={e => p.setOrderBy(e.target.value as OrderBy)} className="rounded-lg border border-border/40 bg-card px-2 py-1 text-xs">
          <option value="recent">Recentes</option>
          <option value="events_desc">Mais eventos</option>
          <option value="events_asc">Sem eventos</option>
          <option value="score_asc">Score: pior → melhor</option>
          <option value="score_desc">Score: melhor → pior</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={p.errorsOnly} onChange={e => p.setErrorsOnly(e.target.checked)} />
          Apenas com erro
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={p.noCoordsOnly} onChange={e => p.setNoCoordsOnly(e.target.checked)} />
          Somente sem coordenadas
        </label>
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1">
        {([
          { k: "all",              label: "Todos" },
          { k: "needs_attention",  label: "⚠️ Precisa atenção" },
          { k: "no_coords",        label: "Sem coordenadas" },
          { k: "no_instagram",     label: "Sem Instagram" },
          { k: "no_description",   label: "Sem descrição" },
          { k: "no_music_style",   label: "Sem estilo musical" },
          { k: "no_logo",          label: "Sem logo" },
          { k: "ready_to_feature", label: "✨ Pronto para destaque" },
        ] as { k: QualityFilter; label: string }[]).map(({ k, label }) => (
          <button
            key={k}
            onClick={() => p.setQualityFilter(k)}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
              p.qualityFilter === k
                ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
                : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
