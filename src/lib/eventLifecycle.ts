/**
 * Helpers centralizados de ciclo de vida do evento (passado / arquivado /
 * operacional). Usa apenas campos já existentes na tabela `events`:
 * `date_time`, `status`. Sem migrations.
 *
 * Regra do "passado" usa uma janela de 1h após o início para que o card
 * continue visível enquanto o evento está rolando.
 */

const PAST_GRACE_MS = 60 * 60 * 1000; // 1h
const AUTO_ARCHIVE_DAYS = 30;
const DEEP_ARCHIVE_DAYS = 180;
const DAY_MS = 24 * 60 * 60 * 1000;

interface LifecycleEvent {
  date_time?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
  completed_at?: string | null;
  archived_at?: string | null;
}

function readTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

/** Timestamp considerado como "fim" do evento (end_date | date_time). */
function getEffectiveEndTime(e: LifecycleEvent): number | null {
  return readTime(e.end_date) ?? readTime(e.date_time) ?? readTime(e.start_date);
}

export function isPastEvent(e: LifecycleEvent | null | undefined, now = Date.now()): boolean {
  if (!e) return false;
  if (e.status === "completed") return true;
  const endTime = readTime(e.end_date);
  if (endTime != null && endTime < now) return true;
  const startTime = readTime(e.date_time) ?? readTime(e.start_date);
  if (startTime != null && startTime < now - PAST_GRACE_MS) return true;
  return false;
}

export function isArchivedEvent(e: LifecycleEvent | null | undefined, now = Date.now()): boolean {
  if (!e) return false;
  if (e.status === "archived") return true;
  if (readTime(e.archived_at) != null) return true;
  const endTime = getEffectiveEndTime(e);
  if (endTime != null && now - endTime > AUTO_ARCHIVE_DAYS * DAY_MS) return true;
  return false;
}

/**
 * Eventos visíveis em áreas operacionais (Dashboard, Hoje, Próximos, KPIs).
 * Exclui passados e arquivados.
 */
export function isOperationalEvent(e: LifecycleEvent | null | undefined, now = Date.now()): boolean {
  if (!e) return false;
  if (e.status === "archived") return false;
  if (isPastEvent(e, now)) return false;
  return true;
}

/** Idade em dias desde o fim do evento. Retorna null se ainda não terminou. */
export function getEventArchiveAge(
  e: LifecycleEvent | null | undefined,
  now = Date.now()
): number | null {
  if (!e) return null;
  const endTime = getEffectiveEndTime(e);
  if (endTime == null) return null;
  const diff = now - endTime;
  if (diff <= 0) return null;
  return Math.floor(diff / DAY_MS);
}

/**
 * Verdadeiro para eventos com mais de 180 dias após o fim — só devem aparecer
 * quando o usuário ativar "Mostrar todos os arquivados".
 */
export function isDeepArchived(e: LifecycleEvent | null | undefined, now = Date.now()): boolean {
  const age = getEventArchiveAge(e, now);
  return age != null && age > DEEP_ARCHIVE_DAYS;
}

/** Formata "Encerrado em DD/MM/YYYY" no fuso SP. */
export function formatArchivedLabel(e: LifecycleEvent | null | undefined): string | null {
  if (!e) return null;
  const endTime = getEffectiveEndTime(e);
  if (endTime == null) return null;
  if (endTime > Date.now()) return null;
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(endTime));
  return `Encerrado em ${formatted}`;
}
