/**
 * Excursão GPS service — Fase 7.4
 *
 * Operações de tempo real:
 *  - `pushGps` (motorista/equipe envia ping)
 *  - `setOperationStatus` (organizador troca status operacional)
 *  - `getPublicLive` (passageiro vê via token)
 *  - `getLatestPing` / `subscribeLatestPing` (operação interna)
 *
 * Todas passam por RPCs SECURITY DEFINER que validam parceiro/admin.
 */
import { supabase } from "@/integrations/supabase/client";

export type ExcursionOperationStatus =
  | "scheduled"
  | "boarding"
  | "en_route"
  | "arrived"
  | "returning"
  | "completed"
  | "cancelled";

export interface ExcursionGpsPing {
  lat: number;
  lng: number;
  speed: number | null;
  heading: number | null;
  recorded_at: string;
}

export interface PublicLiveData {
  operation_status: ExcursionOperationStatus;
  gps_started_at: string | null;
  gps_ended_at: string | null;
  departure_at: string;
  return_at: string | null;
  ping: ExcursionGpsPing | null;
}

export async function pushGps(args: {
  trip_id: string;
  lat: number;
  lng: number;
  speed?: number | null;
  heading?: number | null;
  accuracy?: number | null;
}): Promise<{ ok: boolean; reason?: string }> {
  const { data, error } = await supabase.rpc("excursion_push_gps", {
    _trip_id: args.trip_id,
    _lat: args.lat,
    _lng: args.lng,
    _speed: args.speed ?? null,
    _heading: args.heading ?? null,
    _accuracy: args.accuracy ?? null,
  });
  if (error) throw error;
  return (data as { ok: boolean; reason?: string }) ?? { ok: false };
}

export async function setOperationStatus(
  trip_id: string,
  status: ExcursionOperationStatus,
): Promise<{ ok: boolean; reason?: string }> {
  const { data, error } = await supabase.rpc("excursion_set_operation_status", {
    _trip_id: trip_id,
    _status: status,
  });
  if (error) throw error;
  return (data as { ok: boolean; reason?: string }) ?? { ok: false };
}

export async function getPublicLive(token: string): Promise<PublicLiveData | null> {
  const { data, error } = await supabase.rpc("public_get_excursion_live", {
    _token: token,
  });
  if (error) throw error;
  return (data as unknown as PublicLiveData) ?? null;
}

export async function getLatestPing(trip_id: string): Promise<ExcursionGpsPing | null> {
  const { data, error } = await supabase
    .from("excursion_gps_pings")
    .select("lat, lng, speed, heading, recorded_at")
    .eq("trip_id", trip_id)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as ExcursionGpsPing | null) ?? null;
}

/**
 * Subscribe a Realtime: chama `onPing` toda vez que um novo ping é gravado
 * para `trip_id`. Retorna função de unsubscribe.
 */
export function subscribeLatestPing(
  trip_id: string,
  onPing: (ping: ExcursionGpsPing) => void,
): () => void {
  const channel = supabase
    .channel(`excursion_gps_${trip_id}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "excursion_gps_pings",
        filter: `trip_id=eq.${trip_id}`,
      },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        onPing({
          lat: Number(row.lat),
          lng: Number(row.lng),
          speed: row.speed == null ? null : Number(row.speed),
          heading: row.heading == null ? null : Number(row.heading),
          recorded_at: String(row.recorded_at),
        });
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

/**
 * Subscribe a mudanças de operation_status na própria viagem.
 */
export function subscribeTripStatus(
  trip_id: string,
  onChange: (op: ExcursionOperationStatus) => void,
): () => void {
  const channel = supabase
    .channel(`excursion_trip_${trip_id}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "excursion_trips",
        filter: `id=eq.${trip_id}`,
      },
      (payload) => {
        const op = (payload.new as { operation_status?: ExcursionOperationStatus })
          .operation_status;
        if (op) onChange(op);
      },
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

export const operationStatusLabel: Record<ExcursionOperationStatus, string> = {
  scheduled: "Agendada",
  boarding: "Embarque aberto",
  en_route: "Em deslocamento",
  arrived: "Chegou ao local",
  returning: "Retornando",
  completed: "Finalizada",
  cancelled: "Cancelada",
};

export const operationStatusEmoji: Record<ExcursionOperationStatus, string> = {
  scheduled: "🕒",
  boarding: "🎫",
  en_route: "🚍",
  arrived: "📍",
  returning: "↩️",
  completed: "✅",
  cancelled: "🚫",
};
