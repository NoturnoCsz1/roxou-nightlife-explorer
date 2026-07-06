// Classificador semântico de horário de eventos (Onda 4).
// Pure function — não toca banco, prompts, edge functions ou publicação.
//
// Estados:
//   - "confirmed" → hora veio do flyer e é confiável.
//   - "suggested" → hora aplicada por padrão do lote (batch defaults) OU
//                   por fallback futuro do funcionamento do parceiro (a
//                   coluna `partners.opening_hours` ainda não existe no
//                   schema — fallback real fica bloqueado até então).
//   - "unknown"   → sem hora confiável; exige confirmação manual.

export type EventTimeStatus = "confirmed" | "suggested" | "unknown";
export type EventTimeSource = "flyer" | "batch" | "partner" | "manual" | "unknown";

export interface TimeStatusInput {
  date_time?: string | null;
  time_is_unknown?: boolean | null;
  timeSource?: EventTimeSource;
}

/**
 * True quando `date_time` contém uma hora efetiva (HH:mm) diferente de 00:00.
 * O bulk usa 00:00 como sentinela de "sem hora" quando `time_is_unknown` é true.
 */
export function hasRealTime(dateTime: string | null | undefined): boolean {
  const s = (dateTime || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return false;
  const hhmm = s.slice(11, 16);
  return hhmm !== "00:00";
}

export function classifyTimeStatus(input: TimeStatusInput): EventTimeStatus {
  const timeIsUnknown = input.time_is_unknown === true;
  const real = hasRealTime(input.date_time);
  if (timeIsUnknown || !real) return "unknown";
  if (input.timeSource === "batch" || input.timeSource === "partner") return "suggested";
  return "confirmed";
}

export function timeStatusBadge(status: EventTimeStatus): {
  emoji: string;
  label: string;
  tone: "success" | "warning" | "neutral";
} {
  switch (status) {
    case "confirmed":
      return { emoji: "⏰", label: "Horário confirmado", tone: "success" };
    case "suggested":
      return { emoji: "⏰", label: "Horário sugerido — confirmar", tone: "warning" };
    case "unknown":
    default:
      return { emoji: "⏰", label: "Sem horário — a confirmar", tone: "neutral" };
  }
}
