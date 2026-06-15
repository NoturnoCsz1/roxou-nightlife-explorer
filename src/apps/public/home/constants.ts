// ─── Constantes locais da Home pública ───
// Extraído de src/pages/v3/V3Home.tsx (Fase 5) — valores literais preservados.

import { getDateKeySP, getStartOfTodaySP, getEndOfTodaySP } from "@/lib/dateUtils";

export const VIBE_FILTERS = [
  { key: "bombando", label: "🔥 Bombando" },
  { key: "musica", label: "🎸 Música ao Vivo" },
  { key: "happy", label: "🍹 Happy Hour" },
  { key: "grandes", label: "🏟️ Grandes Eventos" },
];

// Chaves de cache derivadas do dia civil de São Paulo (não hardcoded).
export const TODAY_KEY = getDateKeySP(new Date());
export const TODAY_START = getStartOfTodaySP();
export const TODAY_END = getEndOfTodaySP();

// Tolerância: eventos iniciados nas últimas 4h ainda estão "rolando"
export const LIVE_TOLERANCE_MS = 4 * 60 * 60 * 1000;

export const PINNED_PARTNERS = ["arapuca bar", "quinta aula", "boteco raiz"];
