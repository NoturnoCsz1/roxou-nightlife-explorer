/**
 * Promoter Settings — Fase Final
 *
 * Persistência híbrida: tenta gravar/ler em `partners.settings` (JSONB) se a
 * coluna existir; caso contrário, cai para `localStorage`. Nunca quebra a UI.
 *
 * Estrutura (subárvore `promoter` dentro de partners.settings):
 *   {
 *     promoter: {
 *       commission: { enabled, vip_checkin_cents, reservation_cents, excursion_cents },
 *       goals: { vip_checkins, reservations, excursions },
 *       ranking: { enabled, period }
 *     }
 *   }
 */
import { supabase } from "@/integrations/supabase/client";

export interface PromoterCommissionSettings {
  enabled: boolean;
  vip_checkin_cents: number;
  reservation_cents: number;
  excursion_cents: number;
}

export interface PromoterGoalsSettings {
  vip_checkins: number;
  reservations: number;
  excursions: number;
}

export interface PromoterRankingSettings {
  enabled: boolean;
  period: "weekly" | "monthly";
}

export interface PromoterSettings {
  commission: PromoterCommissionSettings;
  goals: PromoterGoalsSettings;
  ranking: PromoterRankingSettings;
  /** Compatibilidade com versão anterior (R$ por entrada). */
  commissionPerEntryBRL: number;
  monthlyCheckInGoal: number;
  perEventGoal: number;
}

const DEFAULTS: PromoterSettings = {
  commission: {
    enabled: true,
    vip_checkin_cents: 1500,
    reservation_cents: 2000,
    excursion_cents: 3000,
  },
  goals: {
    vip_checkins: 50,
    reservations: 20,
    excursions: 10,
  },
  ranking: { enabled: true, period: "monthly" },
  commissionPerEntryBRL: 15,
  monthlyCheckInGoal: 50,
  perEventGoal: 20,
};

const LS_KEY = (partnerId: string) =>
  `roxou:partner:${partnerId}:promoterSettings`;

/** Cache em runtime do suporte a partners.settings (evita refazer a tentativa). */
let supportsDbColumn: boolean | null = null;

function mergeDefaults(patch: Partial<PromoterSettings> | null): PromoterSettings {
  const p = patch ?? {};
  return {
    ...DEFAULTS,
    ...p,
    commission: { ...DEFAULTS.commission, ...(p.commission ?? {}) },
    goals: { ...DEFAULTS.goals, ...(p.goals ?? {}) },
    ranking: { ...DEFAULTS.ranking, ...(p.ranking ?? {}) },
  };
}

function readLocal(partnerId: string): PromoterSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(LS_KEY(partnerId));
    if (!raw) return DEFAULTS;
    return mergeDefaults(JSON.parse(raw));
  } catch {
    return DEFAULTS;
  }
}

function writeLocal(partnerId: string, value: PromoterSettings) {
  try {
    window.localStorage.setItem(LS_KEY(partnerId), JSON.stringify(value));
  } catch {
    /* noop */
  }
}

async function tryReadDb(partnerId: string): Promise<PromoterSettings | null> {
  if (supportsDbColumn === false) return null;
  try {
    // Selecionar coluna "settings" — falha se a coluna não existir.
    const { data, error } = await supabase
      .from("partners")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("settings" as any)
      .eq("id", partnerId)
      .maybeSingle();
    if (error) {
      supportsDbColumn = false;
      return null;
    }
    supportsDbColumn = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings = (data as any)?.settings ?? {};
    return mergeDefaults(settings?.promoter ?? null);
  } catch {
    supportsDbColumn = false;
    return null;
  }
}

async function tryWriteDb(
  partnerId: string,
  value: PromoterSettings,
): Promise<boolean> {
  if (supportsDbColumn === false) return false;
  try {
    // Lê settings atual para fazer merge.
    const { data, error: readErr } = await supabase
      .from("partners")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("settings" as any)
      .eq("id", partnerId)
      .maybeSingle();
    if (readErr) {
      supportsDbColumn = false;
      return false;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const current = ((data as any)?.settings ?? {}) as Record<string, unknown>;
    const next = { ...current, promoter: value };
    const { error } = await supabase
      .from("partners")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ settings: next } as any)
      .eq("id", partnerId);
    if (error) {
      supportsDbColumn = false;
      return false;
    }
    supportsDbColumn = true;
    return true;
  } catch {
    supportsDbColumn = false;
    return false;
  }
}

/** Síncrono — retorna localStorage instantaneamente. Use loadPromoterSettingsAsync para hidratar do DB. */
export function loadPromoterSettings(partnerId: string): PromoterSettings {
  if (!partnerId) return DEFAULTS;
  return readLocal(partnerId);
}

/** Async — tenta DB e cai para localStorage. */
export async function loadPromoterSettingsAsync(
  partnerId: string,
): Promise<PromoterSettings> {
  if (!partnerId) return DEFAULTS;
  const fromDb = await tryReadDb(partnerId);
  if (fromDb) {
    writeLocal(partnerId, fromDb); // mantém local em sincronia
    return fromDb;
  }
  return readLocal(partnerId);
}

/** Salva: tenta DB e sempre grava local como cache/fallback. */
export async function savePromoterSettings(
  partnerId: string,
  patch: Partial<PromoterSettings>,
): Promise<PromoterSettings> {
  const next = mergeDefaults({ ...readLocal(partnerId), ...patch });
  writeLocal(partnerId, next);
  await tryWriteDb(partnerId, next);
  return next;
}

/** Para a UI saber se está usando DB ou apenas local. */
export function getSettingsStorageMode(): "db" | "local" | "unknown" {
  if (supportsDbColumn === true) return "db";
  if (supportsDbColumn === false) return "local";
  return "unknown";
}
