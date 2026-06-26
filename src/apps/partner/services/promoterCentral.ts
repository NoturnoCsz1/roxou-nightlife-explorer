/**
 * Promoter Central Service — Fase Final
 *
 * Agrega tudo em runtime. Sem novas tabelas/RPCs.
 * Reutiliza: partner_promoters, partner_vip_lists, partner_vip_list_entries,
 * partner_reservations, excursion_trips, excursion_seats, analytics_events, events.
 */
import { supabase } from "@/integrations/supabase/client";
import { getDateKeySP } from "@/lib/dateUtils";

// =================== Tipos ===================

export type ScoreTier = "Iniciante" | "Bom" | "Forte" | "Top Performer";

export interface PromoterRankingRow {
  promoter_id: string | null;
  promoter_name: string;
  total_entries: number;
  checked_in: number;
  approved: number;
  pending: number;
  conversion_rate: number;
  commission_brl: number;
  score: number;
  tier: ScoreTier;
}

export interface ActivityKindMeta {
  kind:
    | "vip_entry"
    | "vip_checkin"
    | "reservation"
    | "excursion"
    | "bio_view"
    | "link_clicked"
    | "whatsapp_clicked"
    | "qr_scanned";
  at: string;
  title: string;
  subtitle: string;
}

export interface CampaignSummary {
  event_id: string | null;
  vip_list_id: string;
  list_title: string;
  event_title: string | null;
  event_slug: string | null;
  list_public_slug: string;
  starts_at: string | null;
  total_entries: number;
  checked_in: number;
  goal: number;
}

export interface PromoterOverviewKpis {
  reach: number;
  leads: number;
  vip_entries: number;
  checkins: number;
  no_shows: number;
  reservations: number;
  excursions: number;
  attendance_rate: number; // 0..100
  recurrent_customers: number;
  pending_entries: number;
  unique_clicks: number;
  commission_brl: number;
}

export interface FunnelStep {
  label: string;
  value: number;
}

export interface ChannelConversion {
  channel: string;
  clicks: number;
  entries: number;
  conversion: number;
}

export interface InsightRow {
  title: string;
  detail: string;
  tone: "positive" | "neutral" | "warning";
}

// =================== Helpers ===================

const REAIS_FROM_CENTS = (c: number) => c / 100;

function startOfMonthIso(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function nDaysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function classifyScore(score: number): ScoreTier {
  if (score >= 90) return "Top Performer";
  if (score >= 60) return "Forte";
  if (score >= 30) return "Bom";
  return "Iniciante";
}

// =================== Data loaders ===================

type EntryRow = {
  id: string;
  vip_list_id: string;
  event_id: string | null;
  promoter_id: string | null;
  promoter_name_snapshot: string | null;
  status: string;
  people_count: number | null;
  created_at: string;
  checked_in_at: string | null;
  name: string | null;
  phone: string | null;
};

async function loadEntries(partnerId: string, sinceIso?: string): Promise<EntryRow[]> {
  let q = supabase
    .from("partner_vip_list_entries")
    .select(
      "id, vip_list_id, event_id, promoter_id, promoter_name_snapshot, status, people_count, created_at, checked_in_at, name, phone",
    )
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: false })
    .limit(2000);
  if (sinceIso) q = q.gte("created_at", sinceIso);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as EntryRow[];
}

interface CommissionInputs {
  vipCheckinBRL: number;
  reservationBRL: number;
  excursionBRL: number;
}

function buildCommissionFromSettings(s: {
  commission: { vip_checkin_cents: number; reservation_cents: number; excursion_cents: number };
}): CommissionInputs {
  return {
    vipCheckinBRL: REAIS_FROM_CENTS(s.commission.vip_checkin_cents),
    reservationBRL: REAIS_FROM_CENTS(s.commission.reservation_cents),
    excursionBRL: REAIS_FROM_CENTS(s.commission.excursion_cents),
  };
}

// =================== Ranking + Score ===================

export async function getPromoterRanking(
  partnerId: string,
  settings: {
    commission: { vip_checkin_cents: number; reservation_cents: number; excursion_cents: number };
  },
): Promise<PromoterRankingRow[]> {
  const com = buildCommissionFromSettings(settings);
  const entries = await loadEntries(partnerId, startOfMonthIso());

  const byPromoter = new Map<string, PromoterRankingRow>();
  const listsBy = new Map<string, Set<string>>(); // promoterKey -> distinct vip_list_id

  for (const e of entries) {
    const key = e.promoter_id ?? "__none__";
    const name = e.promoter_name_snapshot ?? "Sem promoter";
    const row =
      byPromoter.get(key) ??
      ({
        promoter_id: e.promoter_id,
        promoter_name: name,
        total_entries: 0,
        checked_in: 0,
        approved: 0,
        pending: 0,
        conversion_rate: 0,
        commission_brl: 0,
        score: 0,
        tier: "Iniciante",
      } as PromoterRankingRow);
    const people = e.people_count ?? 1;
    row.total_entries += people;
    if (e.status === "checked_in") row.checked_in += people;
    else if (e.status === "approved") row.approved += people;
    else if (e.status === "pending") row.pending += people;
    byPromoter.set(key, row);
    if (!listsBy.has(key)) listsBy.set(key, new Set());
    listsBy.get(key)!.add(e.vip_list_id);
  }

  const rows = Array.from(byPromoter.entries()).map(([key, r]) => {
    const lists = listsBy.get(key)?.size ?? 0;
    const conv = r.total_entries
      ? Math.round((r.checked_in / r.total_entries) * 100)
      : 0;
    // score = check-ins*10 + listas*5 + bônus comparecimento
    const attendanceBonus = Math.round(conv / 5); // 0..20
    const score = r.checked_in * 10 + lists * 5 + attendanceBonus;
    return {
      ...r,
      conversion_rate: conv,
      commission_brl: r.checked_in * com.vipCheckinBRL,
      score,
      tier: classifyScore(score),
    };
  });
  rows.sort(
    (a, b) =>
      b.score - a.score ||
      b.checked_in - a.checked_in ||
      b.total_entries - a.total_entries,
  );
  return rows;
}

// =================== Campanhas ===================

export async function getCampaigns(
  partnerId: string,
  perEventGoal: number,
): Promise<CampaignSummary[]> {
  const { data: lists, error } = await supabase
    .from("partner_vip_lists")
    .select("id, title, status, public_slug, starts_at, event_id, max_entries")
    .eq("partner_id", partnerId)
    .in("status", ["open", "draft", "closed"])
    .order("starts_at", { ascending: false, nullsFirst: false })
    .limit(50);
  if (error) throw error;
  const listRows = (lists ?? []) as Array<{
    id: string;
    title: string;
    status: string;
    public_slug: string;
    starts_at: string | null;
    event_id: string | null;
    max_entries: number | null;
  }>;
  if (!listRows.length) return [];

  const eventIds = listRows.map((l) => l.event_id).filter((x): x is string => !!x);
  const eventsMap = new Map<string, { title: string; slug: string | null }>();
  if (eventIds.length) {
    const { data: evs } = await supabase
      .from("events")
      .select("id, title, slug")
      .in("id", eventIds);
    for (const e of evs ?? []) eventsMap.set(e.id, { title: e.title, slug: e.slug });
  }

  const listIds = listRows.map((l) => l.id);
  const { data: entries } = await supabase
    .from("partner_vip_list_entries")
    .select("vip_list_id, status, people_count")
    .in("vip_list_id", listIds);

  const counts = new Map<string, { total: number; checkedIn: number }>();
  for (const e of (entries ?? []) as Array<{
    vip_list_id: string;
    status: string;
    people_count: number | null;
  }>) {
    const c = counts.get(e.vip_list_id) ?? { total: 0, checkedIn: 0 };
    const people = e.people_count ?? 1;
    c.total += people;
    if (e.status === "checked_in") c.checkedIn += people;
    counts.set(e.vip_list_id, c);
  }

  return listRows.map((l) => {
    const ev = l.event_id ? eventsMap.get(l.event_id) : null;
    const c = counts.get(l.id) ?? { total: 0, checkedIn: 0 };
    return {
      vip_list_id: l.id,
      event_id: l.event_id,
      list_title: l.title,
      event_title: ev?.title ?? null,
      event_slug: ev?.slug ?? null,
      list_public_slug: l.public_slug,
      starts_at: l.starts_at,
      total_entries: c.total,
      checked_in: c.checkedIn,
      goal: l.max_entries ?? perEventGoal,
    };
  });
}

// =================== Overview KPIs ===================

export async function getPromoterOverview(
  partnerId: string,
  settings: {
    commission: { vip_checkin_cents: number; reservation_cents: number; excursion_cents: number };
  },
): Promise<PromoterOverviewKpis> {
  const sinceMonth = startOfMonthIso();
  const com = buildCommissionFromSettings(settings);

  const [entriesRes, resRes, tripsRes, eventsForPartner, analyticsRes] = await Promise.all([
    loadEntries(partnerId, sinceMonth),
    supabase
      .from("partner_reservations")
      .select("id, status, checked_in_at, people_count, phone, customer_id", { count: "exact" })
      .eq("partner_id", partnerId)
      .gte("created_at", sinceMonth)
      .limit(2000),
    supabase
      .from("excursion_trips")
      .select("id")
      .eq("partner_id", partnerId)
      .gte("created_at", sinceMonth)
      .limit(500),
    supabase
      .from("events")
      .select("id")
      .eq("partner_id", partnerId)
      .limit(500),
    supabase
      .from("analytics_events")
      .select("event_type, session_id, created_at, venue_id, event_id")
      .eq("venue_id", partnerId)
      .gte("created_at", sinceMonth)
      .limit(5000),
  ]);

  const entries = entriesRes;
  const reservations = (resRes.data ?? []) as Array<{
    status: string;
    checked_in_at: string | null;
    people_count: number | null;
    phone: string | null;
    customer_id: string | null;
  }>;
  const trips = (tripsRes.data ?? []) as Array<{ id: string }>;
  const analytics = (analyticsRes.data ?? []) as Array<{
    event_type: string;
    session_id: string | null;
  }>;
  void eventsForPartner;

  const vipEntries = entries.reduce((a, e) => a + (e.people_count ?? 1), 0);
  const checkins = entries
    .filter((e) => e.status === "checked_in")
    .reduce((a, e) => a + (e.people_count ?? 1), 0);
  const noShows = entries
    .filter((e) => e.status === "no_show")
    .reduce((a, e) => a + (e.people_count ?? 1), 0);
  const pending = entries
    .filter((e) => e.status === "pending")
    .reduce((a, e) => a + (e.people_count ?? 1), 0);
  const attendanceBase = checkins + noShows;
  const attendance = attendanceBase ? Math.round((checkins / attendanceBase) * 100) : 0;

  const reservationsConfirmed = reservations.filter((r) =>
    ["confirmed", "completed", "checked_in"].includes(r.status),
  ).length;
  const reservationCheckins = reservations.filter((r) => !!r.checked_in_at).length;

  const uniqueClicks = new Set(
    analytics
      .filter((a) => a.event_type === "click" || a.event_type === "ticket_click")
      .map((a) => a.session_id ?? ""),
  ).size;
  const reach = new Set(
    analytics
      .filter((a) => a.event_type === "page_view" || a.event_type === "bio_view")
      .map((a) => a.session_id ?? ""),
  ).size;

  // "Leads" = pessoas distintas com phone (entries + reservas)
  const phonesEntries = entries.map((e) => e.phone).filter(Boolean) as string[];
  const phonesRes = reservations.map((r) => r.phone).filter(Boolean) as string[];
  const leads = new Set([...phonesEntries, ...phonesRes]).size;

  // Recorrentes: customer_id já vinculado
  const recurrent = new Set(
    reservations.map((r) => r.customer_id).filter(Boolean) as string[],
  ).size;

  const commission =
    checkins * com.vipCheckinBRL +
    reservationCheckins * com.reservationBRL +
    trips.length * com.excursionBRL;

  return {
    reach,
    leads,
    vip_entries: vipEntries,
    checkins,
    no_shows: noShows,
    reservations: reservationsConfirmed,
    excursions: trips.length,
    attendance_rate: attendance,
    recurrent_customers: recurrent,
    pending_entries: pending,
    unique_clicks: uniqueClicks,
    commission_brl: commission,
  };
}

// =================== Funil + canais ===================

export async function getFunnelAndChannels(
  partnerId: string,
): Promise<{ funnel: FunnelStep[]; channels: ChannelConversion[] }> {
  const sinceMonth = startOfMonthIso();
  const [entriesRes, analyticsRes] = await Promise.all([
    loadEntries(partnerId, sinceMonth),
    supabase
      .from("analytics_events")
      .select("event_type, session_id, metadata")
      .eq("venue_id", partnerId)
      .gte("created_at", sinceMonth)
      .limit(5000),
  ]);
  const entries = entriesRes;
  const analytics = (analyticsRes.data ?? []) as Array<{
    event_type: string;
    session_id: string | null;
    metadata: Record<string, unknown> | null;
  }>;

  const views = new Set(
    analytics
      .filter((a) => a.event_type === "page_view" || a.event_type === "bio_view")
      .map((a) => a.session_id ?? ""),
  ).size;
  const clicks = new Set(
    analytics
      .filter((a) => a.event_type === "click" || a.event_type === "ticket_click")
      .map((a) => a.session_id ?? ""),
  ).size;
  const totalEntries = entries.length;
  const checkins = entries.filter((e) => e.status === "checked_in").length;

  const funnel: FunnelStep[] = [
    { label: "Visualizações", value: views },
    { label: "Cliques", value: clicks },
    { label: "Entradas VIP", value: totalEntries },
    { label: "Check-ins", value: checkins },
  ];

  // Canais via utm_term ou utm_medium em metadata
  const channelMap = new Map<string, { clicks: number; entries: number }>();
  for (const a of analytics) {
    if (a.event_type !== "click" && a.event_type !== "ticket_click") continue;
    const meta = a.metadata ?? {};
    const ch =
      (meta["utm_term"] as string) ||
      (meta["utm_medium"] as string) ||
      (meta["channel"] as string) ||
      "outros";
    const c = channelMap.get(ch) ?? { clicks: 0, entries: 0 };
    c.clicks += 1;
    channelMap.set(ch, c);
  }
  // Atribui entradas por canal só se metadata existir nas entries (raro)
  const channels: ChannelConversion[] = Array.from(channelMap.entries())
    .map(([channel, v]) => ({
      channel,
      clicks: v.clicks,
      entries: v.entries,
      conversion: v.clicks ? Math.round((v.entries / v.clicks) * 100) : 0,
    }))
    .sort((a, b) => b.clicks - a.clicks);

  return { funnel, channels };
}

// =================== Timeline (HubSpot-style) ===================

export interface TimelineGroup {
  label: string; // "Hoje", "Ontem", "DD/MM"
  date: string; // YYYY-MM-DD (SP)
  items: ActivityKindMeta[];
}

export async function getTimeline(
  partnerId: string,
  limit = 60,
): Promise<TimelineGroup[]> {
  const since = nDaysAgoIso(14);
  const [entriesRes, resRes, tripsRes, analyticsRes] = await Promise.all([
    loadEntries(partnerId, since),
    supabase
      .from("partner_reservations")
      .select("id, name, status, checked_in_at, created_at, phone")
      .eq("partner_id", partnerId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("excursion_trips")
      .select("id, title, created_at")
      .eq("partner_id", partnerId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("analytics_events")
      .select("event_type, created_at, metadata")
      .eq("venue_id", partnerId)
      .gte("created_at", since)
      .in("event_type", [
        "bio_view",
        "click",
        "ticket_click",
        "whatsapp_click",
        "qr_scan",
        "link_clicked",
      ])
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const items: ActivityKindMeta[] = [];
  for (const e of entriesRes) {
    items.push({
      kind: "vip_entry",
      at: e.created_at,
      title: e.name ?? "Convidado",
      subtitle: `Entrou na lista${e.promoter_name_snapshot ? ` via ${e.promoter_name_snapshot}` : ""}`,
    });
    if (e.checked_in_at) {
      items.push({
        kind: "vip_checkin",
        at: e.checked_in_at,
        title: e.name ?? "Convidado",
        subtitle: `Check-in confirmado${e.promoter_name_snapshot ? ` (${e.promoter_name_snapshot})` : ""}`,
      });
    }
  }
  for (const r of (resRes.data ?? []) as Array<{
    name: string;
    status: string;
    checked_in_at: string | null;
    created_at: string;
  }>) {
    items.push({
      kind: "reservation",
      at: r.created_at,
      title: r.name,
      subtitle: `Reserva ${r.status}`,
    });
  }
  for (const t of (tripsRes.data ?? []) as Array<{ title: string; created_at: string }>) {
    items.push({
      kind: "excursion",
      at: t.created_at,
      title: t.title,
      subtitle: "Excursão criada",
    });
  }
  for (const a of (analyticsRes.data ?? []) as Array<{
    event_type: string;
    created_at: string;
    metadata: Record<string, unknown> | null;
  }>) {
    const kind: ActivityKindMeta["kind"] =
      a.event_type === "bio_view"
        ? "bio_view"
        : a.event_type === "whatsapp_click"
          ? "whatsapp_clicked"
          : a.event_type === "qr_scan"
            ? "qr_scanned"
            : "link_clicked";
    const label =
      kind === "bio_view"
        ? "Visualização da Bio"
        : kind === "whatsapp_clicked"
          ? "Clique no WhatsApp"
          : kind === "qr_scanned"
            ? "QR escaneado"
            : "Clique no link";
    items.push({ kind, at: a.created_at, title: label, subtitle: "Visitante anônimo" });
  }

  items.sort((a, b) => (a.at < b.at ? 1 : -1));
  const sliced = items.slice(0, limit);

  const today = getDateKeySP(new Date());
  const yesterday = getDateKeySP(new Date(Date.now() - 86400 * 1000));
  const groups = new Map<string, TimelineGroup>();
  for (const it of sliced) {
    const key = getDateKeySP(new Date(it.at));
    const label =
      key === today
        ? "Hoje"
        : key === yesterday
          ? "Ontem"
          : new Date(it.at).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
            });
    const g = groups.get(key) ?? { label, date: key, items: [] };
    g.items.push(it);
    groups.set(key, g);
  }
  return Array.from(groups.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
}

// =================== Série diária ===================

export async function getDailyCheckInsSeries(partnerId: string, days = 14) {
  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  since.setHours(0, 0, 0, 0);
  const entries = await loadEntries(partnerId, since.toISOString());
  const map = new Map<string, number>();
  for (const e of entries) {
    if (!e.checked_in_at) continue;
    const key = getDateKeySP(new Date(e.checked_in_at));
    map.set(key, (map.get(key) ?? 0) + (e.people_count ?? 1));
  }
  const out: Array<{ date: string; checkins: number }> = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = getDateKeySP(d);
    out.push({ date: key.slice(5), checkins: map.get(key) ?? 0 });
  }
  return out;
}

// =================== Atividade recente (compat) ===================

export interface ActivityRow {
  kind: "vip_entry" | "vip_checkin";
  at: string;
  title: string;
  subtitle: string;
}

export async function getRecentActivity(partnerId: string, limit = 20): Promise<ActivityRow[]> {
  const entries = await loadEntries(partnerId);
  const rows: ActivityRow[] = [];
  for (const e of entries) {
    rows.push({
      kind: "vip_entry",
      at: e.created_at,
      title: e.name ?? "Convidado",
      subtitle: `Entrou na lista${e.promoter_name_snapshot ? ` via ${e.promoter_name_snapshot}` : ""}`,
    });
    if (e.checked_in_at) {
      rows.push({
        kind: "vip_checkin",
        at: e.checked_in_at,
        title: e.name ?? "Convidado",
        subtitle: `Check-in confirmado${e.promoter_name_snapshot ? ` (${e.promoter_name_snapshot})` : ""}`,
      });
    }
  }
  rows.sort((a, b) => (a.at < b.at ? 1 : -1));
  return rows.slice(0, limit);
}

// =================== Insights ===================

export async function getInsights(partnerId: string): Promise<InsightRow[]> {
  const sinceWeek = nDaysAgoIso(7);
  const [entriesRes, analyticsRes, ranking] = await Promise.all([
    loadEntries(partnerId, sinceWeek),
    supabase
      .from("analytics_events")
      .select("event_type, session_id, created_at, metadata")
      .eq("venue_id", partnerId)
      .gte("created_at", sinceWeek)
      .limit(5000),
    getPromoterRanking(partnerId, {
      commission: {
        vip_checkin_cents: 0,
        reservation_cents: 0,
        excursion_cents: 0,
      },
    }),
  ]);
  const entries = entriesRes;
  const analytics = (analyticsRes.data ?? []) as Array<{
    event_type: string;
    session_id: string | null;
    created_at: string;
    metadata: Record<string, unknown> | null;
  }>;

  const insights: InsightRow[] = [];

  // 1) Melhor canal
  const channelClicks = new Map<string, number>();
  for (const a of analytics) {
    if (a.event_type !== "click" && a.event_type !== "ticket_click") continue;
    const meta = a.metadata ?? {};
    const ch =
      (meta["utm_medium"] as string) ||
      (meta["utm_term"] as string) ||
      (meta["channel"] as string) ||
      "outros";
    channelClicks.set(ch, (channelClicks.get(ch) ?? 0) + 1);
  }
  if (channelClicks.size >= 2) {
    const sorted = Array.from(channelClicks.entries()).sort((a, b) => b[1] - a[1]);
    const [top, second] = sorted;
    if (top[1] > second[1]) {
      insights.push({
        title: `${capitalize(top[0])} converteu melhor que ${capitalize(second[0])} nos últimos 7 dias.`,
        detail: `${top[1]} vs ${second[1]} cliques únicos.`,
        tone: "positive",
      });
    }
  }

  // 2) Melhor horário
  const hours = new Array(24).fill(0) as number[];
  for (const e of entries) {
    if (!e.checked_in_at) continue;
    const h = new Date(e.checked_in_at).getHours();
    hours[h] += 1;
  }
  const maxHour = hours.indexOf(Math.max(...hours));
  if (hours[maxHour] > 0) {
    insights.push({
      title: `Seu melhor horário de conversão foi entre ${maxHour}h e ${maxHour + 1}h.`,
      detail: `${hours[maxHour]} check-ins concentrados nesse horário.`,
      tone: "neutral",
    });
  }

  // 3) Top promoter
  const top = ranking[0];
  if (top && top.checked_in > 0) {
    insights.push({
      title: `${top.promoter_name} liderou em check-ins confirmados.`,
      detail: `${top.checked_in} check-ins, conversão de ${top.conversion_rate}%.`,
      tone: "positive",
    });
  }

  // 4) Pendentes na lista
  const pending = entries.filter((e) => e.status !== "checked_in" && e.status !== "cancelled");
  if (pending.length >= 5) {
    insights.push({
      title: `Há ${pending.length} pessoas na lista VIP que ainda não fizeram check-in.`,
      detail: "Lembre seu time de confirmar presença antes do evento.",
      tone: "warning",
    });
  }

  // 5) Cliques sem conversão
  const totalClicks = Array.from(channelClicks.values()).reduce((a, b) => a + b, 0);
  if (totalClicks > 20 && entries.length === 0) {
    insights.push({
      title: "Muitos cliques, mas pouca conversão.",
      detail: `${totalClicks} cliques sem entradas na lista. Revise sua copy.`,
      tone: "warning",
    });
  }

  return insights;
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
