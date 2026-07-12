/**
 * Onda 22 — HomeContextService.
 *
 * Serviço puro que identifica o contexto atual da Home (bucket de horário
 * + dia da semana) usando America/Sao_Paulo. Deriva slugs preferidos do
 * Discovery Engine e features preferidas do Feature Engine sem consultar
 * banco, sem IA e sem novas queries.
 */
import { listEnabledDiscoveryCategories } from "../../categories/discoveryCategories";
import { FEATURE_CATALOG } from "../../features";

export type HomeContextBucket =
  | "morning"
  | "lunch"
  | "afternoon"
  | "happy-hour"
  | "dinner"
  | "night";

export interface HomeContext {
  bucket: HomeContextBucket;
  isWeekend: boolean;
  /** 0=domingo … 6=sábado (America/Sao_Paulo). */
  weekday: number;
  /** Hora inteira 0-23 em America/Sao_Paulo. */
  hourSP: number;
  /** Slugs do Discovery Engine, ordenados por prioridade contextual. */
  preferredCategorySlugs: string[];
  /** Slugs do Feature Engine relevantes ao contexto (usados por consumidores). */
  preferredFeatureSlugs: string[];
  /** Rótulo amigável do contexto ("Almoço", "Happy hour"…). */
  label: string;
}

const TZ = "America/Sao_Paulo";

function getSpHourAndDow(now: Date): { hour: number; dow: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const dow = weekdayMap[parts.find((p) => p.type === "weekday")?.value ?? "Sun"] ?? 0;
  return { hour: Number.isFinite(hour) ? hour : 0, dow };
}

function bucketForHour(hour: number): HomeContextBucket {
  if (hour < 11) return "morning";
  if (hour < 14) return "lunch";
  if (hour < 17) return "afternoon";
  if (hour < 20) return "happy-hour";
  if (hour < 23) return "dinner";
  return "night";
}

const BUCKET_LABEL: Record<HomeContextBucket, string> = {
  morning: "Bom dia",
  lunch: "Hora do almoço",
  afternoon: "Boa tarde",
  "happy-hour": "Happy hour",
  dinner: "Hora do jantar",
  night: "Noite",
};

/**
 * Prioridade de slugs por bucket (referem-se a Discovery Categories).
 * Slugs inexistentes no catálogo são filtrados no final — mantém o serviço
 * resiliente à evolução do catálogo sem exigir novas ondas.
 */
const BUCKET_PRIORITY: Record<HomeContextBucket, string[]> = {
  morning: ["cafeterias", "onde-comer", "familia"],
  lunch: ["onde-comer", "hamburguerias", "pizzarias", "churrascarias", "cafeterias"],
  afternoon: ["cafeterias", "onde-comer", "familia", "pet-friendly"],
  "happy-hour": ["happy-hour", "onde-sair", "hamburguerias"],
  dinner: ["onde-comer", "romantico", "pizzarias", "churrascarias"],
  night: ["onde-sair", "happy-hour", "romantico"],
};

const WEEKEND_BOOST = ["familia", "churrascarias", "pet-friendly", "romantico"];

/**
 * Features do Feature Engine consideradas relevantes ao bucket.
 * Consumidas por blocos que exibem selos/badges/priorização visual.
 */
const BUCKET_FEATURES: Record<HomeContextBucket, string[]> = {
  morning: ["cafe-especial", "pet-friendly"],
  lunch: ["executivo", "estacionamento", "delivery"],
  afternoon: ["area-kids", "pet-friendly"],
  "happy-hour": ["happy-hour", "chopp", "musica-ao-vivo"],
  dinner: ["musica-ao-vivo", "romantico", "reservas"],
  night: ["musica-ao-vivo", "balada", "drinks-autorais"],
};

/**
 * Retorna o contexto atual da Home. Puro em relação ao clock (`now`
 * pode ser injetado em testes).
 */
export function getHomeContext(now: Date = new Date()): HomeContext {
  const { hour, dow } = getSpHourAndDow(now);
  const bucket = bucketForHour(hour);
  const isWeekend = dow === 0 || dow === 6;

  const validCategorySlugs = new Set(
    listEnabledDiscoveryCategories().map((c) => c.slug),
  );

  const priority = [
    ...BUCKET_PRIORITY[bucket],
    ...(isWeekend ? WEEKEND_BOOST : []),
  ];
  const seen = new Set<string>();
  const preferredCategorySlugs = priority.filter((slug) => {
    if (!validCategorySlugs.has(slug)) return false;
    if (seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });

  const featureSeen = new Set<string>();
  const preferredFeatureSlugs = BUCKET_FEATURES[bucket]
    .filter((slug) => hasFeatureSlug(slug))
    .filter((slug) => {
      if (featureSeen.has(slug)) return false;
      featureSeen.add(slug);
      return true;
    });

  return {
    bucket,
    isWeekend,
    weekday: dow,
    hourSP: hour,
    preferredCategorySlugs,
    preferredFeatureSlugs,
    label: BUCKET_LABEL[bucket],
  };
}
