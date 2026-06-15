import { Link } from "react-router-dom";
import {
  Ban, Edit2, Instagram as InstagramIcon, MapPin, ShieldCheck, Sparkles, Star, X,
} from "lucide-react";
import type { Establishment, SingleAI, Status } from "./types";

interface Props {
  e: Establishment;
  r: SingleAI;
  onClose: () => void;
  onGenerateCoordinates: () => void;
  onValidateInstagram: () => void;
  onSetStatus: (s: Status) => void;
}

export function EstabelecimentosAiAnalysisPanel({
  e, r, onClose, onGenerateCoordinates, onValidateInstagram, onSetStatus,
}: Props) {
  const riskCls = r.risk === "alto" ? "bg-destructive/15 text-destructive border-destructive/40"
    : r.risk === "medio" ? "bg-amber-500/15 text-amber-400 border-amber-500/40"
    : "bg-green-500/15 text-green-400 border-green-500/40";
  return (
    <div className={`mt-2 rounded-lg border ${riskCls.split(" ").slice(-1)} bg-card p-2.5 space-y-1.5 relative`}>
      <button onClick={onClose} className="absolute top-1.5 right-1.5 text-muted-foreground hover:text-foreground">
        <X className="h-3 w-3" />
      </button>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Sparkles className="h-3 w-3 text-primary" />
        <span className="text-[10px] font-bold uppercase tracking-wide">Diagnóstico IA</span>
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${riskCls}`}>Risco {r.risk}</span>
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-secondary/60">Prioridade {r.priority}</span>
        {r.oficial_candidate && (
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-primary/15 text-primary inline-flex items-center gap-0.5">
            <ShieldCheck className="h-2.5 w-2.5" />Candidato Oficial
          </span>
        )}
      </div>
      <p className="text-[11px] text-foreground/90">{r.summary}</p>
      {r.problems?.length > 0 && (
        <ul className="text-[10px] space-y-0.5 list-disc list-inside text-amber-400">
          {r.problems.map((p, i) => <li key={i} className="text-foreground/80"><span className="text-amber-400">•</span> {p}</li>)}
        </ul>
      )}
      {r.suggestions?.length > 0 && (
        <ul className="text-[10px] space-y-0.5 list-disc list-inside text-primary">
          {r.suggestions.map((s, i) => <li key={i} className="text-foreground/80">{s}</li>)}
        </ul>
      )}
      {r.recommended_actions?.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {r.recommended_actions.includes("geocode") && (
            <button onClick={onGenerateCoordinates} className="text-[10px] px-2 py-0.5 rounded bg-secondary/60 hover:bg-secondary inline-flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5" />Geocodificar
            </button>
          )}
          {r.recommended_actions.includes("validate_instagram") && (
            <button onClick={onValidateInstagram} className="text-[10px] px-2 py-0.5 rounded bg-secondary/60 hover:bg-secondary inline-flex items-center gap-1">
              <InstagramIcon className="h-2.5 w-2.5" />Validar IG
            </button>
          )}
          {r.recommended_actions.includes("set_ativo") && (
            <button onClick={() => onSetStatus("ativo")} className="text-[10px] px-2 py-0.5 rounded bg-green-500/15 text-green-400 hover:bg-green-500/25">Marcar Ativo</button>
          )}
          {r.recommended_actions.includes("set_destaque") && (
            <button onClick={() => onSetStatus("destaque")} className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 inline-flex items-center gap-1">
              <Star className="h-2.5 w-2.5" />Destaque
            </button>
          )}
          {r.recommended_actions.includes("set_oficial") && (
            <button onClick={() => onSetStatus("oficial")} className="text-[10px] px-2 py-0.5 rounded bg-primary/15 text-primary hover:bg-primary/25 inline-flex items-center gap-1">
              <ShieldCheck className="h-2.5 w-2.5" />Oficial Roxou
            </button>
          )}
          {r.recommended_actions.includes("set_bloqueado") && (
            <button onClick={() => onSetStatus("bloqueado")} className="text-[10px] px-2 py-0.5 rounded bg-destructive/15 text-destructive hover:bg-destructive/25 inline-flex items-center gap-1">
              <Ban className="h-2.5 w-2.5" />Bloquear
            </button>
          )}
          {r.recommended_actions.includes("edit") && (
            <Link to={`/admin/parceiros/${e.id}/editar`} className="text-[10px] px-2 py-0.5 rounded bg-secondary/60 hover:bg-secondary inline-flex items-center gap-1">
              <Edit2 className="h-2.5 w-2.5" />Editar
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
