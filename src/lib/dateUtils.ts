// ATENÇÃO:
// Toda lógica de datas da Roxou/Hotshow deve usar America/Sao_Paulo.
// Não usar Date UTC diretamente para filtros de eventos.
// Alterar isso pode quebrar agenda, semana, hoje, amanhã e final de semana.

const TIMEZONE = "America/Sao_Paulo";
const TZ = TIMEZONE;
const SP_OFFSET = "-03:00"; // São Paulo não adota mais horário de verão

/* ============================================================
 * Núcleo: extrair partes de uma data já no fuso de São Paulo
 * ============================================================ */

/** Retorna { y, m, d, dow, hh, mm } da data informada, no fuso de SP. dow: 0=domingo..6=sábado */
const getSpParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    weekday: "short", hour12: false,
  }).formatToParts(date);
  const get = (t: string) => parts.find(p => p.type === t)?.value || "";
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    y: Number(get("year")),
    m: Number(get("month")),
    d: Number(get("day")),
    hh: Number(get("hour")),
    mm: Number(get("minute")),
    dow: weekdayMap[get("weekday")] ?? new Date(date).getUTCDay(),
  };
};

const ymdToISO = (y: number, m: number, d: number, time = "00:00:00") =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T${time}${SP_OFFSET}`;

/** Soma `days` a um YMD interpretando-o como dia civil em SP, retorna novo {y,m,d}. */
const addDaysSP = (y: number, m: number, d: number, days: number) => {
  // Cria um Date "âncora" às 12h SP daquele dia e soma dias em ms (longe das bordas DST).
  const anchor = new Date(`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}T12:00:00${SP_OFFSET}`);
  const next = new Date(anchor.getTime() + days * 24 * 60 * 60 * 1000);
  const p = getSpParts(next);
  return { y: p.y, m: p.m, d: p.d };
};

/* ============================================================
 * API oficial de datas (use estas funções em todo o projeto)
 * ============================================================ */

/**
 * Retorna o instante atual. O `Date` em si é um instante absoluto (UTC interno);
 * o que importa é que TODA leitura de "dia/mês/ano/hora" derivada dele passa por
 * `getSpParts()` ou pelos formatadores com `timeZone: "America/Sao_Paulo"`.
 *
 * NÃO usar `.getDay()`, `.getDate()`, `.setHours()` ou `.toISOString()` em cima
 * do retorno desta função para comparar dia civil — sempre via funções SP abaixo.
 */
export const getNowInSaoPaulo = () => new Date();

/** ISO do início do dia atual em SP. */
export const getStartOfTodaySP = () => {
  const { y, m, d } = getSpParts(new Date());
  return ymdToISO(y, m, d, "00:00:00");
};

/** ISO do fim do dia atual em SP (exclusivo: 00:00 do dia seguinte). */
export const getEndOfTodaySP = () => {
  const { y, m, d } = getSpParts(new Date());
  const t = addDaysSP(y, m, d, 1);
  return ymdToISO(t.y, t.m, t.d, "00:00:00");
};

/** ISO do fim do dia (exclusivo: 00:00 do dia seguinte) em SP, para a data informada. */
export const getEndOfDaySPFromDate = (value: string | Date): string => {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "";
  const { y, m, d: day } = getSpParts(d);
  const t = addDaysSP(y, m, day, 1);
  return ymdToISO(t.y, t.m, t.d, "00:00:00");
};

/** Formata um ISO/Date como data+hora em SP (pt-BR). */
export const formatDateTimeSP = (value: string | Date | null | undefined): string => {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: TZ,
  });
};

/** Intervalo [start, end) de amanhã em SP. */
export const getTomorrowRangeSP = () => {
  const { y, m, d } = getSpParts(new Date());
  const t1 = addDaysSP(y, m, d, 1);
  const t2 = addDaysSP(y, m, d, 2);
  return { start: ymdToISO(t1.y, t1.m, t1.d), end: ymdToISO(t2.y, t2.m, t2.d) };
};

/**
 * Intervalo [start, end) do próximo final de semana em SP.
 * Considera sábado e domingo. Se hoje for sábado ou domingo, retorna o FDS atual.
 */
export const getWeekendRangeSP = () => {
  const { y, m, d, dow } = getSpParts(new Date());
  // dow: 0=dom, 6=sáb
  let toSat: number;
  if (dow === 6) toSat = 0;
  else if (dow === 0) toSat = -1;
  else toSat = 6 - dow;
  const sat = addDaysSP(y, m, d, toSat);
  const monAfter = addDaysSP(sat.y, sat.m, sat.d, 2);
  return { start: ymdToISO(sat.y, sat.m, sat.d), end: ymdToISO(monAfter.y, monAfter.m, monAfter.d) };
};

/* ============================================================
 * Date keys (YYYY-MM-DD em SP) — usados em filtros de /jogos
 * que comparam por dia civil sem tocar em UTC.
 * ============================================================ */

const fmtKey = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** "YYYY-MM-DD" do dia atual em SP. */
export const todayKeySP = (): string => {
  const { y, m, d } = getSpParts(new Date());
  return fmtKey(y, m, d);
};

/** "YYYY-MM-DD" de amanhã em SP. */
export const tomorrowKeySP = (): string => {
  const { y, m, d } = getSpParts(new Date());
  const t = addDaysSP(y, m, d, 1);
  return fmtKey(t.y, t.m, t.d);
};

/**
 * Retorna { startKey, endKey, keys } cobrindo hoje + próximos 6 dias (7 dias
 * inclusivos) em SP, sempre em formato YYYY-MM-DD.
 */
export const getWeekRangeSP = (): { startKey: string; endKey: string; keys: string[] } => {
  const { y, m, d } = getSpParts(new Date());
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const t = addDaysSP(y, m, d, i);
    keys.push(fmtKey(t.y, t.m, t.d));
  }
  return { startKey: keys[0], endKey: keys[keys.length - 1], keys };
};

/**
 * Retorna os dias do "final de semana" relevante em SP.
 * Regra: sexta + sábado + domingo.
 *  - Se hoje é sexta/sáb/dom → retorna o restante do FDS atual (a partir de hoje).
 *  - Se hoje é seg–qui → retorna a próxima sexta+sábado+domingo.
 */
export const getWeekendRangeSPKeys = (): { keys: string[]; startKey: string; endKey: string } => {
  const { y, m, d, dow } = getSpParts(new Date());
  // dow: 0=dom, 5=sex, 6=sáb
  let toFri: number;
  if (dow === 5) toFri = 0;       // sexta hoje
  else if (dow === 6) toFri = -1;  // sábado → ontem foi sexta
  else if (dow === 0) toFri = -2;  // domingo → sexta foi anteontem
  else toFri = 5 - dow;            // seg(1)..qui(4) → próxima sexta
  const fri = addDaysSP(y, m, d, toFri);
  const friKey = fmtKey(fri.y, fri.m, fri.d);
  const sat = addDaysSP(fri.y, fri.m, fri.d, 1);
  const satKey = fmtKey(sat.y, sat.m, sat.d);
  const sun = addDaysSP(fri.y, fri.m, fri.d, 2);
  const sunKey = fmtKey(sun.y, sun.m, sun.d);
  const today = fmtKey(y, m, d);
  // Se hoje é sex/sáb/dom, exclui dias já passados do FDS atual
  const all = [friKey, satKey, sunKey];
  const keys = all.filter((k) => k >= today);
  return { keys, startKey: keys[0] ?? friKey, endKey: keys[keys.length - 1] ?? sunKey };
};

/** Compara duas datas pelo dia civil em SP. */
export const isSameDaySP = (a: Date, b: Date) => {
  const p1 = getSpParts(a), p2 = getSpParts(b);
  return p1.y === p2.y && p1.m === p2.m && p1.d === p2.d;
};

/** "Hoje" no fuso de SP. */
export const isTodaySP = (date: Date) => isSameDaySP(date, new Date());

/** "Amanhã" no fuso de SP. */
export const isTomorrowSP = (date: Date) => {
  const { y, m, d } = getSpParts(new Date());
  const t = addDaysSP(y, m, d, 1);
  const p = getSpParts(date);
  return p.y === t.y && p.m === t.m && p.d === t.d;
};

/** Garante que um valor de data do banco vire Date. */
export const getEventDateSP = (value: string | Date | null | undefined): Date | null => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

/* ============================================================
 * Helpers de conversão para o admin (form datetime-local <-> ISO)
 * ============================================================ */

/**
 * Converte uma string "datetime-local" em ISO ancorado em SP (-03:00),
 * independente do fuso do navegador.
 */
export const spLocalToISO = (localDateTime: string): string => {
  if (!localDateTime) return "";
  const trimmed = localDateTime.length === 16 ? `${localDateTime}:00` : localDateTime;
  return `${trimmed}${SP_OFFSET}`;
};

/** Converte um ISO em uma string "datetime-local" representando a hora local de SP. */
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

/* ============================================================
 * Formatação (sempre no fuso de SP)
 * ============================================================ */

export const formatTime = (date: Date) =>
  date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });

export const formatDateShort = (date: Date) =>
  date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: TZ });

export const formatDateFull = (date: Date) =>
  date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: TZ });

export const formatDay = (date: Date) =>
  date.toLocaleDateString("pt-BR", { day: "2-digit", timeZone: TZ });

export const formatMonthShort = (date: Date) =>
  date.toLocaleDateString("pt-BR", { month: "short", timeZone: TZ }).replace(".", "").toUpperCase();

export const formatDateHeader = (date: Date) =>
  date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });

/** Alias para data completa em SP. */
export const formatDateSP = formatDateFull;
/** Alias para dia da semana em SP (ex.: "sexta-feira"). */
export const formatWeekdaySP = (date: Date) =>
  date.toLocaleDateString("pt-BR", { weekday: "long", timeZone: TZ });

/* ============================================================
 * Compatibilidade com código existente (mantém nomes antigos)
 * ============================================================ */

export const getTodayStr = () => {
  const { y, m, d } = getSpParts(new Date());
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
};

export const getDateStr = (date: Date) => {
  const { y, m, d } = getSpParts(date);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
};

export const isToday = (date: Date) => isTodaySP(date);
export const isTomorrow = (date: Date) => isTomorrowSP(date);

/* ============================================================
 * Agrupamento por dia civil em SP
 * ============================================================ */

/** Chave YYYY-MM-DD do dia civil em SP. Use sempre para agrupar eventos por dia. */
export const getDateKeySP = (date: Date) => {
  const { y, m, d } = getSpParts(date);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

/**
 * Recebe uma chave "YYYY-MM-DD" (já em SP) e retorna um Date âncora ao meio-dia
 * de SP — seguro para formatadores com timeZone: "America/Sao_Paulo".
 */
export const dateKeySPToAnchorDate = (key: string): Date =>
  new Date(`${key}T12:00:00${SP_OFFSET}`);

/** Cabeçalho longo: "terça-feira, 5 de maio" sempre em SP. */
export const formatDateHeaderSP = (date: Date) =>
  date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TZ,
  });

