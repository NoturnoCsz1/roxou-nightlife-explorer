/**
 * bulkEventsClassify — HOTFIX Eventos em Lote
 *
 * Classifica um flyer/evento em relação ao "hoje" em SP:
 *
 *   • "future"    → data ≥ início do dia atual em SP (evento válido/atual)
 *   • "past"      → data < início do dia atual em SP e diferença ≥ 12h
 *                   (garante que não arquiva evento que rola essa madrugada)
 *   • "ambiguous" → data no passado mas há < 12h de diferença
 *                   (madrugada, transição de dia, timezone borderline)
 *   • "unknown"   → sem data ou string inválida
 *
 * Regra do hotfix:
 *   - "past" pode ser arquivado automaticamente.
 *   - "ambiguous" e "unknown" NUNCA são arquivados sozinhos — vão para
 *     "Precisa revisão" e o admin decide.
 *
 * Não altera Supabase, não altera edge functions, não altera UI global —
 * apenas produz labels usados pelo EventoBulkForm.
 */
import { getStartOfTodaySP } from "@/lib/dateUtils";

export type BulkEventPastness = "future" | "past" | "ambiguous" | "unknown";

const AMBIGUOUS_WINDOW_MS = 12 * 60 * 60 * 1000; // 12h

/** Aceita `datetime-local` ("YYYY-MM-DDTHH:MM") ou ISO. */
function parseDateFlexible(value: string | null | undefined): Date | null {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  // datetime-local: assume horário SP (o form usa esse padrão)
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
  if (m) {
    // Constrói ISO com offset SP (-03:00) para comparação estável.
    const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00-03:00`;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function classifyBulkItemDate(
  dateInput: string | null | undefined,
): BulkEventPastness {
  const d = parseDateFlexible(dateInput);
  if (!d) return "unknown";
  const startOfTodaySP = new Date(getStartOfTodaySP()).getTime();
  const dt = d.getTime();
  if (dt >= startOfTodaySP) return "future";
  if (startOfTodaySP - dt < AMBIGUOUS_WINDOW_MS) return "ambiguous";
  return "past";
}

/** Se o evento é seguramente passado (não ambíguo). */
export function isSurelyPastSP(dateInput: string | null | undefined): boolean {
  return classifyBulkItemDate(dateInput) === "past";
}
