// Wrapper de classificação de erros das Edge Functions de IA.
// Não altera prompts, banco, edge functions ou concorrência — apenas
// interpreta o retorno de `supabase.functions.invoke` para permitir que a
// UI reaja de forma robusta a 402 (créditos esgotados), 429 (rate limit),
// falhas de rede e erros desconhecidos, sem quebrar a tela.

/* eslint-disable @typescript-eslint/no-explicit-any */

export type AiErrorKind = "credits" | "rate_limit" | "network" | "unknown";

export interface ClassifiedAiError {
  kind: AiErrorKind;
  status?: number;
  message: string;
  /** Se true, faz sentido abortar o restante do lote (créditos/rate-limit). */
  fatalForBulk: boolean;
}

export async function classifyAiError(
  error: unknown,
  data?: unknown
): Promise<ClassifiedAiError> {
  const d = (data ?? {}) as Record<string, unknown>;
  let status: number | undefined =
    typeof d.status === "number"
      ? (d.status as number)
      : typeof d.code === "number"
        ? (d.code as number)
        : undefined;

  let bodyText = "";
  const err = error as any;
  if (err?.context && typeof err.context === "object") {
    if (typeof err.context.status === "number") status = status ?? err.context.status;
    try {
      const cloned = err.context.clone?.();
      if (cloned) {
        const parsed = await cloned.json().catch(() => null);
        if (parsed && typeof parsed === "object") {
          bodyText =
            (parsed.error as string) ||
            (parsed.message as string) ||
            JSON.stringify(parsed);
        } else {
          bodyText = await err.context.clone?.().text?.().catch(() => "");
        }
      }
    } catch {
      // ignore body parsing failure
    }
  }

  const msg = (
    bodyText ||
    (typeof d.error === "string" ? d.error : "") ||
    err?.message ||
    ""
  )
    .toString()
    .trim();

  if (status === 402 || /credit|crédito|payment required|insufficient/i.test(msg)) {
    return {
      kind: "credits",
      status,
      message: "Créditos de IA esgotados. Recarregue em Settings → Plans & credits.",
      fatalForBulk: true,
    };
  }
  if (status === 429 || /rate.?limit|too many requests/i.test(msg)) {
    return {
      kind: "rate_limit",
      status,
      message: "Limite de requisições à IA atingido. Aguarde alguns instantes.",
      fatalForBulk: true,
    };
  }
  if (err instanceof TypeError || /network|failed to fetch|fetch failed/i.test(msg)) {
    return {
      kind: "network",
      status,
      message: "Falha de rede ao chamar a IA. Tente novamente.",
      fatalForBulk: false,
    };
  }
  return {
    kind: "unknown",
    status,
    message: msg || "Falha inesperada da IA.",
    fatalForBulk: false,
  };
}
