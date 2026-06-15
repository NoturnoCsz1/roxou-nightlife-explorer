import { Sparkles, X } from "lucide-react";
import type { GlobalAI } from "./types";

interface Props {
  data: GlobalAI;
  onClose: () => void;
}

/**
 * Painel "Diagnóstico IA da base" — equivalente ao `aiSyncPanel` solicitado.
 * É renderizado quando o admin dispara `analyzeBase` (edge `ai-audit-establishments`
 * em modo global). Apenas exibição.
 */
export function EstabelecimentosAuraSyncPanel({ data, onClose }: Props) {
  return (
    <div className="rounded-xl border border-primary/40 bg-gradient-to-br from-primary/10 to-card p-3 space-y-2 relative">
      <button onClick={onClose} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold">Diagnóstico IA da base</h2>
      </div>
      <p className="text-xs text-foreground/90">{data.summary}</p>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div><span className="text-muted-foreground">Total:</span> <b>{data.total}</b></div>
        <div><span className="text-muted-foreground">Com erro:</span> <b className="text-destructive">{data.with_errors}</b></div>
      </div>
      {data.top_problems?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Principais problemas</p>
          <ul className="text-xs space-y-0.5 list-disc list-inside">
            {data.top_problems.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      )}
      {data.fix_priority?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Corrigir primeiro</p>
          <div className="flex flex-wrap gap-1">
            {data.fix_priority.slice(0, 12).map((p, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">{p}</span>
            ))}
          </div>
        </div>
      )}
      {data.oficial_candidates?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Candidatos a Oficial Roxou</p>
          <div className="flex flex-wrap gap-1">
            {data.oficial_candidates.map((p, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary">{p}</span>
            ))}
          </div>
        </div>
      )}
      {data.high_traffic_bad_data?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Muitos eventos + dados ruins</p>
          <div className="flex flex-wrap gap-1">
            {data.high_traffic_bad_data.map((p, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">{p}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
