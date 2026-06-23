/**
 * Partner Excursões Service — FASE 7.2
 *
 * CRUD para veículos, viagens (sessões diárias) e mapa de assentos do
 * módulo Roxou Excursões dentro do Partner Pro. Persiste em
 * `excursion_vehicles`, `excursion_trips` e `excursion_seats` (RLS
 * controla acesso via `partner_users` + admin Roxou).
 *
 * Esta sub-fase NÃO trata passageiro público, QR, pagamento real,
 * embarque/validador nem GPS — apenas a estrutura interna do parceiro.
 */
import { supabase } from "@/integrations/supabase/client";

export type ExcursionTripStatus =
  | "draft"
  | "open"
  | "closed"
  | "cancelled"
  | "finished";

export type ExcursionSeatStatus =
  | "free"
  | "reserved"
  | "paid"
  | "boarded"
  | "cancelled";

export interface ExcursionVehicle {
  id: string;
  partner_id: string;
  name: string;
  plate: string | null;
  capacity: number;
  seat_layout: unknown;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExcursionVehiclePayload {
  name: string;
  plate?: string | null;
  capacity: number;
  notes?: string | null;
  is_active?: boolean;
}

export interface ExcursionTrip {
  id: string;
  partner_id: string;
  vehicle_id: string | null;
  event_id: string | null;
  title: string;
  destination: string | null;
  departure_address: string | null;
  departure_at: string;
  return_at: string | null;
  session_date: string;
  capacity: number;
  price_cents: number;
  status: ExcursionTripStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExcursionTripPayload {
  title: string;
  destination?: string | null;
  departure_address?: string | null;
  departure_at: string;
  return_at?: string | null;
  session_date?: string | null;
  vehicle_id?: string | null;
  event_id?: string | null;
  capacity: number;
  price_cents?: number;
  status?: ExcursionTripStatus;
  notes?: string | null;
}

export interface ExcursionSeat {
  id: string;
  trip_id: string;
  seat_number: string;
  status: ExcursionSeatStatus;
  passenger_name: string | null;
  passenger_phone: string | null;
  passenger_doc: string | null;
  notes: string | null;
  hold_until: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================
// Vehicles
// =============================================================

export async function listExcursionVehicles(
  partnerId: string,
): Promise<ExcursionVehicle[]> {
  const { data, error } = await supabase
    .from("excursion_vehicles")
    .select("*")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ExcursionVehicle[];
}

export async function createExcursionVehicle(
  partnerId: string,
  payload: ExcursionVehiclePayload,
): Promise<ExcursionVehicle> {
  const { data, error } = await supabase
    .from("excursion_vehicles")
    .insert({
      partner_id: partnerId,
      name: payload.name.trim(),
      plate: payload.plate?.trim() || null,
      capacity: Math.max(0, Math.min(200, Math.floor(payload.capacity || 0))),
      notes: payload.notes?.trim() || null,
      is_active: payload.is_active ?? true,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as ExcursionVehicle;
}

export async function updateExcursionVehicle(
  id: string,
  payload: Partial<ExcursionVehiclePayload>,
): Promise<ExcursionVehicle> {
  const patch = {
    ...(payload.name !== undefined && { name: payload.name.trim() }),
    ...(payload.plate !== undefined && {
      plate: payload.plate?.trim() || null,
    }),
    ...(payload.capacity !== undefined && {
      capacity: Math.max(0, Math.min(200, Math.floor(payload.capacity || 0))),
    }),
    ...(payload.notes !== undefined && {
      notes: payload.notes?.trim() || null,
    }),
    ...(payload.is_active !== undefined && { is_active: payload.is_active }),
  };

  const { data, error } = await supabase
    .from("excursion_vehicles")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as ExcursionVehicle;
}

export async function deleteExcursionVehicle(id: string): Promise<void> {
  const { error } = await supabase
    .from("excursion_vehicles")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// =============================================================
// Trips
// =============================================================

export async function listExcursionTrips(
  partnerId: string,
): Promise<ExcursionTrip[]> {
  const { data, error } = await supabase
    .from("excursion_trips")
    .select("*")
    .eq("partner_id", partnerId)
    .order("departure_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ExcursionTrip[];
}

export async function getExcursionTrip(id: string): Promise<ExcursionTrip> {
  const { data, error } = await supabase
    .from("excursion_trips")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Viagem não encontrada");
  return data as ExcursionTrip;
}

export async function createExcursionTrip(
  partnerId: string,
  payload: ExcursionTripPayload,
): Promise<ExcursionTrip> {
  const departure = payload.departure_at;
  const sessionDate =
    payload.session_date ?? departure.slice(0, 10) ?? null;

  const { data, error } = await supabase
    .from("excursion_trips")
    .insert({
      partner_id: partnerId,
      vehicle_id: payload.vehicle_id ?? null,
      event_id: payload.event_id ?? null,
      title: payload.title.trim(),
      destination: payload.destination?.trim() || null,
      departure_address: payload.departure_address?.trim() || null,
      departure_at: departure,
      return_at: payload.return_at ?? null,
      ...(sessionDate ? { session_date: sessionDate } : {}),
      capacity: Math.max(0, Math.min(200, Math.floor(payload.capacity || 0))),
      price_cents: Math.max(0, Math.floor(payload.price_cents ?? 0)),
      status: payload.status ?? "draft",
      notes: payload.notes?.trim() || null,
      // public_slug é preenchido pelo trigger excursion_trips_set_slug
      // quando vier vazio. Mantemos string vazia para satisfazer o tipo
      // gerado (NOT NULL sem default a nível de coluna).
      public_slug: "",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as ExcursionTrip;
}

export async function updateExcursionTrip(
  id: string,
  payload: Partial<ExcursionTripPayload>,
): Promise<ExcursionTrip> {
  const patch = {
    ...(payload.title !== undefined && { title: payload.title.trim() }),
    ...(payload.destination !== undefined && {
      destination: payload.destination?.trim() || null,
    }),
    ...(payload.departure_address !== undefined && {
      departure_address: payload.departure_address?.trim() || null,
    }),
    ...(payload.departure_at !== undefined && {
      departure_at: payload.departure_at,
    }),
    ...(payload.return_at !== undefined && {
      return_at: payload.return_at ?? null,
    }),
    ...(payload.session_date !== undefined && {
      session_date: payload.session_date ?? undefined,
    }),
    ...(payload.vehicle_id !== undefined && {
      vehicle_id: payload.vehicle_id ?? null,
    }),
    ...(payload.event_id !== undefined && {
      event_id: payload.event_id ?? null,
    }),
    ...(payload.price_cents !== undefined && {
      price_cents: Math.max(0, Math.floor(payload.price_cents)),
    }),
    ...(payload.status !== undefined && { status: payload.status }),
    ...(payload.notes !== undefined && {
      notes: payload.notes?.trim() || null,
    }),
  };
  // capacity é deliberadamente NÃO atualizada aqui: o mapa de assentos
  // já foi gerado pelo trigger. Para alterar capacidade pós-criação use
  // addExtraExcursionSeat / removeExcursionSeat.

  const { data, error } = await supabase
    .from("excursion_trips")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as ExcursionTrip;
}

export async function setExcursionTripStatus(
  id: string,
  status: ExcursionTripStatus,
): Promise<ExcursionTrip> {
  return updateExcursionTrip(id, { status });
}

export async function deleteExcursionTrip(id: string): Promise<void> {
  const { error } = await supabase
    .from("excursion_trips")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// =============================================================
// Seats
// =============================================================

export async function listExcursionSeats(
  tripId: string,
): Promise<ExcursionSeat[]> {
  const { data, error } = await supabase
    .from("excursion_seats")
    .select("*")
    .eq("trip_id", tripId)
    .order("seat_number", { ascending: true });
  if (error) throw error;
  // ordena numericamente quando possível
  const rows = (data ?? []) as ExcursionSeat[];
  rows.sort((a, b) => {
    const na = Number(a.seat_number);
    const nb = Number(b.seat_number);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.seat_number.localeCompare(b.seat_number, "pt-BR");
  });
  return rows;
}

export interface ExcursionSeatPatch {
  status?: ExcursionSeatStatus;
  passenger_name?: string | null;
  passenger_phone?: string | null;
  passenger_doc?: string | null;
  notes?: string | null;
  hold_until?: string | null;
}

export async function updateExcursionSeat(
  id: string,
  patch: ExcursionSeatPatch,
): Promise<ExcursionSeat> {
  const update = {
    ...(patch.status !== undefined && { status: patch.status }),
    ...(patch.passenger_name !== undefined && {
      passenger_name: patch.passenger_name?.trim() || null,
    }),
    ...(patch.passenger_phone !== undefined && {
      passenger_phone: patch.passenger_phone?.trim() || null,
    }),
    ...(patch.passenger_doc !== undefined && {
      passenger_doc: patch.passenger_doc?.trim() || null,
    }),
    ...(patch.notes !== undefined && {
      notes: patch.notes?.trim() || null,
    }),
    ...(patch.hold_until !== undefined && { hold_until: patch.hold_until }),
  };

  const { data, error } = await supabase
    .from("excursion_seats")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as ExcursionSeat;
}

export async function addExtraExcursionSeat(
  tripId: string,
  seatNumber: string,
): Promise<ExcursionSeat> {
  const { data, error } = await supabase
    .from("excursion_seats")
    .insert({
      trip_id: tripId,
      seat_number: seatNumber.trim(),
      status: "free",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as ExcursionSeat;
}

export async function removeExcursionSeat(id: string): Promise<void> {
  const { error } = await supabase
    .from("excursion_seats")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// =============================================================
// Helpers
// =============================================================

export function summarizeSeats(seats: ExcursionSeat[]) {
  const total = seats.length;
  let free = 0;
  let reserved = 0;
  let paid = 0;
  let boarded = 0;
  let cancelled = 0;
  for (const s of seats) {
    if (s.status === "free") free += 1;
    else if (s.status === "reserved") reserved += 1;
    else if (s.status === "paid") paid += 1;
    else if (s.status === "boarded") boarded += 1;
    else if (s.status === "cancelled") cancelled += 1;
  }
  const occupied = reserved + paid + boarded;
  return { total, free, reserved, paid, boarded, cancelled, occupied };
}

export function seatStatusLabel(status: ExcursionSeatStatus): string {
  switch (status) {
    case "free":
      return "Livre";
    case "reserved":
      return "Reservado";
    case "paid":
      return "Pago";
    case "boarded":
      return "Embarcado";
    case "cancelled":
      return "Cancelado";
    default:
      return status;
  }
}

export function tripStatusLabel(status: ExcursionTripStatus): string {
  switch (status) {
    case "draft":
      return "Rascunho";
    case "open":
      return "Aberta";
    case "closed":
      return "Encerrada";
    case "cancelled":
      return "Cancelada";
    case "finished":
      return "Finalizada";
    default:
      return status;
  }
}
