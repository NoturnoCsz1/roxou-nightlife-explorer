/**
 * Reservas — camada CONVERTIDA (Fase 3).
 *
 * Tenancy oficial: organization_id + venue_id (nunca `partners.id`).
 * Tabelas oficiais: reservation_settings, reservation_types, reservations,
 * reservation_waitlist.
 *
 * Mutations sensíveis passam por RPC SECURITY DEFINER (ver
 * supabase/migrations-official/). O frontend nunca envia organization_id
 * confiável: a RPC resolve/valida o membership do usuário autenticado.
 */
import { officialClient } from "@modules/partner/converged/client";
import {
  requireOrganization,
  requireVenue,
  type PartnerScope,
} from "@modules/partner/converged/tenancy";

export const RESERVATIONS_TABLE = "reservations" as const;
export const RESERVATION_TYPES_TABLE = "reservation_types" as const;
export const RESERVATION_SETTINGS_TABLE = "reservation_settings" as const;
export const RESERVATION_WAITLIST_TABLE = "reservation_waitlist" as const;

export type ReservationStatus =
  | "pending"
  | "pending_payment"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "expired"
  | "no_show";

export type ReservationTypeKind = "table" | "bistro" | "box";
export type DepositType = "fixed" | "percent" | "full";
export type WaitlistStatus =
  | "waiting"
  | "notified"
  | "accepted"
  | "expired"
  | "cancelled";

export interface OfficialReservationRow {
  id: string;
  organization_id: string;
  venue_id: string;
  event_id: string | null;
  user_id: string | null;
  reservation_type_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  people_count: number;
  reservation_date: string;
  notes: string | null;
  status: ReservationStatus;
  total_price: number | null;
  deposit_amount: number | null;
  remaining_amount: number | null;
  payment_method: string | null;
  payment_status: "pending" | "paid" | "waived" | "refunded";
  payment_confirmed_at: string | null;
  expires_at: string | null;
  closes_at: string | null;
  auto_close_enabled: boolean;
  close_reason: string | null;
  checked_in_at: string | null;
  checked_in_by: string | null;
  released_at: string | null;
  duration_minutes: number | null;
  public_token: string;
  code: string | null;
  created_at: string;
  updated_at: string;
}

export interface OfficialReservationSettings {
  id: string;
  organization_id: string;
  venue_id: string;
  reservations_enabled: boolean;
  max_people_per_reservation: number;
  max_reservations_per_day: number;
  advance_booking_hours: number;
  auto_confirm: boolean;
  confirmation_timeout_minutes: number;
  deposit_enabled: boolean;
  deposit_type: DepositType;
  deposit_value: number;
  pix_key: string | null;
  pix_receiver_name: string | null;
  payment_instructions: string | null;
  slot_interval_minutes: number;
  default_reservation_duration_minutes: number;
  daily_open_time: string;
  daily_close_time: string;
  reservations_start_at: string | null;
  reservations_end_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OfficialReservationType {
  id: string;
  organization_id: string;
  venue_id: string;
  kind: ReservationTypeKind;
  name: string;
  description: string | null;
  seats: number;
  quantity: number;
  price: number;
  minimum_consumption: number | null;
  extra_people_limit: number | null;
  extra_people_price: number | null;
  duration_minutes: number | null;
  requires_guest_count: boolean;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface OfficialWaitlistEntry {
  id: string;
  organization_id: string;
  venue_id: string;
  reservation_type_id: string | null;
  name: string;
  phone: string;
  guests_count: number;
  notes: string | null;
  status: WaitlistStatus;
  notified_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReservationPayload {
  name?: string;
  phone?: string | null;
  email?: string | null;
  people_count?: number;
  reservation_date?: string;
  notes?: string | null;
  event_id?: string | null;
  reservation_type_id?: string | null;
  status?: ReservationStatus;
}

export interface ListReservationsOptions {
  status?: ReservationStatus | "all";
  from?: string;
  to?: string;
  search?: string;
  limit?: number;
}

function unwrap<T>(result: { data: unknown; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data as T;
}

// ---------------------------------------------------------------- leitura

export async function listReservations(
  scope: PartnerScope,
  opts: ListReservationsOptions = {},
): Promise<OfficialReservationRow[]> {
  const organizationId = requireOrganization(scope);
  const venueId = requireVenue(scope);

  let q = officialClient()
    .from(RESERVATIONS_TABLE)
    .select("*")
    .eq("organization_id", organizationId)
    .eq("venue_id", venueId)
    .order("reservation_date", { ascending: false })
    .limit(opts.limit ?? 200);

  if (opts.status && opts.status !== "all") q = q.eq("status", opts.status);
  if (opts.from) q = q.gte("reservation_date", opts.from);
  if (opts.to) q = q.lte("reservation_date", opts.to);
  if (opts.search?.trim()) {
    const s = opts.search.trim().replace(/[,%]/g, "");
    q = q.or(`name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%`);
  }

  return unwrap<OfficialReservationRow[]>(await q) ?? [];
}

export async function getReservation(
  scope: PartnerScope,
  reservationId: string,
): Promise<OfficialReservationRow | null> {
  const organizationId = requireOrganization(scope);
  if (!reservationId) return null;
  const data = unwrap<OfficialReservationRow | null>(
    await officialClient()
      .from(RESERVATIONS_TABLE)
      .select("*")
      .eq("id", reservationId)
      .eq("organization_id", organizationId)
      .maybeSingle(),
  );
  return data ?? null;
}

export async function getReservationSettings(
  scope: PartnerScope,
): Promise<OfficialReservationSettings | null> {
  const organizationId = requireOrganization(scope);
  const venueId = requireVenue(scope);
  const data = unwrap<OfficialReservationSettings | null>(
    await officialClient()
      .from(RESERVATION_SETTINGS_TABLE)
      .select("*")
      .eq("organization_id", organizationId)
      .eq("venue_id", venueId)
      .maybeSingle(),
  );
  return data ?? null;
}

export async function listReservationTypes(
  scope: PartnerScope,
  opts: { onlyActive?: boolean } = {},
): Promise<OfficialReservationType[]> {
  const organizationId = requireOrganization(scope);
  const venueId = requireVenue(scope);
  let q = officialClient()
    .from(RESERVATION_TYPES_TABLE)
    .select("*")
    .eq("organization_id", organizationId)
    .eq("venue_id", venueId)
    .order("kind", { ascending: true })
    .order("sort_order", { ascending: true });
  if (opts.onlyActive) q = q.eq("active", true);
  return unwrap<OfficialReservationType[]>(await q) ?? [];
}

// ---------------------------------------------------------------- escrita

export async function createReservation(
  scope: PartnerScope,
  payload: ReservationPayload,
): Promise<OfficialReservationRow> {
  const organizationId = requireOrganization(scope);
  const venueId = requireVenue(scope);
  if (!payload.name?.trim()) throw new Error("Nome é obrigatório.");
  if (!payload.reservation_date) throw new Error("Data/hora é obrigatória.");

  return unwrap<OfficialReservationRow>(
    await officialClient().rpc("partner_create_reservation", {
      p_organization_id: organizationId,
      p_venue_id: venueId,
      p_payload: payload,
    }),
  );
}

export async function updateReservation(
  scope: PartnerScope,
  reservationId: string,
  payload: ReservationPayload,
): Promise<OfficialReservationRow> {
  requireOrganization(scope);
  if (!reservationId) throw new Error("reservationId obrigatório.");
  return unwrap<OfficialReservationRow>(
    await officialClient().rpc("partner_update_reservation", {
      p_reservation_id: reservationId,
      p_payload: payload,
    }),
  );
}

export async function setReservationStatus(
  scope: PartnerScope,
  reservationId: string,
  status: Exclude<ReservationStatus, "pending_payment" | "expired">,
): Promise<OfficialReservationRow> {
  requireOrganization(scope);
  return unwrap<OfficialReservationRow>(
    await officialClient().rpc("partner_set_reservation_status", {
      p_reservation_id: reservationId,
      p_status: status,
    }),
  );
}

export const confirmReservation = (s: PartnerScope, id: string) =>
  setReservationStatus(s, id, "confirmed");
export const cancelReservation = (s: PartnerScope, id: string) =>
  setReservationStatus(s, id, "cancelled");
export const completeReservation = (s: PartnerScope, id: string) =>
  setReservationStatus(s, id, "completed");
export const noShowReservation = (s: PartnerScope, id: string) =>
  setReservationStatus(s, id, "no_show");

export async function checkInReservation(
  scope: PartnerScope,
  reservationId: string,
): Promise<OfficialReservationRow> {
  requireOrganization(scope);
  return unwrap<OfficialReservationRow>(
    await officialClient().rpc("partner_check_in_reservation", {
      p_reservation_id: reservationId,
    }),
  );
}

export async function confirmReservationPayment(
  scope: PartnerScope,
  reservationId: string,
): Promise<OfficialReservationRow> {
  requireOrganization(scope);
  return unwrap<OfficialReservationRow>(
    await officialClient().rpc("partner_confirm_reservation_payment", {
      p_reservation_id: reservationId,
    }),
  );
}

export async function releaseReservationTable(
  scope: PartnerScope,
  reservationId: string,
): Promise<OfficialReservationRow> {
  requireOrganization(scope);
  return unwrap<OfficialReservationRow>(
    await officialClient().rpc("partner_release_reservation_table", {
      p_reservation_id: reservationId,
    }),
  );
}

export async function upsertReservationSettings(
  scope: PartnerScope,
  payload: Partial<
    Omit<
      OfficialReservationSettings,
      "id" | "organization_id" | "venue_id" | "created_at" | "updated_at"
    >
  >,
): Promise<OfficialReservationSettings> {
  const organizationId = requireOrganization(scope);
  const venueId = requireVenue(scope);
  return unwrap<OfficialReservationSettings>(
    await officialClient().rpc("partner_upsert_reservation_settings", {
      p_organization_id: organizationId,
      p_venue_id: venueId,
      p_payload: payload,
    }),
  );
}

export async function upsertReservationType(
  scope: PartnerScope,
  payload: Partial<OfficialReservationType> & { name: string; kind: ReservationTypeKind },
): Promise<OfficialReservationType> {
  const organizationId = requireOrganization(scope);
  const venueId = requireVenue(scope);
  return unwrap<OfficialReservationType>(
    await officialClient().rpc("partner_upsert_reservation_type", {
      p_organization_id: organizationId,
      p_venue_id: venueId,
      p_payload: payload,
    }),
  );
}

// ------------------------------------------------------- disponibilidade

export interface ReservationSlot {
  slot_start: string;
  slot_end: string;
  quantity_total: number;
  reserved_count: number;
  available_count: number;
}

export async function getReservationSlotAvailability(
  scope: PartnerScope,
  reservationTypeId: string,
  date: string,
): Promise<ReservationSlot[]> {
  const organizationId = requireOrganization(scope);
  const venueId = requireVenue(scope);
  return (
    unwrap<ReservationSlot[]>(
      await officialClient().rpc("partner_reservation_slot_availability", {
        p_organization_id: organizationId,
        p_venue_id: venueId,
        p_reservation_type_id: reservationTypeId,
        p_date: date,
      }),
    ) ?? []
  );
}

export interface ReservationTypeAvailability {
  type_id: string;
  quantity: number;
  reserved: number;
  available: number;
}

export async function getReservationTypesAvailability(
  scope: PartnerScope,
): Promise<ReservationTypeAvailability[]> {
  const organizationId = requireOrganization(scope);
  const venueId = requireVenue(scope);
  return (
    unwrap<ReservationTypeAvailability[]>(
      await officialClient().rpc("partner_reservation_types_availability", {
        p_organization_id: organizationId,
        p_venue_id: venueId,
      }),
    ) ?? []
  );
}

// -------------------------------------------------------- fila de espera

export async function listReservationWaitlist(
  scope: PartnerScope,
): Promise<OfficialWaitlistEntry[]> {
  const organizationId = requireOrganization(scope);
  const venueId = requireVenue(scope);
  return (
    unwrap<OfficialWaitlistEntry[]>(
      await officialClient()
        .from(RESERVATION_WAITLIST_TABLE)
        .select("*")
        .eq("organization_id", organizationId)
        .eq("venue_id", venueId)
        .order("created_at", { ascending: true }),
    ) ?? []
  );
}

export async function notifyWaitlistEntry(
  scope: PartnerScope,
  entryId: string,
): Promise<OfficialWaitlistEntry> {
  requireOrganization(scope);
  return unwrap<OfficialWaitlistEntry>(
    await officialClient().rpc("partner_notify_waitlist_entry", {
      p_entry_id: entryId,
    }),
  );
}

export async function cancelWaitlistEntry(
  scope: PartnerScope,
  entryId: string,
): Promise<OfficialWaitlistEntry> {
  requireOrganization(scope);
  return unwrap<OfficialWaitlistEntry>(
    await officialClient().rpc("partner_cancel_waitlist_entry", {
      p_entry_id: entryId,
    }),
  );
}

// ------------------------------------------------------- superfície pública

/**
 * Fluxo público (comprovante do cliente). Só por token forte, nunca listagem.
 */
export async function getPublicReservationByToken(
  token: string,
): Promise<Record<string, unknown> | null> {
  if (!token || token.length < 16) throw new Error("Token inválido.");
  const data = unwrap<Record<string, unknown> | null>(
    await officialClient().rpc("public_get_reservation_by_token", {
      p_token: token,
    }),
  );
  return data ?? null;
}
