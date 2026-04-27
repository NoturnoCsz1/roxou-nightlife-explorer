const REQUEST_WINDOW_MINUTES = 60;
const EVENT_ESTIMATED_DURATION_HOURS = 4;

export const RIDE_EXPIRED_MESSAGE = "A janela de solicitações para este evento expirou. Combine com antecedência para o próximo!";

export function getRideRequestDeadline(eventDate?: string | null) {
  if (!eventDate) return null;
  const start = new Date(eventDate);
  if (Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() + REQUEST_WINDOW_MINUTES * 60 * 1000);
}

export function getRideEstimatedEnd(eventDate?: string | null) {
  if (!eventDate) return null;
  const start = new Date(eventDate);
  if (Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() + EVENT_ESTIMATED_DURATION_HOURS * 60 * 60 * 1000);
}

export function isRideWindowClosed(eventDate?: string | null, now = new Date()) {
  const deadline = getRideRequestDeadline(eventDate);
  return !!deadline && now > deadline;
}

export function getRideAvailabilityText(eventDate?: string | null, now = new Date()) {
  const deadline = getRideRequestDeadline(eventDate);
  if (!deadline) return "Disponível hoje";
  const diff = deadline.getTime() - now.getTime();
  if (diff <= 0) return "Sistema de carona encerrado";
  const minutes = Math.ceil(diff / 60000);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return `Disponível por mais ${hours}h${rest ? ` ${rest}min` : ""}`;
  }
  return `Disponível por mais ${minutes} min`;
}

export function isSameSaoPauloDate(a?: string | null, b?: string | null) {
  if (!a || !b) return true;
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
  return fmt.format(new Date(a)) === fmt.format(new Date(b));
}

export function toSaoPauloTimestamp(localDatetime: string) {
  if (!localDatetime) return null;
  return `${localDatetime.length === 16 ? `${localDatetime}:00` : localDatetime}-03:00`;
}