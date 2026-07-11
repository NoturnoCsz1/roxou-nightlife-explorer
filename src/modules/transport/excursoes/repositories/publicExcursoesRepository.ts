/**
 * Public Excursões service — Fase 7.3
 *
 * Cliente público (sem login) usa estas funções para ver viagens,
 * reservar assento e consultar comprovante por token.
 * Toda a leitura/escrita passa por RPCs SECURITY DEFINER no Postgres
 * (`public_get_excursion_trip`, `public_reserve_excursion_seat`,
 * `public_get_excursion_ticket`) — não há acesso direto às tabelas.
 */
import { supabase } from "@/integrations/supabase/client";

export type PublicSeatStatus =
  | "free"
  | "reserved"
  | "paid"
  | "boarded"
  | "cancelled";

export interface PublicSeat {
  id: string;
  seat_number: string;
  status: PublicSeatStatus;
}

export interface PublicTrip {
  id: string;
  public_slug: string;
  title: string;
  destination: string | null;
  departure_address: string | null;
  departure_at: string;
  return_at: string | null;
  session_date: string;
  capacity: number;
  price_cents: number;
  status: string;
  notes: string | null;
  event_id: string | null;
}

export interface PublicPartner {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  instagram: string | null;
  whatsapp: string | null;
}

export interface PublicTripBundle {
  trip: PublicTrip;
  partner: PublicPartner | null;
  seats: PublicSeat[];
}

export async function getPublicExcursionTrip(
  slug: string,
): Promise<PublicTripBundle | null> {
  const { data, error } = await supabase.rpc("public_get_excursion_trip", {
    _slug: slug,
  });
  if (error) throw error;
  if (!data) return null;
  return data as unknown as PublicTripBundle;
}

export interface ReserveSeatPayload {
  trip_id: string;
  seat_id: string;
  name: string;
  phone: string;
  doc?: string | null;
}

export interface ReserveSeatResult {
  ok: boolean;
  reason?: string;
  qr_token?: string;
  seat_id?: string;
  trip_id?: string;
  public_slug?: string;
}

export async function reserveExcursionSeat(
  payload: ReserveSeatPayload,
): Promise<ReserveSeatResult> {
  const { data, error } = await supabase.rpc(
    "public_reserve_excursion_seat",
    {
      _trip_id: payload.trip_id,
      _seat_id: payload.seat_id,
      _name: payload.name,
      _phone: payload.phone,
      _doc: payload.doc ?? null,
    },
  );
  if (error) throw error;
  return (data as unknown as ReserveSeatResult) ?? { ok: false, reason: "unknown" };
}

export interface PublicTicket {
  seat: {
    id: string;
    seat_number: string;
    status: PublicSeatStatus;
    passenger_name: string | null;
    passenger_phone: string | null;
    qr_token: string;
    reserved_at: string | null;
    boarded_at: string | null;
  };
  trip: PublicTrip;
  partner: PublicPartner | null;
}

export async function getPublicExcursionTicket(
  token: string,
): Promise<PublicTicket | null> {
  const { data, error } = await supabase.rpc("public_get_excursion_ticket", {
    _token: token,
  });
  if (error) throw error;
  if (!data) return null;
  return data as unknown as PublicTicket;
}

export function buildExcursionQrPayload(token: string): string {
  return `roxou://checkin?type=excursion&token=${token}`;
}

export function reserveReasonMessage(reason?: string): string {
  switch (reason) {
    case "invalid_name":
      return "Informe um nome válido.";
    case "invalid_phone":
      return "Informe um telefone válido com DDD.";
    case "trip_not_found":
      return "Viagem não encontrada.";
    case "trip_not_open":
      return "As reservas para esta viagem não estão abertas.";
    case "seat_not_found":
      return "Assento não encontrado.";
    case "seat_taken":
      return "Esse assento acabou de ser reservado. Escolha outro.";
    default:
      return "Não foi possível concluir a reserva. Tente novamente.";
  }
}
