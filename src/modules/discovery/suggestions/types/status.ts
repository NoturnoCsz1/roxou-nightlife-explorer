/**
 * Status canônico de uma sugestão no Suggestion Engine.
 *
 * pending  — aguardando revisão humana (Admin).
 * approved — aprovada e pronta para materialização em produção.
 * rejected — rejeitada explicitamente por humano.
 * expired  — expirou por TTL sem aprovação.
 */
export type SuggestionStatus = "pending" | "approved" | "rejected" | "expired";

export const SUGGESTION_STATUSES: readonly SuggestionStatus[] = [
  "pending",
  "approved",
  "rejected",
  "expired",
] as const;
