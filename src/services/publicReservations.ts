/**
 * Public Reservations service — reservas feitas pelo cliente final.
 * Usa RPCs `submit_public_reservation` e `get_public_reservation`.
 */
import { supabase } from "@/integrations/supabase/client";

export interface PublicReservationSubmitInput {
  partner_slug: string;
  type_id: string | null;
  name: string;
  phone: string;
  email?: string | null;
  guests: number;
  reservation_date: string; // ISO
  notes?: string | null;
}

export interface PublicReservationResult {
  id: string;
  public_token: string;
  code: string;
  status: string;
  expires_at: string | null;
  qr_payload: string;
  partner_name: string;
  partner_slug: string;
}

export interface PublicReservationInfo {
  id: string;
  public_token: string;
  code: string | null;
  status: string;
  expires_at: string | null;
  name: string;
  phone: string | null;
  people_count: number;
  reservation_date: string;
  notes: string | null;
  total_price: number | null;
  deposit_amount: number | null;
  remaining_amount: number | null;
  payment_status: "pending" | "paid" | "waived" | "refunded" | null;
  payment_method: string | null;
  checked_in_at: string | null;
  qr_payload: string;
  partner_id: string;
  partner_name: string;
  partner_slug: string;
  partner_logo_url: string | null;
  partner_city: string | null;
  partner_address: string | null;
  partner_phone: string | null;
  type_kind: "table" | "bistro" | "box" | null;
  type_name: string | null;
  type_seats: number | null;
  deposit_enabled: boolean;
  pix_key: string | null;
  pix_receiver_name: string | null;
  payment_instructions: string | null;
}

export async function submitPublicReservation(
  input: PublicReservationSubmitInput,
): Promise<PublicReservationResult> {
  const { data, error } = await supabase.rpc("submit_public_reservation", {
    p_partner_slug: input.partner_slug,
    p_type_id: input.type_id,
    p_name: input.name,
    p_phone: input.phone,
    p_email: input.email ?? null,
    p_guests: input.guests,
    p_reservation_date: input.reservation_date,
    p_notes: input.notes ?? null,
  });
  if (error) throw error;
  if (!data) throw new Error("Falha ao criar reserva.");
  return data as unknown as PublicReservationResult;
}

export async function getPublicReservation(
  token: string,
): Promise<PublicReservationInfo | null> {
  const { data, error } = await supabase.rpc("get_public_reservation", {
    p_token: token,
  });
  if (error) throw error;
  return (data as unknown as PublicReservationInfo) ?? null;
}

export interface PublicPartnerForReservations {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  city: string | null;
  address: string | null;
  type: string | null;
  instagram: string | null;
  whatsapp: string | null;
  short_description: string | null;
  reservations_enabled: boolean;
  auto_confirm: boolean;
  confirmation_timeout_minutes: number;
  max_people_per_reservation: number;
  advance_booking_hours: number;
  reservations_start_at: string | null;
  reservations_end_at: string | null;
}

export interface PublicReservationType {
  id: string;
  kind: "table" | "bistro" | "box";
  name: string;
  seats: number;
  quantity: number;
  reserved: number;
  available: number;
  price: number;
  minimum_consumption: number | null;
  extra_people_limit: number | null;
  extra_people_price: number | null;
  description: string | null;
}

export async function getPublicPartnerReservationsContext(
  partnerSlug: string,
): Promise<{
  partner: PublicPartnerForReservations;
  types: PublicReservationType[];
} | null> {
  const { data: partner, error: e1 } = await supabase
    .from("partners")
    .select("id, name, slug, logo_url, city, address, type, instagram, whatsapp, short_description")
    .eq("slug", partnerSlug)
    .maybeSingle();
  if (e1) throw e1;
  if (!partner) return null;

  const { data: sett, error: e2 } = await supabase
    .from("partner_reservation_settings")
    .select(
      "reservations_enabled, auto_confirm, confirmation_timeout_minutes, max_people_per_reservation, advance_booking_hours, reservations_start_at, reservations_end_at",
    )
    .eq("partner_id", partner.id)
    .maybeSingle();
  if (e2) throw e2;

  const { data: types, error: e3 } = await supabase
    .from("partner_reservation_types")
    .select(
      "id, kind, name, seats, quantity, price, minimum_consumption, extra_people_limit, extra_people_price, description",
    )
    .eq("partner_id", partner.id)
    .eq("active", true)
    .order("kind", { ascending: true })
    .order("price", { ascending: true });
  if (e3) throw e3;

  const { data: avail, error: e4 } = await supabase.rpc(
    "get_reservation_types_availability",
    { p_partner_id: partner.id },
  );
  if (e4) throw e4;
  const availMap = new Map<
    string,
    { quantity: number; reserved: number; available: number }
  >();
  for (const a of (avail as unknown as Array<{
    type_id: string;
    quantity: number;
    reserved: number;
    available: number;
  }>) ?? []) {
    availMap.set(a.type_id, {
      quantity: a.quantity,
      reserved: a.reserved,
      available: a.available,
    });
  }

  return {
    partner: {
      id: partner.id,
      name: partner.name,
      slug: partner.slug,
      logo_url: partner.logo_url,
      city: partner.city,
      address: partner.address,
      type: (partner as { type?: string | null }).type ?? null,
      instagram: (partner as { instagram?: string | null }).instagram ?? null,
      whatsapp: (partner as { whatsapp?: string | null }).whatsapp ?? null,
      short_description:
        (partner as { short_description?: string | null }).short_description ?? null,
      reservations_enabled: sett?.reservations_enabled ?? false,
      auto_confirm: sett?.auto_confirm ?? false,
      confirmation_timeout_minutes: sett?.confirmation_timeout_minutes ?? 30,
      max_people_per_reservation: sett?.max_people_per_reservation ?? 10,
      advance_booking_hours: sett?.advance_booking_hours ?? 2,
      reservations_start_at: sett?.reservations_start_at ?? null,
      reservations_end_at: sett?.reservations_end_at ?? null,
    },
    types: (types ?? []).map((t) => {
      const a = availMap.get((t as { id: string }).id);
      return {
        ...(t as object),
        reserved: a?.reserved ?? 0,
        available: a?.available ?? (t as { quantity: number }).quantity,
      } as PublicReservationType;
    }),
  };
}

// =========================================================
// Lista de espera (público)
// =========================================================

export interface PublicWaitlistSubmitInput {
  partner_slug: string;
  type_id: string;
  name: string;
  phone: string;
  guests: number;
  notes?: string | null;
}

export interface PublicWaitlistResult {
  id: string;
  status: string;
}

export async function submitReservationWaitlist(
  input: PublicWaitlistSubmitInput,
): Promise<PublicWaitlistResult> {
  const { data, error } = await supabase.rpc("submit_reservation_waitlist", {
    p_partner_slug: input.partner_slug,
    p_type_id: input.type_id,
    p_name: input.name,
    p_phone: input.phone,
    p_guests: input.guests,
    p_notes: input.notes ?? null,
  });
  if (error) throw error;
  return data as unknown as PublicWaitlistResult;
}
