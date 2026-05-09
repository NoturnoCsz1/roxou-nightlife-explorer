// Aura Home Curation - calculates aura/trending/hype scores for events
// Runs every 15 minutes via cron. Manual aura_pick / featured retain priority.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface EventRow {
  id: string;
  date_time: string;
  partner_id: string | null;
  ai_confidence: string | null;
  featured: boolean;
  aura_pick: boolean;
  status: string;
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const startedAt = Date.now();

  try {
    // Future + recently past events (last 6h) only
    const sixHoursAgo = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
    const { data: events, error: evErr } = await supabase
      .from("events")
      .select("id, date_time, partner_id, ai_confidence, featured, aura_pick, status")
      .eq("status", "published")
      .gte("date_time", sixHoursAgo)
      .order("date_time", { ascending: true })
      .limit(500);

    if (evErr) throw evErr;
    const list = (events ?? []) as EventRow[];
    if (list.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eventIds = list.map((e) => e.id);
    const partnerIds = Array.from(new Set(list.map((e) => e.partner_id).filter(Boolean))) as string[];

    // Views last 24h and 7d
    const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    const [{ data: pv24 }, { data: pv7 }, { data: ae7 }, { data: partners }] = await Promise.all([
      supabase.from("page_views").select("event_id").in("event_id", eventIds).gte("created_at", since24h),
      supabase.from("page_views").select("event_id").in("event_id", eventIds).gte("created_at", since7d),
      supabase
        .from("analytics_events")
        .select("event_id, event_type")
        .in("event_id", eventIds)
        .gte("created_at", since7d),
      partnerIds.length
        ? supabase
            .from("partners")
            .select("id, aura_partner_score, instagram_followers_count, instagram_media_count")
            .in("id", partnerIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const views24 = new Map<string, number>();
    const views7 = new Map<string, number>();
    const saves = new Map<string, number>();
    const clicks = new Map<string, number>();
    const shares = new Map<string, number>();

    (pv24 ?? []).forEach((r: any) => views24.set(r.event_id, (views24.get(r.event_id) ?? 0) + 1));
    (pv7 ?? []).forEach((r: any) => views7.set(r.event_id, (views7.get(r.event_id) ?? 0) + 1));
    (ae7 ?? []).forEach((r: any) => {
      const m =
        r.event_type === "save" ? saves : r.event_type === "share" ? shares : r.event_type?.includes("click") ? clicks : null;
      if (m && r.event_id) m.set(r.event_id, (m.get(r.event_id) ?? 0) + 1);
    });

    const partnerMap = new Map<string, any>();
    (partners ?? []).forEach((p: any) => partnerMap.set(p.id, p));

    // Normalization helpers
    const maxViews24 = Math.max(1, ...Array.from(views24.values()));
    const maxViews7 = Math.max(1, ...Array.from(views7.values()));

    const updates: any[] = [];
    const logs: any[] = [];

    for (const ev of list) {
      const v24 = views24.get(ev.id) ?? 0;
      const v7 = views7.get(ev.id) ?? 0;
      const sv = saves.get(ev.id) ?? 0;
      const cl = clicks.get(ev.id) ?? 0;
      const sh = shares.get(ev.id) ?? 0;

      // Engagement (0-100)
      const engagement = clamp(((v24 / maxViews24) * 60) + (sv * 4) + (cl * 2) + (sh * 6));

      // Trending: growth (24h vs 7d daily avg)
      const dailyAvg7 = v7 / 7;
      const growth = dailyAvg7 > 0 ? v24 / dailyAvg7 : v24 > 0 ? 2 : 0;
      const trending = clamp(growth * 25);

      // Hype
      const hype = clamp(sv * 3 + sh * 5 + cl * 2);

      // Partner signal
      const p = ev.partner_id ? partnerMap.get(ev.partner_id) : null;
      const partnerScore = p
        ? clamp(
            (p.aura_partner_score ?? 0) * 0.5 +
              Math.min(50, Math.log10((p.instagram_followers_count ?? 0) + 1) * 12),
          )
        : 20;

      // Radar confidence
      const radarMap: Record<string, number> = { high: 90, medium: 60, low: 30 };
      const radar = radarMap[ev.ai_confidence ?? "medium"] ?? 50;

      // Time proximity (0-100): peaks near event time, decays after
      const eventTs = new Date(ev.date_time).getTime();
      const hoursAway = (eventTs - Date.now()) / 3600000;
      let timeScore = 0;
      if (hoursAway > 0) {
        timeScore = hoursAway < 6 ? 100 : hoursAway < 24 ? 85 : hoursAway < 72 ? 65 : hoursAway < 168 ? 45 : 25;
      } else if (hoursAway > -3) {
        timeScore = 90; // happening now
      } else {
        timeScore = 0;
      }

      let aura =
        engagement * 0.35 + trending * 0.25 + partnerScore * 0.15 + radar * 0.15 + timeScore * 0.10;

      // Manual boosts
      if (ev.aura_pick) aura = Math.max(aura, 95);
      if (ev.featured) aura = Math.max(aura, 88);

      aura = clamp(aura);

      // Badge
      let badge: string | null = null;
      if (ev.aura_pick) badge = "escolha_aura";
      else if (trending >= 75 && hype >= 30) badge = "viralizando";
      else if (engagement >= 70) badge = "bombando";
      else if (aura >= 75) badge = "em_alta";

      const signals = {
        v24, v7, saves: sv, clicks: cl, shares: sh,
        engagement: +engagement.toFixed(1),
        trending: +trending.toFixed(1),
        hype: +hype.toFixed(1),
        partnerScore: +partnerScore.toFixed(1),
        radar, timeScore,
        manual: { aura_pick: ev.aura_pick, featured: ev.featured },
      };

      updates.push({
        id: ev.id,
        aura_score: +aura.toFixed(2),
        trending_score: +trending.toFixed(2),
        hype_score: +hype.toFixed(2),
        aura_badge: badge,
        aura_score_updated_at: new Date().toISOString(),
        aura_score_reason: signals,
      });

      logs.push({
        event_id: ev.id,
        aura_score: +aura.toFixed(2),
        trending_score: +trending.toFixed(2),
        hype_score: +hype.toFixed(2),
        badge,
        signals,
      });
    }

    // Batch update events (one-by-one but parallel chunks)
    const chunk = 25;
    for (let i = 0; i < updates.length; i += chunk) {
      const slice = updates.slice(i, i + chunk);
      await Promise.all(
        slice.map((u) =>
          supabase
            .from("events")
            .update({
              aura_score: u.aura_score,
              trending_score: u.trending_score,
              hype_score: u.hype_score,
              aura_badge: u.aura_badge,
              aura_score_updated_at: u.aura_score_updated_at,
              aura_score_reason: u.aura_score_reason,
            })
            .eq("id", u.id),
        ),
      );
    }

    // Insert logs only for events with badge or top scores (avoid log spam)
    const topLogs = logs.filter((l) => l.badge || l.aura_score >= 70).slice(0, 50);
    if (topLogs.length) await supabase.from("aura_home_logs").insert(topLogs);

    return new Response(
      JSON.stringify({
        ok: true,
        processed: updates.length,
        badged: logs.filter((l) => l.badge).length,
        elapsed_ms: Date.now() - startedAt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("aura-home-curation error", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
