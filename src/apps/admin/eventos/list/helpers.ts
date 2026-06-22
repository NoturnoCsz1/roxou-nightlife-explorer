// Helpers puros extraídos de src/pages/admin/EventosList.tsx (Fase 3B).
// Lógica preservada literalmente — não mexer em regras de checklist,
// detecção de IA ou formatação de data SP sem revisão explícita.

import type { EventRow, Checklist } from "./types";

export function getQualityScore(e: EventRow): number {
  let s = 0;
  if (e.image_url) s += 25;
  if (e.date_time && new Date(e.date_time).getTime() > Date.now()) s += 25;
  if (e.venue_name && e.venue_name.trim()) s += 25;
  if (e.category) s += 25;
  return s;
}

export function getChecklist(e: EventRow): Checklist {
  const titleText = (e.title || "").trim();
  const title = titleText.length >= 5 && !/[—–\-:|/]/.test(titleText);
  const date = !!e.date_time && new Date(e.date_time).getTime() > Date.now();
  const desc = (e.description || "").trim();
  // Persona V2 = HTML rica com checklist (📝 O QUE VOCÊ PRECISA SABER) ou ao menos <ul> + <strong> + 80+ chars
  const description =
    desc.length >= 80 &&
    /<(p|ul|li|strong)\b/i.test(desc) &&
    (/O QUE VOC[ÊE] PRECISA SABER/i.test(desc) || /<ul[\s>]/i.test(desc));
  const flyer = !!e.image_url && /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(e.image_url.trim());
  const complete = title && date && description && flyer;
  return { title, date, description, flyer, complete };
}

export function normalizeAiTitle(title: string) {
  return title
    .replace(/\s*[—–\-:|/]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export const isAiOrigin = (e: EventRow) => {
  const src = (e.verification_source || "").toLowerCase();
  return (
    src.includes("instagram") ||
    src.includes("ia") ||
    src.includes("ai") ||
    src.includes("eventou") ||
    src.includes("flyer")
  );
};

export const needsReview = (e: EventRow) => {
  if (!e.date_time) return true;
  const d = new Date(e.date_time);
  const hh = d.toLocaleString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
    hour12: false,
  });
  // Default fallback 00:00 = AI couldn't read time
  if (hh === "00:00") return true;
  if (/\[REVISAR\]/i.test(e.title || "")) return true;
  return false;
};

export const spDateStr = (d: Date) =>
  new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(d);

export const eventDayStr = (e: EventRow) => (e.date_time ? spDateStr(new Date(e.date_time)) : "");

export type EventOrigin = "aura" | "instagram" | "eventou" | "ai" | "manual";

export function getOrigin(e: EventRow): EventOrigin {
  const src = (e.verification_source || "").toLowerCase();
  if (src.includes("eventou")) return "eventou";
  if (src.includes("instagram")) return "instagram";
  if (e.aura_pick || src.includes("aura")) return "aura";
  if (src.includes("ia") || src.includes("ai") || src.includes("flyer")) return "ai";
  return "manual";
}

export function getMissingFields(e: EventRow): string[] {
  const cl = getChecklist(e);
  const miss: string[] = [];
  if (!cl.flyer) miss.push("capa");
  if (!cl.description) miss.push("descrição");
  if (!e.venue_name || !e.venue_name.trim()) miss.push("local");
  if (!cl.date) miss.push("data");
  return miss;
}
