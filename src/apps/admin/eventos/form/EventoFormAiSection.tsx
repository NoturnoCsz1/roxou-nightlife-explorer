/* eslint-disable @typescript-eslint/no-explicit-any -- preservado do original EventoForm.tsx (Fase 3C1) */
import { Loader2, Sparkles } from "lucide-react";
import { INPUT_CLASS } from "./types";
import type { UseEventoFormReturn } from "./useEventoForm";

interface Props {
  ctx: UseEventoFormReturn;
}

/**
 * Bloco "Descrição + Gerar Hype + ai_warnings".
 * Mantém o markup exato do original (parte do antigo "Conteúdo do Evento").
 */
export default function EventoFormAiSection({ ctx }: Props) {
  const { form, handleChange, generatingDesc, generateDescription } = ctx;

  return (
    <div className="col-span-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium text-muted-foreground">Descrição</label>
        <button
          type="button"
          disabled={generatingDesc || !form.title}
          onClick={() =>
            generateDescription({
              title: form.title,
              venue_name: form.venue_name,
              address: form.address,
              date_time: form.date_time,
              category: form.category,
              sub_category: (form as any)._sub,
              partner_id: form.partner_id || undefined,
              time_is_unknown: Boolean((form as any).time_is_unknown),
            })
          }
          className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:text-primary/80 transition disabled:opacity-50"
        >
          {generatingDesc ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {generatingDesc ? "Injetando hype..." : "✨ Gerar Hype"}
        </button>
      </div>
      <textarea
        className={`${INPUT_CLASS} min-h-[60px]`}
        value={form.description}
        onChange={(e) => handleChange("description", e.target.value)}
        placeholder={generatingDesc ? "Injetando hype..." : "Aguardando o toque da IA..."}
      />
      {form.ai_warnings && form.ai_warnings.length > 0 && (
        <div className="mt-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-[10px] text-amber-300">
          <strong className="uppercase tracking-wide">⚠ Avisos da IA ({form.ai_warnings.length})</strong>
          <ul className="mt-0.5 list-disc pl-4 space-y-0.5">
            {form.ai_warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
