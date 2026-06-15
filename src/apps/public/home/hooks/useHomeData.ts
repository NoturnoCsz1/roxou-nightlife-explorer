// ─── useHomeData — todas as queries Supabase e dados derivados da Home pública ───
// Extraído de src/pages/v3/V3Home.tsx (Fase 5). SQL, queryKeys e ordem preservados.

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isAfter, startOfDay, addDays } from "date-fns";
import { isTodaySP as isTodayFn } from "@/lib/dateUtils";
import type { Ev, VenueRank } from "../types";
import { safeEvents, toSafeDate } from "../utils";
import { LIVE_TOLERANCE_MS, PINNED_PARTNERS, TODAY_END, TODAY_KEY, TODAY_START } from "../constants";

export function useHomeData() {
  const now = new Date();
  const today = startOfDay(now);
  const futureCutoffISO = new Date(now.getTime() - LIVE_TOLERANCE_MS).toISOString();

  /* ─── EVENTS (apenas futuros / em andamento) ─── */
  const { data: events = [], isLoading: loadingEventsRaw, error: eventsError } = useQuery<Ev[]>({
    queryKey: ["v3-events", TODAY_KEY],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .from("events")
          .select("id,slug,title,image_url,date_time,venue_name,category,sub_category,featured,partner_id,ticket_url,video_url,transport_reservation_enabled")
        .eq("status", "published")
        .gte("date_time", futureCutoffISO)
        .order("date_time", { ascending: true })
        .limit(80)
        .abortSignal(signal);
      if (error) {
        console.error("[V3Home] erro ao carregar eventos", error);
        throw error;
      }
      return safeEvents(data);
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
    placeholderData: (prev) => prev,
  });

  // 🔒 Safety release: nunca prender a Home em skeleton por mais de 4s.
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  useEffect(() => {
    if (!loadingEventsRaw) { setLoadingTimedOut(false); return; }
    const t = setTimeout(() => {
      console.warn("[V3Home] events query > 4s — liberando skeleton com fallback");
      setLoadingTimedOut(true);
    }, 4_000);
    return () => clearTimeout(t);
  }, [loadingEventsRaw]);
  const loadingEvents = loadingEventsRaw && !loadingTimedOut;

  const { data: rawTodayEvents = [], isLoading: loadingToday, error: todayError } = useQuery<Ev[]>({
    queryKey: ["v3-today-events", TODAY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id,slug,title,image_url,date_time,venue_name,category,sub_category,featured,partner_id,ticket_url,video_url,transport_reservation_enabled")
        .eq("status", "published")
        .gte("date_time", futureCutoffISO)
        .lt("date_time", TODAY_END)
        .order("date_time", { ascending: true });
      if (error) {
        console.error("[V3Home] erro ao carregar eventos de hoje", error);
        throw error;
      }
      return safeEvents(data);
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  /* ─── TRENDING (views last 24h) ─── */
  const { data: trendingIds = [], isLoading: loadingTrending } = useQuery({
    queryKey: ["v3-trending"],
    queryFn: async () => {
      const since = new Date(Date.now() - 86400000).toISOString();
      const { data } = await supabase
        .from("page_views").select("event_id")
        .not("event_id", "is", null).gte("created_at", since);
      if (!data) return [];
      const counts: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data.forEach((r: any) => { if (r.event_id) counts[r.event_id] = (counts[r.event_id] || 0) + 1; });
      return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([id, views]) => ({ id, views }));
    },
  });

  /* ─── VENUE RANKINGS (views last 7d + partner metadata + followers) ─── */
  const { data: venueRanks = [], isLoading: loadingVenues } = useQuery<VenueRank[]>({
    queryKey: ["v3-venue-ranks"],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const [viewsRes, followsRes] = await Promise.all([
        supabase.from("page_views").select("partner_id").not("partner_id", "is", null).gte("created_at", since),
        supabase.from("saved_partners").select("partner_id"),
      ]);
      const views = viewsRes.data || [];
      if (!views.length) return [];
      const counts: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      views.forEach((r: any) => { if (r.partner_id) counts[r.partner_id] = (counts[r.partner_id] || 0) + 1; });
      const followCounts: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (followsRes.data || []).forEach((r: any) => { if (r.partner_id) followCounts[r.partner_id] = (followCounts[r.partner_id] || 0) + 1; });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
      if (!sorted.length) return [];
      const ids = sorted.map(([id]) => id);
      const { data: partners } = await supabase
        .from("partners").select("id,name,slug,type,logo_url,short_description,verified_partner")
        .in("id", ids);
      if (!partners) return [];
      const { data: evCounts } = await supabase
        .from("events").select("partner_id")
        .eq("status", "published").gte("date_time", today.toISOString())
        .in("partner_id", ids);
      const evMap: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      evCounts?.forEach((e: any) => { if (e.partner_id) evMap[e.partner_id] = (evMap[e.partner_id] || 0) + 1; });
      return sorted.map(([id, views]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = partners.find((pp: any) => pp.id === id);
        return p ? { ...p, views, upcoming_events: evMap[id] || 0, follower_count: followCounts[id] || 0 } : null;
      }).filter(Boolean) as VenueRank[];
    },
  });

  /* ─── FEATURED PARTNERS ─── */
  const { data: featuredPartners = [] } = useQuery<VenueRank[]>({
    queryKey: ["v3-featured-partners"],
    queryFn: async () => {
      const { data: partners } = await supabase
        .from("partners").select("id,name,slug,type,logo_url,short_description,verified_partner")
        .eq("active", true).limit(60);
      if (!partners?.length) return [];
      const weekEnd = addDays(today, 7).toISOString();
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const [evRes, viewsRes] = await Promise.all([
        supabase.from("events").select("partner_id")
          .eq("status", "published").gte("date_time", today.toISOString()).lte("date_time", weekEnd),
        supabase.from("page_views").select("partner_id")
          .not("partner_id", "is", null).gte("created_at", since),
      ]);
      const evMap: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      evRes.data?.forEach((e: any) => { if (e.partner_id) evMap[e.partner_id] = (evMap[e.partner_id] || 0) + 1; });
      const viewsMap: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      viewsRes.data?.forEach((r: any) => { if (r.partner_id) viewsMap[r.partner_id] = (viewsMap[r.partner_id] || 0) + 1; });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const enriched = partners.map((p: any) => ({
        ...p,
        views: viewsMap[p.id] || 0,
        upcoming_events: evMap[p.id] || 0,
        _pinIdx: PINNED_PARTNERS.indexOf((p.name || "").toLowerCase().trim()),
      }));

      const pinned = enriched
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((p: any) => p._pinIdx >= 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .sort((a: any, b: any) => a._pinIdx - b._pinIdx);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pinnedIds = new Set(pinned.map((p: any) => p.id));
      const rest = enriched
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((p: any) => !pinnedIds.has(p.id) && p.upcoming_events > 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .sort((a: any, b: any) => b.views - a.views || b.upcoming_events - a.upcoming_events)
        .slice(0, Math.max(0, 8 - pinned.length));

      const ordered = [...pinned, ...rest];
      const rankMap = new Map((venueRanks ?? []).map((v, i) => [v.id, i + 1]));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ordered.map((p: any) => ({ ...p, _rank: rankMap.get(p.id) || 0 }));
    },
    enabled: venueRanks !== undefined,
  });

  /* ─── HERO PRIORITY ───
   * Ordem de prioridade do destaque:
   *   1. Eventos acontecendo hoje (SP)
   *   2. Eventos nos próximos 7 dias
   *   3. Próximos grandes eventos futuros
   * Dentro de cada tier, prioriza featured e depois mais visualizados (trending).
   */
  const heroEvents = useMemo(() => {
    const list = safeEvents(events);
    const trendMap = new Map((trendingIds ?? []).map(t => [t.id, t.views]));
    const todayStartTs = new Date(TODAY_START).getTime();
    const weekLimit = todayStartTs + 7 * 24 * 60 * 60 * 1000;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tierOf = (e: any): 0 | 1 | 2 => {
      const dt = toSafeDate(e.date_time);
      if (!dt) return 2;
      if (isTodayFn(dt)) return 0;
      const ts = dt.getTime();
      if (ts >= todayStartTs && ts < weekLimit) return 1;
      return 2;
    };

    const sorted = [...list].sort((a, b) => {
      const ta = tierOf(a), tb = tierOf(b);
      if (ta !== tb) return ta - tb;
      if (!!b.featured !== !!a.featured) return b.featured ? 1 : -1;
      const va = trendMap.get(a.id) || 0;
      const vb = trendMap.get(b.id) || 0;
      if (vb !== va) return vb - va;
      const da = toSafeDate(a.date_time)?.getTime() ?? Infinity;
      const db = toSafeDate(b.date_time)?.getTime() ?? Infinity;
      return da - db;
    });

    const unique = sorted.filter((e, i, arr) => arr.findIndex(x => x.id === e.id) === i);
    return unique.slice(0, 4);
  }, [events, trendingIds]);

  const todayCount = safeEvents(rawTodayEvents).length;
  const hasHomeDataError = Boolean(eventsError || todayError);

  const usedIds = useMemo(() => {
    const s = new Set<string>();
    (heroEvents ?? []).forEach(e => s.add(e.id));
    return s;
  }, [heroEvents]);

  const trending = useMemo(() => {
    const idSet = new Set((trendingIds ?? []).map(t => t.id));
    const result = safeEvents(events).filter(e => idSet.has(e.id) && !usedIds.has(e.id)).slice(0, 8);
    result.forEach(e => usedIds.add(e.id));
    return result;
  }, [events, trendingIds, usedIds]);

  const todayEvents = useMemo(
    () => safeEvents(rawTodayEvents).filter(e => !usedIds.has(e.id))
      .slice(0, 12).map(e => { usedIds.add(e.id); return e; }),
    [rawTodayEvents, usedIds],
  );

  const featured = useMemo(
    () => safeEvents(events).filter(e => e.featured && !usedIds.has(e.id))
      .slice(0, 8).map(e => { usedIds.add(e.id); return e; }),
    [events, usedIds],
  );

  const weekEvents = useMemo(
    () => safeEvents(events).filter(e => {
      const dt = toSafeDate(e.date_time);
      return !!dt && !usedIds.has(e.id) && isAfter(dt, addDays(today, 1)) && isAfter(addDays(today, 7), dt);
    })
      .slice(0, 12),
    [events, today, usedIds],
  );

  // Destaque da Semana — Curadoria Roxou (Festas, Shows e Baladas)
  const weeklyHighlight = useMemo(() => {
    const ALLOWED = new Set(["festa", "show", "balada"]);
    const candidates = safeEvents(events).filter(e => !usedIds.has(e.id) && ALLOWED.has(e.category));
    return candidates.find(e => e.featured && e.video_url) ||
           candidates.find(e => e.featured) ||
           candidates.find(e => e.video_url) ||
           candidates[0] ||
           null;
  }, [events, usedIds]);
  if (weeklyHighlight) usedIds.add(weeklyHighlight.id);

  const maxViews = venueRanks[0]?.views || 1;
  const isLoading = loadingEvents;

  const partnerRankMap = useMemo(() => {
    const m = new Map<string, number>();
    (venueRanks ?? []).forEach((v, i) => m.set(v.id, i + 1));
    return m;
  }, [venueRanks]);

  const trendingIdSet = useMemo(() => new Set((trendingIds ?? []).map(t => t.id)), [trendingIds]);

  return {
    // raw
    events,
    rawTodayEvents,
    trendingIds,
    venueRanks,
    featuredPartners,
    // derived
    heroEvents,
    trending,
    todayEvents,
    featured,
    weekEvents,
    weeklyHighlight,
    partnerRankMap,
    trendingIdSet,
    todayCount,
    maxViews,
    // states
    isLoading,
    loadingEventsRaw,
    loadingTimedOut,
    loadingToday,
    loadingTrending,
    loadingVenues,
    eventsError,
    todayError,
    hasHomeDataError,
  };
}
