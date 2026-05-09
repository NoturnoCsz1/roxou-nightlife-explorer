/**
 * auraVenueRankings — heurística para badges automáticas de ranking.
 * Sem IA externa, sem queries novas, sem scraping. Usa apenas dados já
 * disponíveis na página do local.
 *
 * NÃO altera analytics, não depende de timezone (usa SP helpers só para "hoje/amanhã").
 */

import { isTodaySP, isTomorrowSP } from "@/lib/dateUtils";
import { buildAuraVenueInsights } from "@/lib/auraVenueInsights";
import { buildAuraVenuePricing } from "@/lib/auraVenuePricing";

export interface RankingInput {
  partner: {
    type?: string | null;
    short_description?: string | null;
    full_description?: string | null;
    verified_partner?: boolean | null;
  };
  events: Array<{
    date_time?: string | null;
    category?: string | null;
    sub_category?: string | null;
    title?: string | null;
  }>;
  viewCount: number;
  followerCount: number;
}

export type RankingType =
  | "trending_today"
  | "top_week"
  | "best_value"
  | "premium"
  | "live_music"
  | "university"
  | "bombando";

export interface RankingBadge {
  type: RankingType;
  label: string;
  emoji: string;
  /** lower = mais relevante */
  priority: number;
  /** preparado para futuro: boost patrocinado */
  sponsored?: boolean;
}

const TRENDING_VIEW_THRESHOLD = 80;
const TOP_WEEK_VIEW_THRESHOLD = 200;
const BOMBANDO_FOLLOWER_THRESHOLD = 30;

export function buildAuraVenueRankings(input: RankingInput): RankingBadge[] {
  const out: RankingBadge[] = [];
  const text = [
    input.partner.short_description,
    input.partner.full_description,
    ...input.events.map((e) => e.title || ""),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const insights = buildAuraVenueInsights({ partner: input.partner, events: input.events });
  const pricing = buildAuraVenuePricing({ partner: input.partner, events: input.events });

  const eventsToday = input.events.filter((e) => e.date_time && isTodaySP(e.date_time));
  const eventsTomorrow = input.events.filter((e) => e.date_time && isTomorrowSP(e.date_time));

  // 🔥 Em alta hoje
  if (eventsToday.length >= 1 || input.viewCount >= TRENDING_VIEW_THRESHOLD) {
    out.push({ type: "trending_today", label: "Em alta hoje", emoji: "🔥", priority: 1 });
  }

  // ⚡ Bombando agora
  if (
    (eventsToday.length + eventsTomorrow.length >= 2) ||
    input.followerCount >= BOMBANDO_FOLLOWER_THRESHOLD
  ) {
    out.push({ type: "bombando", label: "Bombando agora", emoji: "⚡", priority: 2 });
  }

  // 🏆 Top da semana
  if (input.viewCount >= TOP_WEEK_VIEW_THRESHOLD) {
    out.push({ type: "top_week", label: "Top da semana", emoji: "🏆", priority: 2 });
  }

  // 💎 Premium da semana
  if (
    pricing.priceProfile === "$$$" ||
    /(premium|vip|exclusiv|sofistic|gourmet|lounge premium)/.test(text)
  ) {
    out.push({ type: "premium", label: "Premium da semana", emoji: "💎", priority: 3 });
  }

  // 🍻 Melhor custo-benefício
  if (pricing.priceProfile === "$" || (insights.crowd === "Universitário" && pricing.priceProfile !== "$$$")) {
    out.push({ type: "best_value", label: "Melhor custo-benefício", emoji: "🍻", priority: 3 });
  }

  // 🎓 Favorito universitário
  if (insights.crowd === "Universitário" || /(univers|faculd|estud)/.test(text)) {
    out.push({ type: "university", label: "Favorito universitário", emoji: "🎓", priority: 4 });
  }

  // 🎶 Melhor música ao vivo
  const musicSubs = ["pagode_samba", "sertanejo", "mpb", "rock", "pop_rock"];
  const liveMusicEvents = input.events.filter(
    (e) => (e.sub_category && musicSubs.includes(e.sub_category)) || /(ao vivo|live|show)/.test((e.title || "").toLowerCase()),
  ).length;
  if (
    liveMusicEvents >= 2 ||
    /(m[uú]sica ao vivo|ao vivo|live music|casa de shows)/.test(text) ||
    (input.partner.type || "").toLowerCase() === "casa de shows"
  ) {
    out.push({ type: "live_music", label: "Música ao vivo", emoji: "🎶", priority: 4 });
  }

  // Dedup por type, ordenar por prioridade, máximo 3
  const seen = new Set<string>();
  const unique = out.filter((b) => {
    if (seen.has(b.type)) return false;
    seen.add(b.type);
    return true;
  });
  unique.sort((a, b) => a.priority - b.priority);
  return unique.slice(0, 3);
}
