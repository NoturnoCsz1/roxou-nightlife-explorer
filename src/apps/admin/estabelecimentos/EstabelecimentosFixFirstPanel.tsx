import { Link } from "react-router-dom";
import { Edit2, Flame } from "lucide-react";
import type { Establishment, QualityFilter, OrderBy } from "./types";
import { computeFlags, scoreTone } from "./scoring";

interface Props {
  fixFirst: { e: Establishment; score: number }[];
  setQualityFilter: (q: QualityFilter) => void;
  setOrderBy: (o: OrderBy) => void;
}

export function EstabelecimentosFixFirstPanel({ fixFirst, setQualityFilter, setOrderBy }: Props) {
  if (fixFirst.length === 0) return null;
  return (
    <div className="rounded-xl border border-destructive/30 bg-gradient-to-br from-destructive/10 via-card to-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Flame className="h-4 w-4 text-destructive" />
          <h2 className="text-sm font-bold">🔥 Corrigir primeiro</h2>
          <span className="text-[10px] text-muted-foreground">os {fixFirst.length} perfis com pior Score Roxou</span>
        </div>
        <button
          onClick={() => { setQualityFilter("needs_attention"); setOrderBy("score_asc"); }}
          className="text-[10px] font-semibold text-destructive hover:underline"
        >
          Ver todos com atenção →
        </button>
      </div>
      <div className="space-y-1.5">
        {fixFirst.map(({ e, score }) => {
          const tone = scoreTone(score);
          const flags = computeFlags(e);
          return (
            <div key={e.id} className="flex items-center gap-2 rounded-lg bg-card/80 border border-border/30 p-2">
              <div className={`flex items-center justify-center min-w-[42px] h-9 rounded-md border ${tone.cls} font-bold text-sm tabular-nums`}>
                {score}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold truncate">{e.name}</span>
                  <span className="text-[9px] text-muted-foreground">/{e.slug}</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 flex flex-wrap gap-1.5">
                  {!e.logo_url && <span className="text-amber-400">sem logo</span>}
                  {(e.latitude == null || e.longitude == null) && <span className="text-amber-400">sem coords</span>}
                  {!e.instagram && <span className="text-amber-400">sem instagram</span>}
                  {!e.description && <span className="text-amber-400">sem descrição</span>}
                  {!e.music_style_primary && <span className="text-amber-400">sem estilo</span>}
                  {!e.type && <span className="text-amber-400">sem categoria</span>}
                  {flags.length === 0 && score < 90 && <span className="text-muted-foreground">perfil incompleto</span>}
                </div>
              </div>
              <Link
                to={`/admin/parceiros/${e.id}/editar`}
                className="shrink-0 inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground hover:opacity-90"
              >
                <Edit2 className="h-2.5 w-2.5" /> Corrigir
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
