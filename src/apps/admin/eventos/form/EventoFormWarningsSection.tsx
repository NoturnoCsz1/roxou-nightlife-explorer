import { AlertTriangle } from "lucide-react";
import type { UseEventoFormReturn } from "./useEventoForm";

interface Props {
  ctx: UseEventoFormReturn;
}

/** Banner "evento já postado" preservado dentro do bloco de Mídia. */
export default function EventoFormWarningsSection({ ctx }: Props) {
  const { duplicateCandidate, navigate, setAllowDuplicate } = ctx;
  if (!duplicateCandidate) return null;
  return (
    <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-3 text-xs text-yellow-100 space-y-2">
      <p className="font-bold flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5" /> ⚠️ Este evento já foi postado.
      </p>
      <p className="text-muted-foreground">
        {duplicateCandidate.title} • {duplicateCandidate.venue_name || "Sem local"}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => navigate(`/admin/eventos/${duplicateCandidate.id}`)}
          className="rounded-lg bg-primary px-3 py-1.5 text-[10px] font-bold text-primary-foreground"
        >
          Editar existente
        </button>
        <button
          type="button"
          onClick={() => setAllowDuplicate(true)}
          className="rounded-lg bg-secondary px-3 py-1.5 text-[10px] font-bold text-secondary-foreground"
        >
          Criar duplicado
        </button>
      </div>
    </div>
  );
}
