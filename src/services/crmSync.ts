/**
 * CRM Roxou — Fase 2: ingestão controlada.
 * Lê dados existentes (Reservas, VIP, Excursões) e alimenta o CRM via
 * crm_upsert_customer_and_link. Sem disparos, sem exportação, sem campanhas.
 */
import { supabase } from "@/integrations/supabase/client";
import { upsertCrmCustomer, type CrmSourceType } from "@/services/crm";

export interface SyncCandidate {
  source_type: CrmSourceType;
  source_id: string;
  partner_id: string | null;
  event_id: string | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  source_label: string;
}

export interface SyncPreview {
  candidates: SyncCandidate[];
  totalRaw: number;
  uniqueCustomers: number;
  withoutContact: number;
  perSource: Record<string, number>;
}

function normalize(p?: string | null) {
  if (!p) return null;
  const d = p.replace(/\D/g, "");
  return d.length >= 8 ? d : null;
}

function dedupeKey(c: SyncCandidate) {
  return normalize(c.phone) ?? (c.email?.toLowerCase().trim() || null);
}

async function fetchReservations(): Promise<SyncCandidate[]> {
  const { data } = await supabase
    .from("partner_reservations")
    .select("id, partner_id, event_id, name, phone, email")
    .not("status", "in", "(cancelled,canceled)")
    .limit(5000);
  return (data ?? []).map((r) => ({
    source_type: "reservation" as CrmSourceType,
    source_id: r.id,
    partner_id: r.partner_id,
    event_id: r.event_id,
    full_name: r.name,
    phone: r.phone,
    email: r.email,
    source_label: "reservation",
  }));
}

async function fetchVipEntries(): Promise<SyncCandidate[]> {
  const { data } = await supabase
    .from("partner_vip_list_entries")
    .select("id, partner_id, event_id, name, phone, email")
    .limit(5000);
  return (data ?? []).map((r) => ({
    source_type: "vip_list" as CrmSourceType,
    source_id: r.id,
    partner_id: r.partner_id,
    event_id: r.event_id,
    full_name: r.name,
    phone: r.phone,
    email: r.email,
    source_label: "vip_list",
  }));
}

async function fetchExcursionSeats(): Promise<SyncCandidate[]> {
  const { data: seats } = await supabase
    .from("excursion_seats")
    .select("id, trip_id, passenger_name, passenger_phone")
    .not("passenger_name", "is", null)
    .limit(5000);
  if (!seats?.length) return [];
  const tripIds = Array.from(new Set(seats.map((s) => s.trip_id).filter(Boolean)));
  const { data: trips } = await supabase
    .from("excursion_trips")
    .select("id, partner_id, event_id")
    .in("id", tripIds);
  const tripMap = new Map((trips ?? []).map((t) => [t.id, t]));
  return seats.map((s) => {
    const t = tripMap.get(s.trip_id);
    return {
      source_type: "excursion" as CrmSourceType,
      source_id: s.id,
      partner_id: t?.partner_id ?? null,
      event_id: t?.event_id ?? null,
      full_name: s.passenger_name,
      phone: s.passenger_phone,
      email: null,
      source_label: "excursion",
    };
  });
}

export async function buildSyncPreview(): Promise<SyncPreview> {
  const [r, v, e] = await Promise.all([
    fetchReservations(),
    fetchVipEntries(),
    fetchExcursionSeats(),
  ]);
  const all = [...r, ...v, ...e];
  const withoutContact = all.filter((c) => !dedupeKey(c)).length;
  const usable = all.filter((c) => dedupeKey(c));
  const unique = new Set(usable.map(dedupeKey)).size;
  const perSource: Record<string, number> = {
    reservation: r.length,
    vip_list: v.length,
    excursion: e.length,
    ride: 0,
    checkin: 0,
  };
  return {
    candidates: usable,
    totalRaw: all.length,
    uniqueCustomers: unique,
    withoutContact,
    perSource,
  };
}

export interface SyncResult {
  processed: number;
  linksCreated: number;
  errors: { source_type: string; source_id: string; message: string }[];
  customerIds: string[];
}

export async function runSync(
  preview: SyncPreview,
  onProgress?: (done: number, total: number) => void,
): Promise<SyncResult> {
  const errors: SyncResult["errors"] = [];
  const customerIds = new Set<string>();
  let processed = 0;
  let linksCreated = 0;

  for (const c of preview.candidates) {
    try {
      const id = await upsertCrmCustomer({
        full_name: c.full_name,
        phone: c.phone,
        email: c.email,
        source: c.source_label,
        partner_id: c.partner_id,
        event_id: c.event_id,
        source_type: c.source_type,
        source_id: c.source_id,
        marketing_consent: false,
      });
      if (id) {
        customerIds.add(id);
        linksCreated += 1;
      } else {
        errors.push({
          source_type: c.source_type,
          source_id: c.source_id,
          message: "RPC retornou null",
        });
      }
    } catch (err) {
      errors.push({
        source_type: c.source_type,
        source_id: c.source_id,
        message: (err as Error).message,
      });
    }
    processed += 1;
    if (processed % 5 === 0) onProgress?.(processed, preview.candidates.length);
  }
  onProgress?.(processed, preview.candidates.length);
  return {
    processed,
    linksCreated,
    errors,
    customerIds: Array.from(customerIds),
  };
}
