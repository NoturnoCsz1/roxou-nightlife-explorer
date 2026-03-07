const TZ = "America/Sao_Paulo";

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
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getDateStr(date) === getDateStr(tomorrow);
};
