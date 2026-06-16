/**
 * Partner Reservations Service — Fase 9H
 *
 * Tabela: `partner_reservations` (reservas pertencem a um `partner_id`).
 * Configurações: `partner_reservation_settings` (1 linha por parceiro).
 *
 * Mutations passam por RPCs `SECURITY DEFINER`:
 *   - create_partner_reservation       (owner/admin)
 *   - update_partner_reservation       (owner/admin)
 *   - set_partner_reservation_status   (owner/admin: tudo | editor: confirm |
 *                                       attendant: confirm/complete/no_show)
 *   - upsert_partner_reservation_settings (owner/admin)
 *
 * SELECT: coberto pela policy "Partner staff read own reservations"
 * (qualquer membro ativo do parceiro pode ler reservas do próprio parceiro).
 */
import { supabase } from "@/integrations/supabase/client";

export type PartnerReservationStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

export interface PartnerReservationRow {
  id: string;
  partner_id: string;
  event_id: string | null;
  user_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  people_count: number;
  reservation_date: string;
  notes: string | null;
  status: PartnerReservationStatus;
  created_at: string;
  updated_at: string;
}

export interface PartnerReservationSettings {
  id: string;
  partner_id: string;
  reservations_enabled: boolean;
  max_people_per_reservation: number;
  max_reservations_per_day: number;
  advance_booking_hours: number;
  auto_confirm: boolean;
  created_at: string;
  updated_at: string;
}

export interface PartnerReservationPayload {
  name?: string;
  phone?: string | null;
  email?: string | null;
  people_count?: number;
  reservation_date?: string;
  notes?: string | null;
  event_id?: string | null;
  status?: PartnerReservationStatus;
}

export interface PartnerReservationSettingsPayload {
  reservations_enabled?: boolean;
  max_people_per_reservation?: number;
  max_reservations_per_day?: number;
  advance_booking_hours?: number;
  auto_confirm?: boolean;
}

const TABLE = "partner_reservations" as const;
const SETTINGS_TABLE = "partner_reservation_settings" as const;

const SELECT_COLS =
  "id, partner_id, event_id, user_id, name, phone, email, people_count, reservation_date, notes, status, created_at, updated_at";

export interface ListReservationsOptions {
  status?: PartnerReservationStatus | "all";
  from?: string;
  to?: string;
  search?: string;
  limit?: number;
}

export async function listReservations(
  partnerId: string,
  opts: ListReservationsOptions = {},
): Promise<PartnerReservationRow[]> {
  if (!partnerId) return [];
  let q = supabase
    .from(TABLE)
    .select(SELECT_COLS)
    .eq("partner_id", partnerId)
    .order("reservation_date", { ascending: false })
    .limit(opts.limit ?? 200);

  if (opts.status && opts.status !== "all") q = q.eq("status", opts.status);
  if (opts.from) q = q.gte("reservation_date", opts.from);
  if (opts.to) q = q.lte("reservation_date", opts.to);
  if (opts.search?.trim()) {
    const s = opts.search.trim();
    q = q.or(`name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as PartnerReservationRow[];
}

export async function getReservation(
  reservationId: string,
  partnerId: string,
): Promise<PartnerReservationRow | null> {
  if (!reservationId || !partnerId) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select(SELECT_COLS)
    .eq("id", reservationId)
    .eq("partner_id", partnerId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as PartnerReservationRow) ?? null;
}

export async function createReservation(
  partnerId: string,
  payload: PartnerReservationPayload,
): Promise<PartnerReservationRow> {
  if (!partnerId) throw new Error("partnerId obrigatório.");
  if (!payload.name?.trim()) throw new Error("Nome é obrigatório.");
  if (!payload.reservation_date) throw new Error("Data/hora é obrigatória.");

  const { data, error } = await supabase.rpc("create_partner_reservation", {
    _partner_id: partnerId,
    _payload: payload as unknown as never,
  });
  if (error) throw error;
  if (!data) throw new Error("Não foi possível criar a reserva.");
  return data as unknown as PartnerReservationRow;
}

export async function updateReservation(
  reservationId: string,
  payload: PartnerReservationPayload,
): Promise<PartnerReservationRow> {
  if (!reservationId) throw new Error("reservationId obrigatório.");
  const { data, error } = await supabase.rpc("update_partner_reservation", {
    _reservation_id: reservationId,
    _payload: payload as unknown as never,
  });
  if (error) throw error;
  if (!data) throw new Error("Sem permissão ou reserva não encontrada.");
  return data as unknown as PartnerReservationRow;
}

async function setStatus(
  reservationId: string,
  status: PartnerReservationStatus,
): Promise<PartnerReservationRow> {
  const { data, error } = await supabase.rpc(
    "set_partner_reservation_status",
    { _reservation_id: reservationId, _status: status },
  );
  if (error) throw error;
  if (!data) throw new Error("Sem permissão.");
  return data as unknown as PartnerReservationRow;
}

export const confirmReservation = (id: string) => setStatus(id, "confirmed");
export const cancelReservation = (id: string) => setStatus(id, "cancelled");
export const completeReservation = (id: string) => setStatus(id, "completed");
export const noShowReservation = (id: string) => setStatus(id, "no_show");

// ---- Settings ----

export async function getReservationSettings(
  partnerId: string,
): Promise<PartnerReservationSettings | null> {
  if (!partnerId) return null;
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select("*")
    .eq("partner_id", partnerId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as PartnerReservationSettings) ?? null;
}

export async function updateReservationSettings(
  partnerId: string,
  payload: PartnerReservationSettingsPayload,
): Promise<PartnerReservationSettings> {
  if (!partnerId) throw new Error("partnerId obrigatório.");
  const { data, error } = await supabase.rpc(
    "upsert_partner_reservation_settings",
    { _partner_id: partnerId, _payload: payload as unknown as never },
  );
  if (error) throw error;
  if (!data) throw new Error("Não foi possível salvar as configurações.");
  return data as unknown as PartnerReservationSettings;
}

// ---- Métricas ----

export interface ReservationStatsResult {
  today: number;
  week: number;
  confirmedRate: number;
  noShowRate: number;
  capacityUsed: number;
}

export function computeReservationStats(
  rows: PartnerReservationRow[],
  capacityPerDay = 50,
): ReservationStatsResult {
  const now = new Date();
  const startToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const endToday = startToday + 24 * 60 * 60 * 1000;
  const startWeek = startToday - 6 * 24 * 60 * 60 * 1000;

  let today = 0;
  let week = 0;
  let confirmed = 0;
  let noShow = 0;
  let capacityToday = 0;
  let total = 0;

  for (const r of rows) {
    const t = new Date(r.reservation_date).getTime();
    if (t >= startToday && t < endToday) {
      today += 1;
      capacityToday += r.people_count;
    }
    if (t >= startWeek && t < endToday) week += 1;
    if (r.status === "confirmed" || r.status === "completed") confirmed += 1;
    if (r.status === "no_show") noShow += 1;
    total += 1;
  }

  return {
    today,
    week,
    confirmedRate: total ? Math.round((confirmed / total) * 100) : 0,
    noShowRate: total ? Math.round((noShow / total) * 100) : 0,
    capacityUsed: capacityPerDay
      ? Math.min(100, Math.round((capacityToday / capacityPerDay) * 100))
      : 0,
  };
}
