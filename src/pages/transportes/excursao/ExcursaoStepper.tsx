/**
 * Stepper compacto e mobile-first usado no fluxo público de excursões.
 */
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { EXCURSAO_STEPS, type ExcursaoStepKey } from "./excursaoFlow";

type Props = {
  slug: string;
  current: ExcursaoStepKey;
};

const stepPath = (slug: string, step: ExcursaoStepKey): string => {
  if (step === "detalhe") return `/transportes/excursoes/${slug}`;
  return `/transportes/excursoes/${slug}/${step}`;
};

export default function ExcursaoStepper({ slug, current }: Props) {
  const currentIdx = EXCURSAO_STEPS.findIndex((s) => s.key === current);
  return (
    <ol className="flex items-center gap-1 text-[10px] uppercase tracking-wide">
      {EXCURSAO_STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const canNavigate = done; // só permite voltar para etapas já feitas
        const className = `flex items-center gap-1 px-2 py-1 rounded-full border ${
          active
            ? "border-primary/60 bg-primary/15 text-primary"
            : done
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-border/40 text-muted-foreground"
        }`;
        const content = (
          <>
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-background/60 text-[10px] font-bold">
              {done ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span className="hidden xs:inline">{step.label}</span>
          </>
        );
        return (
          <li key={step.key} className="contents">
            {canNavigate ? (
              <Link to={stepPath(slug, step.key)} className={className}>
                {content}
              </Link>
            ) : (
              <span className={className}>{content}</span>
            )}
            {i < EXCURSAO_STEPS.length - 1 ? (
              <span className="text-muted-foreground/40">·</span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
