// ─── Helpers puros da Home pública ───
// Extraído de src/pages/v3/V3Home.tsx (Fase 5) — comportamento idêntico.

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { isTodaySP as isTodayFn, isTomorrowSP } from "@/lib/dateUtils";
import type { Ev } from "./types";

export const isValidDate = (d: Date) => !Number.isNaN(d.getTime());

export const toSafeDate = (d?: string | null) => {
  const parsed = new Date(d || "");
  return isValidDate(parsed) ? parsed : null;
};

export const fmtTime = (d?: string | null) => {
  const parsed = toSafeDate(d);
  return parsed ? format(parsed, "HH'h'mm", { locale: ptBR }) : "Horário a confirmar";
};

export const fmtDateFull = (d?: string | null) => {
  const parsed = toSafeDate(d);
  return parsed ? format(parsed, "EEE, d MMM · HH'h'mm", { locale: ptBR }) : "Data a confirmar";
};

export const isEventLive = (d: string) => {
  const parsed = toSafeDate(d);
  if (!parsed) return false;
  const start = parsed.getTime();
  const now = Date.now();
  return now >= start && now <= start + 4 * 60 * 60 * 1000;
};

export const getDayLabel = (d?: string | null) => {
  const dt = toSafeDate(d);
  if (!dt) return "EM BREVE";
  if (isTodayFn(dt)) return "HOJE";
  if (isTomorrowSP(dt)) return "AMANHÃ";
  return format(dt, "EEEE", { locale: ptBR }).toUpperCase();
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const normalizeEvent = (event: any): Ev | null => {
  if (!event?.id) return null;
  return {
    id: String(event.id),
    slug: event.slug ? String(event.slug) : String(event.id),
    title: event.title ? String(event.title) : "Evento Roxou",
    image_url: event.image_url || null,
    date_time: event.date_time || "",
    venue_name: event.venue_name || null,
    category: event.category ? String(event.category) : "evento",
    sub_category: event.sub_category || null,
    featured: Boolean(event.featured),
    partner_id: event.partner_id || null,
    ticket_url: event.ticket_url || null,
    video_url: event.video_url || null,
    transport_reservation_enabled: Boolean(event.transport_reservation_enabled),
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const safeEvents = (events?: any[] | null) =>
  (Array.isArray(events) ? (events.map(normalizeEvent).filter(Boolean) as Ev[]) : []);
