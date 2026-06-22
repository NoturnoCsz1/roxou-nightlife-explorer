/**
 * formatRelativeTime — formato humano compacto para durações.
 *
 * Aceita minutos (number) ou data (Date | string ISO) e devolve algo como:
 *   "agora", "5m", "1h", "1h 20m", "1d", "4d 19h".
 *
 * Sempre positivo: para "há X" / "em X" o chamador deve adicionar o prefixo.
 */

export type RelativeInput = number | string | Date;

const toMinutes = (input: RelativeInput, now: number = Date.now()): number => {
  if (typeof input === "number") return input;
  const d = typeof input === "string" ? new Date(input) : input;
  const ms = d.getTime() - now;
  return Math.round(ms / 60000);
};

export function formatRelativeTime(input: RelativeInput, now: number = Date.now()): string {
  const minsSigned = toMinutes(input, now);
  const mins = Math.abs(minsSigned);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}m`;
  if (mins < 60 * 24) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const days = Math.floor(mins / (60 * 24));
  const hours = Math.floor((mins % (60 * 24)) / 60);
  if (days < 7 && hours > 0) return `${days}d ${hours}h`;
  return `${days}d`;
}

/** Variante com prefixo "há" para datas no passado. */
export function formatTimeAgo(input: RelativeInput): string {
  const mins = Math.max(0, Math.round((Date.now() - (typeof input === "number" ? Date.now() - input * 60000 : new Date(input as string | Date).getTime())) / 60000));
  if (mins < 1) return "agora";
  return `há ${formatRelativeTime(mins)}`;
}

export default formatRelativeTime;
