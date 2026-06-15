/**
 * services/aura.ts — leitura de alertas/queues do motor Aura.
 * ADITIVO.
 */
import { supabase } from "@/integrations/supabase/client";

export type AuraAlertRow = Record<string, any>;
export type AutoReelQueueRow = Record<string, any>;

export async function listOpenAuraAlerts(limit = 100): Promise<AuraAlertRow[]> {
  const { data, error } = await (supabase as any)
    .from("aura_alerts")
    .select("*")
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as AuraAlertRow[]) ?? [];
}

export async function listAutoReelsQueue(limit = 50): Promise<AutoReelQueueRow[]> {
  const { data, error } = await supabase
    .from("auto_reels_queue")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
