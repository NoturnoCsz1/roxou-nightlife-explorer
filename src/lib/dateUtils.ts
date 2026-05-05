const TZ = "America/Sao_Paulo";

/**
 * Convert a "datetime-local" string (e.g. "2026-05-15T22:00") into an
 * ISO timestamp anchored to São Paulo (-03:00), regardless of the browser TZ.
 * This is the ONLY safe way to persist admin-entered local times.
 */
export const spLocalToISO = (localDateTime: string): string => {
  if (!localDateTime) return "";
  const trimmed = localDateTime.length === 16 ? `${localDateTime}:00` : localDateTime;
  return `${trimmed}-03:00`;
};

/**
 * Convert a stored ISO timestamp into the "datetime-local" string that
 * represents the same wall-clock time in São Paulo.
 */
export const isoToSpLocal = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
    timeZone: TZ, hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
};

/** Format time as HH:mm in São Paulo timezone */
export const formatTime = (date: Date) =>
  date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });

/** Format short date like "07 mar." in São Paulo timezone */
export const formatDateShort = (date: Date) =>
  date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: TZ });

/** Format full date like "sexta-feira, 07 de março de 2026" */
export const formatDateFull = (date: Date) =>
  date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: TZ });

/** Format day number */
export const formatDay = (date: Date) =>
  date.toLocaleDateString("pt-BR", { day: "2-digit", timeZone: TZ });

/** Format short month uppercase */
export const formatMonthShort = (date: Date) =>
  date.toLocaleDateString("pt-BR", { month: "short", timeZone: TZ }).replace(".", "").toUpperCase();

/** Format readable date for headers */
export const formatDateHeader = (date: Date) =>
  date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });

/** Get today's date string in São Paulo timezone for comparisons */
export const getTodayStr = () => {
  const now = new Date();
  return now.toLocaleDateString("pt-BR", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: TZ });
};

/** Get a date's string in São Paulo timezone for comparisons */
export const getDateStr = (date: Date) =>
  date.toLocaleDateString("pt-BR", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: TZ });

/** Check if a date is today in São Paulo timezone */
export const isToday = (date: Date) => getDateStr(date) === getTodayStr();

/** Check if a date is tomorrow in São Paulo timezone */
export const isTomorrow = (date: Date) => {
  // Add 24h to "now" — comparison is then done via SP-formatted strings,
  // which is independent of the browser's local timezone.
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return getDateStr(date) === getDateStr(tomorrow);
};
