/**
 * services/transport.ts — carona/motorista.
 * ADITIVO.
 */
import { supabase } from "@/integrations/supabase/client";

export type RideRequestRow = Record<string, any>;
export type RideOfferRow = Record<string, any>;

export async function getRideRequestById(id: string): Promise<RideRequestRow | null> {
  const { data, error } = await supabase
    .from("ride_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function listMyRideRequests(userId: string): Promise<RideRequestRow[]> {
  const { data, error } = await supabase
    .from("ride_requests")
    .select("*")
    .eq("passenger_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listOpenRideOffersForDriver(driverId: string): Promise<RideOfferRow[]> {
  const { data, error } = await supabase
    .from("ride_offers")
    .select("*")
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
