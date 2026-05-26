// Aura Pulse — Operational engine sweep (cron 10 min)
// Reads aggregations from existing tables and creates idempotent alerts
// in public.aura_alerts. Does NOT mutate events/partners/users.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireCronOrAdmin, corsHeaders } from "../_shared/requireAdmin.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireCronOrAdmin(req);
  if (!auth.ok) return auth.response;


  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const created: string[] = [];
  const errors: string[] = [];

  async function insertAlert(row: {
    kind: string;
    severity: "info" | "warn" | "critical";
    entity_type?: string | null;
    entity_id?: string | null;
    title: string;
    body?: string | null;
    payload?: Record<string, unknown>;
    dedupe_key: string;
  }) {
    const { error } = await supabase.from("aura_alerts").insert({
      kind: row.kind,
      severity: row.severity,
      entity_type: row.entity_type ?? null,
      entity_id: row.entity_id ?? null,
      title: row.title,
      body: row.body ?? null,
      payload: row.payload ?? {},
      dedupe_key: row.dedupe_key,
    });
    if (error) {
      // 23505 = unique violation = dedupe hit, ignore
      if (!String(error.message).includes("duplicate") && error.code !== "23505") {
        errors.push(`${row.kind}: ${error.message}`);
      }
    } else {
      created.push(row.kind);
    }
  }

  const now = new Date();
  const dayBucket = now.toISOString().slice(0, 10);
  const hourBucket = now.toISOString().slice(0, 13);

  // 1) Trending spike — aura_badge in (em_alta, viralizando, bombando) on future events
  try {
    const todayIso = new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString();
    const { data } = await supabase
      .from("events")
      .select("id, title, aura_badge, aura_score, trending_score, slug")
      .in("aura_badge", ["em_alta", "viralizando", "bombando"])
      .eq("status", "published")
      .gte("date_time", todayIso)
      .order("aura_score", { ascending: false, nullsFirst: false })
      .limit(20);
    for (const e of data || []) {
      const isViral = e.aura_badge === "viralizando" || e.aura_badge === "bombando";
      await insertAlert({
        kind: isViral ? "viral" : "trending_spike",
        severity: isViral ? "warn" : "info",
        entity_type: "event",
        entity_id: e.id,
        title: `${e.title}`,
        body: `Aura badge: ${e.aura_badge} · score ${Math.round(Number(e.aura_score) || 0)}`,
        payload: { aura_score: e.aura_score, trending_score: e.trending_score, slug: e.slug },
        dedupe_key: `${isViral ? "viral" : "trending_spike"}|${e.id}|${dayBucket}`,
      });
    }
  } catch (e) {
    errors.push(`trending: ${(e as Error).message}`);
  }

  // 2) Risk users — score >= 50 (high) and >= 80 (critical), 1 alert per user/day
  try {
    const { data } = await supabase
      .from("user_risk_scores")
      .select("user_id, score, badge, signals")
      .in("badge", ["high", "critical"])
      .gte("score", 50)
      .order("score", { ascending: false })
      .limit(20);
    for (const r of data || []) {
      await insertAlert({
        kind: r.badge === "critical" ? "security_critical" : "risk_user",
        severity: r.badge === "critical" ? "critical" : "warn",
        entity_type: "user",
        entity_id: r.user_id,
        title: `Usuário com risco ${r.badge} (${r.score})`,
        body: `Sinais: ${JSON.stringify(r.signals || {})}`,
        payload: { score: r.score, signals: r.signals },
        dedupe_key: `risk|${r.user_id}|${dayBucket}`,
      });
    }
  } catch (e) {
    errors.push(`risk: ${(e as Error).message}`);
  }

  // 3) Spam burst — flagged messages > 10 in last 30min
  try {
    const since = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("community_messages")
      .select("id", { count: "exact", head: true })
      .eq("is_flagged", true)
      .gte("created_at", since);
    if ((count || 0) > 10) {
      await insertAlert({
        kind: "spam_burst",
        severity: "warn",
        entity_type: "system",
        entity_id: null,
        title: `Pico de mensagens denunciadas`,
        body: `${count} mensagens marcadas em 30 min.`,
        payload: { count, since },
        dedupe_key: `spam_burst|${hourBucket}`,
      });
    }
  } catch (e) {
    errors.push(`spam: ${(e as Error).message}`);
  }

  // 4) Partner growth — top partners by aura_partner_score
  try {
    const { data } = await supabase
      .from("partners")
      .select("id, name, aura_partner_score, slug")
      .gte("aura_partner_score", 75)
      .eq("active", true)
      .order("aura_partner_score", { ascending: false })
      .limit(5);
    for (const p of data || []) {
      await insertAlert({
        kind: "partner_growth",
        severity: "info",
        entity_type: "partner",
        entity_id: p.id,
        title: `${p.name} com score Aura ${p.aura_partner_score}`,
        body: `Parceiro em alta — considere destaque.`,
        payload: { score: p.aura_partner_score, slug: p.slug },
        dedupe_key: `partner_growth|${p.id}|${dayBucket}`,
      });
    }
  } catch (e) {
    errors.push(`partner: ${(e as Error).message}`);
  }

  // 5) Radar repost — instagram_scans with repost_count >= 3
  try {
    const { data } = await supabase
      .from("instagram_scans")
      .select("id, source_handle, repost_count, event_id, last_reposted_at")
      .gte("repost_count", 3)
      .eq("hidden_from_radar", false)
      .order("last_reposted_at", { ascending: false })
      .limit(10);
    for (const s of data || []) {
      await insertAlert({
        kind: "radar_repost",
        severity: "info",
        entity_type: "event",
        entity_id: s.event_id || null,
        title: `Flyer reencontrado pelo Radar (${s.repost_count}x)`,
        body: `Origem: @${s.source_handle || "—"}`,
        payload: { repost_count: s.repost_count, scan_id: s.id },
        dedupe_key: `radar_repost|${s.id}|${dayBucket}`,
      });
    }
  } catch (e) {
    errors.push(`radar: ${(e as Error).message}`);
  }

  return new Response(
    JSON.stringify({ ok: true, created: created.length, by_kind: created.reduce((acc, k) => ({ ...acc, [k]: (acc[k] || 0) + 1 }), {} as Record<string, number>), errors }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
