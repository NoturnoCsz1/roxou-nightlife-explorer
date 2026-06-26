/**
 * Promoter Settings — persistência client-side (Opção 1: zero schema change).
 *
 * Armazena taxas de comissão e metas por parceiro no localStorage.
 * NÃO é fonte transacional. Comissões reais são SEMPRE calculadas em runtime
 * a partir de `partner_vip_list_entries` (status='checked_in' ou 'approved').
 */

export interface PromoterSettings {
  /** Comissão em R$ por entrada confirmada (check-in). */
  commissionPerEntryBRL: number;
  /** Meta global de check-ins por mês para o ranking. */
  monthlyCheckInGoal: number;
  /** Meta por evento (default; pode ser sobrescrita por evento). */
  perEventGoal: number;
}

const DEFAULTS: PromoterSettings = {
  commissionPerEntryBRL: 5,
  monthlyCheckInGoal: 100,
  perEventGoal: 20,
};

const KEY = (partnerId: string) => `roxou:partner:${partnerId}:promoterSettings`;

export function loadPromoterSettings(partnerId: string): PromoterSettings {
  if (!partnerId || typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY(partnerId));
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function savePromoterSettings(
  partnerId: string,
  patch: Partial<PromoterSettings>,
): PromoterSettings {
  const next = { ...loadPromoterSettings(partnerId), ...patch };
  try {
    window.localStorage.setItem(KEY(partnerId), JSON.stringify(next));
  } catch {
    /* noop */
  }
  return next;
}
