/**
 * AIConfidenceBadges — badges visuais discretos de qualidade IA.
 *
 * Apenas leitura: não altera dados, queries ou lógica funcional.
 * Usa campos já carregados em memória pelo admin.
 */

interface AIBadgesProps {
  ai_confidence?: string | null;
  needs_review?: boolean | null;
  duplicate_score?: number | null;
  category_override_reason?: string | null;
  admin_feedback_applied?: boolean | null;
  className?: string;
}

const baseCls =
  "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 border";

export function AIConfidenceBadge({
  ai_confidence,
  needs_review,
  category_override_reason,
}: Pick<AIBadgesProps, "ai_confidence" | "needs_review" | "category_override_reason">) {
  if (!ai_confidence && !needs_review) return null;

  const conf = (ai_confidence || "").toLowerCase();
  const tooltip = category_override_reason
    ? `Confiança IA: ${conf || "—"}\nMotivo: ${category_override_reason}`
    : `Confiança IA: ${conf || "—"}`;

  if (conf === "low" || needs_review) {
    return (
      <span title={tooltip} className={`${baseCls} bg-red-500/10 text-red-400 border-red-500/30`}>
        🔴 Revisão IA
      </span>
    );
  }
  if (conf === "medium") {
    return (
      <span title={tooltip} className={`${baseCls} bg-yellow-400/10 text-yellow-300 border-yellow-400/30`}>
        🟡 Revisar
      </span>
    );
  }
  if (conf === "high") {
    return (
      <span title={tooltip} className={`${baseCls} bg-green-500/10 text-green-400 border-green-500/30`}>
        🟢 IA Alta
      </span>
    );
  }
  return null;
}

export function DuplicateScoreBadge({ duplicate_score }: Pick<AIBadgesProps, "duplicate_score">) {
  if (typeof duplicate_score !== "number" || duplicate_score < 70) return null;
  if (duplicate_score >= 90) {
    return (
      <span
        title={`Duplicate score: ${duplicate_score}/100`}
        className={`${baseCls} bg-red-500/15 text-red-400 border-red-500/40`}
      >
        🚨 Duplicado provável
      </span>
    );
  }
  return (
    <span
      title={`Duplicate score: ${duplicate_score}/100`}
      className={`${baseCls} bg-orange-500/10 text-orange-300 border-orange-500/30`}
    >
      🚨 Possível duplicado
    </span>
  );
}

export function AdminFeedbackBadge({ admin_feedback_applied }: Pick<AIBadgesProps, "admin_feedback_applied">) {
  if (!admin_feedback_applied) return null;
  return (
    <span
      title="Feedback do admin já aplicado nesta peça"
      className={`${baseCls} bg-primary/10 text-primary border-primary/30`}
    >
      ✓ Feedback aplicado
    </span>
  );
}

export default function AIConfidenceBadges(props: AIBadgesProps) {
  return (
    <span className={`inline-flex items-center gap-1 flex-wrap ${props.className || ""}`}>
      <AIConfidenceBadge
        ai_confidence={props.ai_confidence}
        needs_review={props.needs_review}
        category_override_reason={props.category_override_reason}
      />
      <DuplicateScoreBadge duplicate_score={props.duplicate_score} />
      <AdminFeedbackBadge admin_feedback_applied={props.admin_feedback_applied} />
    </span>
  );
}
