/**
 * CRM 360 — agregações somente leitura sobre crm_customer_links.
 * Sem campanhas, sem IA. Apenas consolidação de histórico.
 */
import { supabase } from "@/integrations/supabase/client";
import type { CrmLink } from "@/services/crm";

export type CrmStatus = "Novo" | "Recorrente" | "Frequente" | "VIP";

const WEIGHTS: Record<string, number> = {
  reservation: 10,
  checkin: 8,
  excursion: 12,
  vip_list: 6,
  ride: 4,
};

export interface Crm360Summary {
  counts: Record<string, number>;
  totalInteractions: number;
  score: number;
  status: CrmStatus;
  firstOrigin: { source_type: string; created_at: string } | null;
  lastActivity: { source_type: string; created_at: string } | null;
}

export function computeSummary(links: CrmLink[]): Crm360Summary {
  const counts: Record<string, number> = {};
  for (const l of links) counts[l.source_type] = (counts[l.source_type] ?? 0) + 1;

  let score = 0;
  for (const [k, n] of Object.entries(counts)) score += (WEIGHTS[k] ?? 3) * n;
  score = Math.min(100, score);

  const status: CrmStatus =
    score >= 80 ? "VIP" : score >= 50 ? "Frequente" : score >= 20 ? "Recorrente" : "Novo";

  const sorted = [...links].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const first = sorted[0] ?? null;
  const last = sorted[sorted.length - 1] ?? null;

  return {
    counts,
    totalInteractions: links.length,
    score,
    status,
    firstOrigin: first ? { source_type: first.source_type, created_at: first.created_at } : null,
    lastActivity: last ? { source_type: last.source_type, created_at: last.created_at } : null,
  };
}

export interface EntityMap {
  events: Map<string, { id: string; title: string | null }>;
  partners: Map<string, { id: string; name: string | null }>;
}

export async function fetchEntityMap(links: CrmLink[]): Promise<EntityMap> {
  const eventIds = Array.from(new Set(links.map((l) => l.event_id).filter(Boolean) as string[]));
  const partnerIds = Array.from(
    new Set(links.map((l) => l.partner_id).filter(Boolean) as string[]),
  );

  const events = new Map<string, { id: string; title: string | null }>();
  const partners = new Map<string, { id: string; name: string | null }>();

  if (eventIds.length) {
    const { data } = await supabase.from("events").select("id,title").in("id", eventIds);
    for (const e of data ?? []) events.set(e.id, { id: e.id, title: (e as any).title ?? null });
  }
  if (partnerIds.length) {
    const { data } = await supabase.from("partners").select("id,name").in("id", partnerIds);
    for (const p of data ?? []) partners.set(p.id, { id: p.id, name: (p as any).name ?? null });
  }
  return { events, partners };
}

export interface RankedItem {
  id: string;
  label: string;
  count: number;
}

export function rankEvents(links: CrmLink[], map: EntityMap): RankedItem[] {
  const tally = new Map<string, number>();
  for (const l of links) if (l.event_id) tally.set(l.event_id, (tally.get(l.event_id) ?? 0) + 1);
  return Array.from(tally.entries())
    .map(([id, count]) => ({
      id,
      count,
      label: map.events.get(id)?.title ?? id.slice(0, 8),
    }))
    .sort((a, b) => b.count - a.count);
}

export function rankPartners(links: CrmLink[], map: EntityMap): RankedItem[] {
  const tally = new Map<string, number>();
  for (const l of links)
    if (l.partner_id) tally.set(l.partner_id, (tally.get(l.partner_id) ?? 0) + 1);
  return Array.from(tally.entries())
    .map(([id, count]) => ({
      id,
      count,
      label: map.partners.get(id)?.name ?? id.slice(0, 8),
    }))
    .sort((a, b) => b.count - a.count);
}

export const SOURCE_LABELS: Record<string, string> = {
  reservation: "Reserva",
  vip_list: "Lista VIP",
  excursion: "Excursão",
  ride: "Carona",
  checkin: "Check-in",
};

export function sourceLabel(s: string): string {
  return SOURCE_LABELS[s] ?? s;
}

export function statusBadgeVariant(status: CrmStatus): "default" | "secondary" | "outline" {
  if (status === "VIP") return "default";
  if (status === "Frequente") return "default";
  if (status === "Recorrente") return "secondary";
  return "outline";
}
