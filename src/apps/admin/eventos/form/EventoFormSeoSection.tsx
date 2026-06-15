import { Sparkles } from "lucide-react";
import { INPUT_CLASS } from "./constants";
import type { UseEventoFormReturn } from "./useEventoForm";

interface Props {
  ctx: UseEventoFormReturn;
}

/** Subpainel "SEO & Instagram" preservado bit a bit. */
export default function EventoFormSeoSection({ ctx }: Props) {
  const { form, handleChange } = ctx;

  return (
    <div className="col-span-2 space-y-2 rounded-lg border border-border/30 bg-secondary/20 p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        <Sparkles className="h-3 w-3 text-primary" /> SEO & Instagram
        {typeof form.ai_confidence_score === "number" && (
          <span className="ml-auto rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary">
            IA {form.ai_confidence_score}%
          </span>
        )}
      </p>
      <div>
        <label className="text-[11px] font-medium text-muted-foreground">Meta título (SEO · ≤70)</label>
        <input
          className={INPUT_CLASS}
          maxLength={70}
          value={form.meta_title}
          onChange={(e) => handleChange("meta_title", e.target.value)}
          placeholder="Título p/ Google (gerado pela IA)"
        />
        <p className="text-[9px] text-muted-foreground/70 mt-0.5">{form.meta_title.length}/70</p>
      </div>
      <div>
        <label className="text-[11px] font-medium text-muted-foreground">Meta descrição (SEO · ≤165)</label>
        <textarea
          className={`${INPUT_CLASS} min-h-[44px]`}
          maxLength={165}
          value={form.meta_description}
          onChange={(e) => handleChange("meta_description", e.target.value)}
          placeholder="Resumo para resultados de busca"
        />
        <p className="text-[9px] text-muted-foreground/70 mt-0.5">{form.meta_description.length}/165</p>
      </div>
      <div>
        <label className="text-[11px] font-medium text-muted-foreground">Resumo curto (cards/lista)</label>
        <input
          className={INPUT_CLASS}
          value={form.short_summary}
          onChange={(e) => handleChange("short_summary", e.target.value)}
          placeholder="1 frase de impacto"
        />
      </div>
      <div>
        <label className="text-[11px] font-medium text-muted-foreground">Legenda Instagram</label>
        <textarea
          className={`${INPUT_CLASS} min-h-[80px]`}
          value={form.instagram_caption}
          onChange={(e) => handleChange("instagram_caption", e.target.value)}
          placeholder="Caption pronta p/ colar no IG (gerada pela IA)"
        />
      </div>
    </div>
  );
}
