import { useState, useMemo, ReactNode, useEffect, useRef } from "react";
import { useScrollFadeIn } from "@/hooks/useScrollFadeIn";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { isAfter, startOfDay, addDays, format } from "date-fns";
import {
  isTodaySP as isTodayFn,
  isTomorrowSP,
  getStartOfTodaySP,
  getEndOfTodaySP,
  getDateKeySP,
  getNowInSaoPaulo,
} from "@/lib/dateUtils";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays, MapPin, Sparkles, Car, ArrowRight, Clock,
  Crown, Eye, TrendingUp,
  ChevronRight, ChevronLeft, Gem, BadgeCheck, Heart, Flame,
  PartyPopper, Mic2, Zap, Beer, Music, Newspaper, Users, Search, Bot, PiggyBank, Utensils,
} from "lucide-react";
import ReservationDrawer from "@/components/v3/ReservationDrawer";
import CategoryChips from "@/components/v3/CategoryChips";
import { useSavedEvents } from "@/hooks/useSavedEvents";
import AIHomeWidget from "@/components/v3/AIHomeWidget";
import V3SearchBar from "@/components/v3/V3SearchBar";
import V3VibeChips from "@/components/v3/V3VibeChips";
import SmartImage from "@/components/v3/SmartImage";
import { useV3Profile } from "@/hooks/useV3Profile";
import { User as UserIcon } from "lucide-react";
import LatestNewsSection from "@/components/v3/home/LatestNewsSection";
import ExpoHighlightBanner from "@/components/v3/home/ExpoHighlightBanner";
import MostViewedNews from "@/components/v3/home/MostViewedNews";

/* ───── helpers ───── */
const fmtTime = (d: string) => format(new Date(d), "HH'h'mm", { locale: ptBR });
const fmtDateFull = (d: string) => format(new Date(d), "EEE, d MMM · HH'h'mm", { locale: ptBR });
const isEventLive = (d: string) => {
  const start = new Date(d).getTime();
  const now = Date.now();
  return now >= start && now <= start + 4 * 60 * 60 * 1000;
};
const getDayLabel = (d: string) => {
  const dt = new Date(d);
  if (isTodayFn(dt)) return "HOJE";
  if (isTomorrowSP(dt)) return "AMANHÃ";
  return format(dt, "EEEE", { locale: ptBR }).toUpperCase();
};

interface Ev {
  id: string; slug: string; title: string; image_url: string | null;
  date_time: string; venue_name: string | null; category: string;
  sub_category?: string | null; featured: boolean; partner_id: string | null; ticket_url: string | null;
  video_url?: string | null;
}

const VIBE_FILTERS = [
  { key: "bombando", label: "🔥 Bombando" },
  { key: "musica", label: "🎸 Música ao Vivo" },
  { key: "happy", label: "🍹 Happy Hour" },
  { key: "grandes", label: "🏟️ Grandes Eventos" },
];

// Chaves de cache derivadas do dia civil de São Paulo (não hardcoded).
const TODAY_KEY = getDateKeySP(new Date());
const TODAY_START = getStartOfTodaySP();
const TODAY_END = getEndOfTodaySP();

interface VenueRank {
  id: string; name: string; slug: string; type: string;
  logo_url: string | null; short_description: string | null;
  views: number; upcoming_events: number; verified_partner: boolean;
  follower_count?: number;
}

export default function V3Home() {
  const [catFilter, setCatFilter] = useState("");
  const [vibeFilter, setVibeFilter] = useState("");
  const now = new Date();
  const today = startOfDay(now);
  // Tolerância: eventos iniciados nas últimas 4h ainda estão "rolando"
  const LIVE_TOLERANCE_MS = 4 * 60 * 60 * 1000;
  const futureCutoffISO = new Date(now.getTime() - LIVE_TOLERANCE_MS).toISOString();

  /* ─── EVENTS (apenas futuros / em andamento) ─── */
  const { data: events = [], isLoading: loadingEvents, error: eventsError } = useQuery<Ev[]>({
    queryKey: ["v3-events", TODAY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
          .select("id,slug,title,image_url,date_time,venue_name,category,sub_category,featured,partner_id,ticket_url,video_url")
        .eq("status", "published")
        .gte("date_time", futureCutoffISO)
        .order("date_time", { ascending: true })
        .limit(80);
      if (error) {
        console.error("[V3Home] erro ao carregar eventos", error);
        throw error;
      }
      return (data as Ev[]) || [];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const { data: rawTodayEvents = [], isLoading: loadingToday, error: todayError } = useQuery<Ev[]>({
    queryKey: ["v3-today-events", TODAY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id,slug,title,image_url,date_time,venue_name,category,sub_category,featured,partner_id,ticket_url,video_url")
        .eq("status", "published")
        .gte("date_time", futureCutoffISO)
        .lt("date_time", TODAY_END)
        .order("date_time", { ascending: true });
      if (error) {
        console.error("[V3Home] erro ao carregar eventos de hoje", error);
        throw error;
      }
      return (data as Ev[]) || [];
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
      views.forEach((r: any) => { if (r.partner_id) counts[r.partner_id] = (counts[r.partner_id] || 0) + 1; });
      // follower counts
      const followCounts: Record<string, number> = {};
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
      evCounts?.forEach((e: any) => { if (e.partner_id) evMap[e.partner_id] = (evMap[e.partner_id] || 0) + 1; });
      return sorted.map(([id, views]) => {
        const p = partners.find((pp: any) => pp.id === id);
        return p ? { ...p, views, upcoming_events: evMap[id] || 0, follower_count: followCounts[id] || 0 } : null;
      }).filter(Boolean) as VenueRank[];
    },
  });

  /* ─── FEATURED PARTNERS ─── */
  const PINNED_PARTNERS = ["arapuca bar", "quinta aula", "boteco raiz"];
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
      evRes.data?.forEach((e: any) => { if (e.partner_id) evMap[e.partner_id] = (evMap[e.partner_id] || 0) + 1; });
      const viewsMap: Record<string, number> = {};
      viewsRes.data?.forEach((r: any) => { if (r.partner_id) viewsMap[r.partner_id] = (viewsMap[r.partner_id] || 0) + 1; });

      const enriched = partners.map((p: any) => ({
        ...p,
        views: viewsMap[p.id] || 0,
        upcoming_events: evMap[p.id] || 0,
        _pinIdx: PINNED_PARTNERS.indexOf((p.name || "").toLowerCase().trim()),
      }));

      // Pinned primeiro (na ordem definida) + restante por views (apenas com eventos futuros)
      const pinned = enriched
        .filter((p: any) => p._pinIdx >= 0)
        .sort((a: any, b: any) => a._pinIdx - b._pinIdx);
      const pinnedIds = new Set(pinned.map((p: any) => p.id));
      const rest = enriched
        .filter((p: any) => !pinnedIds.has(p.id) && p.upcoming_events > 0)
        .sort((a: any, b: any) => b.views - a.views || b.upcoming_events - a.upcoming_events)
        .slice(0, Math.max(0, 8 - pinned.length));

      const ordered = [...pinned, ...rest];
      const rankMap = new Map(venueRanks.map((v, i) => [v.id, i + 1]));
      return ordered.map((p: any) => ({ ...p, _rank: rankMap.get(p.id) || 0 }));
    },
    enabled: venueRanks !== undefined,
  });

  /* ─── DEDUPLICATION ─── */
  const heroEvents = useMemo(() => {
    const feat = events.filter(e => e.featured);
    const rest = events.filter(e => !e.featured);
    const trendMap = new Map(trendingIds.map(t => [t.id, t.views]));
    rest.sort((a, b) => (trendMap.get(b.id) || 0) - (trendMap.get(a.id) || 0));
    const combined = [...feat, ...rest];
    let unique = combined.filter((e, i, arr) => arr.findIndex(x => x.id === e.id) === i);
    // Fallback: complete with random future events when there are fewer than 4 highlights
    if (unique.length < 4) {
      const usedIds = new Set(unique.map(e => e.id));
      const pool = events.filter(e => !usedIds.has(e.id));
      // Fisher-Yates shuffle (stable per render via slice)
      const shuffled = pool.slice();
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      unique = [...unique, ...shuffled.slice(0, 4 - unique.length)];
    }
    return unique.slice(0, 4);
  }, [events, trendingIds]);

  const [heroIdx, setHeroIdx] = useState(0);
  const hero = heroEvents[heroIdx] || heroEvents[0] || null;
  const heroIsToday = hero && isTodayFn(new Date(hero.date_time));
  const todayCount = rawTodayEvents.length;

  const usedIds = useMemo(() => {
    const s = new Set<string>();
    heroEvents.forEach(e => s.add(e.id));
    return s;
  }, [heroEvents]);

  const trending = useMemo(() => {
    const idSet = new Set(trendingIds.map(t => t.id));
    const result = events.filter(e => idSet.has(e.id) && !usedIds.has(e.id)).slice(0, 8);
    result.forEach(e => usedIds.add(e.id));
    return result;
  }, [events, trendingIds, usedIds]);

  const todayEvents = useMemo(
    () => rawTodayEvents.filter(e => !usedIds.has(e.id))
      .slice(0, 12).map(e => { usedIds.add(e.id); return e; }),
    [rawTodayEvents, usedIds],
  );

  const featured = useMemo(
    () => events.filter(e => e.featured && !usedIds.has(e.id))
      .slice(0, 8).map(e => { usedIds.add(e.id); return e; }),
    [events, usedIds],
  );

  const weekEvents = useMemo(
    () => events.filter(e => !usedIds.has(e.id) && isAfter(new Date(e.date_time), addDays(today, 1)) && isAfter(addDays(today, 7), new Date(e.date_time)))
      .slice(0, 12),
    [events, today, usedIds],
  );

  const filtered = useMemo(
    () => (catFilter ? events.filter(e => e.category === catFilter) : []),
    [events, catFilter],
  );

  const vibeFiltered = useMemo(() => {
    const trendSet = new Set(trendingIds.map(t => t.id));
    const musicSubs = new Set(["show", "sertanejo", "rock", "pagode", "mpb", "pop_rock", "samba"]);
    if (vibeFilter === "bombando") return events.filter(e => trendSet.has(e.id));
    if (vibeFilter === "musica") return events.filter(e => e.category === "show" || musicSubs.has(e.sub_category || ""));
    if (vibeFilter === "happy") return events.filter(e => ["bar", "gastrobar", "restaurante"].includes(e.category));
    if (vibeFilter === "grandes") return events.filter(e => ["festival", "festa"].includes(e.category));
    return [];
  }, [events, trendingIds, vibeFilter]);

  // Destaque da Semana — prioriza evento featured com vídeo POV
  // Curadoria Roxou / Destaque da Semana — apenas Festas, Shows e Baladas
  const weeklyHighlight = useMemo(() => {
    const ALLOWED = new Set(["festa", "show", "balada"]);
    const candidates = events.filter(e => !usedIds.has(e.id) && ALLOWED.has(e.category));
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
    venueRanks.forEach((v, i) => m.set(v.id, i + 1));
    return m;
  }, [venueRanks]);

  const trendingIdSet = useMemo(() => new Set(trendingIds.map(t => t.id)), [trendingIds]);

  return (
    <div>
      {/* ══════ MOBILE: IMMERSIVE HERO ══════ */}
      <div className="lg:hidden">
        {isLoading ? <HeroSkeleton /> : hero ? (
          <div className="relative group -mt-14">
            <div className="relative">
              <ImmersiveHero
                ev={hero}
                isToday={!!heroIsToday}
                todayCount={todayCount}
                venueRank={hero.partner_id ? partnerRankMap.get(hero.partner_id) : undefined}
                slides={heroEvents}
                index={heroIdx}
                onChange={setHeroIdx}
              />
            </div>
          </div>
        ) : <EmptyHero />}

        {/* Eventos de hoje — logo abaixo do hero */}
        {!isLoading && (
          Array.isArray(rawTodayEvents) && rawTodayEvents.length > 0 ? (
            <TodayTimeline events={rawTodayEvents} partnerRankMap={partnerRankMap} trendingIdSet={trendingIdSet} />
          ) : (
            <TodayEmptyState error={!!todayError || !!eventsError} loading={loadingToday} />
          )
        )}
      </div>

      {/* ══════ DESKTOP: 3-COLUMN GRID ══════ */}
      <div className="hidden lg:block">
        {isLoading ? (
          <DesktopHomeSkeleton />
        ) : (
          <CommandCenter
            hero={hero}
            heroIsToday={!!heroIsToday}
            heroEvents={heroEvents}
            heroIdx={heroIdx}
            setHeroIdx={setHeroIdx}
            weeklyHighlight={weeklyHighlight}
            todayEvents={rawTodayEvents}
            todayCount={todayCount}
            trending={trending}
            featured={featured}
            weekEvents={weekEvents}
            trendingIdSet={trendingIdSet}
            partnerRankMap={partnerRankMap}
            venueRanks={venueRanks}
            featuredPartners={featuredPartners as any[]}
            events={events}
          />
        )}
      </div>

      {/* ══════ HUB DE NOTÍCIAS / EXPO — só após layout principal montar ══════ */}
      {!isLoading && (
        <div className="max-w-3xl mx-auto min-h-[200px]">
          <LatestNewsSection variant="trending" limit={6} />
          <ExpoHighlightBanner />
          <MostViewedNews />
        </div>
      )}

      <div className="space-y-1 lg:hidden">

      {/* ══════ 1.4 SEARCH BAR — abaixo do hero ══════ */}
      <div className="px-4 pt-4">
        <V3SearchBar
          events={events as any}
          fallbackEvent={(featured[0] || events[0]) as any}
          placeholder="Buscar evento, local, vibe..."
        />
      </div>

      {/* ══════ 1.4b EXPLORAR POR VIBE — chips de conversão (linha única) ══════ */}
      <V3VibeChips />

      {/* ══════ 1.5 HOJE — Já renderizado logo abaixo do hero ══════ */}


      {/* ══════ 1.7 DESTAQUE DA SEMANA — vídeo POV ══════ */}
      {weeklyHighlight && <WeeklySpotlight ev={weeklyHighlight} />}

      <AIHomeWidget />

      {/* ══════ 2. BENTO GRID — Transport + Categories ══════ */}
      <BentoGrid />

      <VibeSelector selected={vibeFilter} onSelect={setVibeFilter} />

      {vibeFilter && vibeFiltered.length > 0 && (
        <Rail title={VIBE_FILTERS.find(v => v.key === vibeFilter)?.label || "Vibe"} subtitle="Seleção por intenção">
          {vibeFiltered.slice(0, 12).map(e => (
            <PremiumEventCard key={e.id} ev={e} size="lg" partnerRank={e.partner_id ? partnerRankMap.get(e.partner_id) : undefined} isTrending={trendingIdSet.has(e.id)} />
          ))}
        </Rail>
      )}

      {/* ══════ 3. CATEGORIES (filtro fino) ══════ */}
      <CategoryChips selected={catFilter} onSelect={setCatFilter} />

      {catFilter && filtered.length > 0 && (
        <Rail title={catFilter}>
          {filtered.slice(0, 12).map(e => (
            <PremiumEventCard key={e.id} ev={e} partnerRank={e.partner_id ? partnerRankMap.get(e.partner_id) : undefined} isTrending={trendingIdSet.has(e.id)} />
          ))}
        </Rail>
      )}

      {/* ══════ 4. EM ALTA AGORA ══════ */}
      {loadingTrending ? <RailSkeleton count={3} /> : trending.length > 0 ? (
        <Rail title="🔥 Em alta agora" subtitle="Mais acessados nas últimas 24h">
          {trending.map(e => (
            <PremiumEventCard key={e.id} ev={e} size="lg" isTrending partnerRank={e.partner_id ? partnerRankMap.get(e.partner_id) : undefined} />
          ))}
        </Rail>
      ) : null}

      {/* ══════ 5. LOCAIS EM ALTA ══════ */}
      {loadingVenues ? <VenueRankSkeleton /> : venueRanks.length > 0 ? (
        <FadeSection className="px-4 pt-6 pb-3">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center neon-glow">
              <Crown className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-lg text-foreground uppercase tracking-wide">Locais em alta</h2>
              <p className="text-[10px] text-muted-foreground -mt-0.5">Ranking semanal · Os mais acessados no Roxou</p>
            </div>
          </div>

          {venueRanks[0] && <VenueSpotlight v={venueRanks[0]} maxViews={maxViews} />}

          {venueRanks.length > 1 && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              {venueRanks.slice(1, 5).map((v, i) => (
                <VenueRankCard key={v.id} v={v} rank={i + 2} maxViews={maxViews} />
              ))}
            </div>
          )}

          {venueRanks.length > 5 && (
            <div className="flex gap-2 overflow-x-auto mt-3 pb-1 scrollbar-hide">
              {venueRanks.slice(5).map((v, i) => (
                <Link key={v.id} to={`/local/${v.slug}`}
                  className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border/30 hover:border-primary/20 transition-all">
                  <span className="text-[10px] font-bold text-muted-foreground">#{i + 6}</span>
                  <div className="w-6 h-6 rounded-md overflow-hidden bg-secondary shrink-0">
                    {v.logo_url ? <img src={v.logo_url} alt="" className="w-full h-full object-cover" /> : <span className="text-[8px] font-bold text-muted-foreground flex items-center justify-center h-full">{v.name[0]}</span>}
                  </div>
                  <span className="text-[10px] font-semibold text-foreground whitespace-nowrap">{v.name}</span>
                  <span className="text-[9px] text-muted-foreground">{v.views}</span>
                </Link>
              ))}
            </div>
          )}
        </FadeSection>
      ) : null}

      {/* ══════ 7. PARCEIROS EM DESTAQUE ══════ */}
      {(featuredPartners as any[]).length > 0 && (
        <FadeSection className="px-4 pt-5 pb-3">
          <div className="flex items-center gap-2 mb-0.5">
            <Gem className="w-5 h-5 text-accent" />
            <h2 className="font-display font-extrabold text-lg text-foreground uppercase tracking-wide">Parceiros em destaque</h2>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">Quem está movimentando a cena</p>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory">
            {(featuredPartners as any[]).map(p => (
              <FeaturedPartnerCard key={p.id} p={p} />
            ))}
          </div>
        </FadeSection>
      )}

      {/* ══════ 8. EVENTOS PREMIUM ══════ */}
      {featured.length > 0 && (
        <Rail title="⭐ Eventos premium" subtitle="Destaque">
          {featured.map(e => (
            <PremiumEventCard key={e.id} ev={e} size="lg" premium partnerRank={e.partner_id ? partnerRankMap.get(e.partner_id) : undefined} />
          ))}
        </Rail>
      )}

      {/* ══════ 9. ESTA SEMANA — fluid carousel ══════ */}
      {isLoading ? <RailSkeleton count={4} /> : weekEvents.length > 0 ? (
        <Rail title="📅 Esta semana" subtitle="Próximos 7 dias">
          {weekEvents.map(e => (
            <PremiumEventCard key={e.id} ev={e} partnerRank={e.partner_id ? partnerRankMap.get(e.partner_id) : undefined} />
          ))}
        </Rail>
      ) : null}
      {/* ══════ 9.5 ÚLTIMAS NOTÍCIAS ══════ */}
      <LatestNewsSection variant="latest" limit={6} />

      {/* Footer institucional V3 */}
      <FadeSection className="px-4 pt-6 pb-2">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-medium text-muted-foreground">
          <Link to="/sobre" className="hover:text-primary transition-colors">Sobre</Link>
          <span className="opacity-30">·</span>
          <Link to="/contato" className="hover:text-primary transition-colors">Contato</Link>
          <span className="opacity-30">·</span>
          <Link to="/privacy" className="hover:text-primary transition-colors">Privacidade</Link>
          <span className="opacity-30">·</span>
          <Link to="/terms" className="hover:text-primary transition-colors">Termos</Link>
          <span className="opacity-30">·</span>
          <Link to="/remover-dados" className="hover:text-primary transition-colors">Remover dados</Link>
        </div>
      </FadeSection>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

/* ─── FADE SECTION WRAPPER ─── */
function FadeSection({ className, children }: { className?: string; children: ReactNode }) {
  const { ref, visible } = useScrollFadeIn();
  return (
    <section ref={ref} className={`transition-all duration-500 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"} ${className || ""}`}>
      {children}
    </section>
  );
}

/* ─── IMMERSIVE HERO — viewport-tall, The Town vibes ─── */
function ImmersiveHero({ ev, isToday, todayCount, venueRank, slides, index, onChange }: {
  ev: Ev; isToday: boolean; todayCount: number; venueRank?: number;
  slides?: Ev[]; index?: number; onChange?: (i: number) => void;
}) {
  const dayLabel = getDayLabel(ev.date_time);
  const momentumText = isToday && todayCount > 1
    ? `+${todayCount - 1} eventos rolando`
    : venueRank && venueRank <= 3 ? "Top venue da semana" : null;

  const total = slides?.length || 0;
  const cur = index ?? 0;
  const go = (dir: number) => {
    if (!onChange || total <= 1) return;
    onChange((cur + dir + total) % total);
  };
  const touchRef = useRef<{ x: number; y: number } | null>(null);

  return (
    <div
      className="relative h-[88vh] min-h-[560px] max-h-[820px] lg:h-auto lg:min-h-[460px] lg:max-h-[560px] lg:aspect-auto overflow-hidden"
      onTouchStart={(e) => { const t = e.touches[0]; touchRef.current = { x: t.clientX, y: t.clientY }; }}
      onTouchEnd={(e) => {
        const s = touchRef.current; if (!s) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - s.x; const dy = t.clientY - s.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
        touchRef.current = null;
      }}
    >
      {/* Background image with Ken Burns */}
      <SmartImage
        src={ev.image_url}
        alt={ev.title}
        loading="eager"
        wrapperClassName="absolute inset-0 w-full h-full"
        className="absolute inset-0 w-full h-full object-cover scale-105 animate-[v3PageFade_700ms_ease-out_both]"
      />
      {/* Cinematic overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-background/15 lg:hidden" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-transparent lg:hidden" />
      {/* Desktop cinematic side overlay — flyer breathes on the right */}
      <div
        className="absolute inset-0 hidden lg:block"
        style={{
          background:
            "linear-gradient(90deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.15) 100%)",
        }}
      />
      <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[120%] h-44 bg-primary/15 blur-[100px] rounded-full" />

      {/* Top badges — AUTHORITY COUNTER */}
      <div className="absolute top-20 lg:top-8 left-4 lg:left-10 right-4 lg:right-10 flex items-center gap-1.5 z-10">
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/95 backdrop-blur-sm neon-glow">
          {isToday ? <Flame className="w-3 h-3 text-primary-foreground" /> : <Sparkles className="w-3 h-3 text-primary-foreground" />}
          <span className="text-[10px] font-extrabold text-primary-foreground uppercase tracking-[0.15em]">{dayLabel}</span>
        </span>
        {todayCount > 0 && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full v3-glass-strong border border-accent/40 v3-pulse-glow">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-70 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent shadow-[0_0_10px_hsl(var(--accent))]" />
            </span>
            <span className="text-[10px] font-black text-foreground uppercase tracking-[0.18em]">
              <span className="text-accent">{todayCount}</span> {todayCount === 1 ? "evento" : "eventos"} hoje
            </span>
          </span>
        )}
      </div>

      {/* Bottom content — compacto e premium */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-8 lg:p-10 lg:pb-10 space-y-3 lg:space-y-4 z-10 lg:max-w-[55%]">
        <div className="space-y-2">
          <span className="inline-block text-[10px] font-semibold text-primary/80 uppercase tracking-[0.28em]">
            {ev.category}
          </span>
          <h1
            className="mt-5 font-display font-semibold line-clamp-2 break-words tracking-normal text-foreground"
            style={{
              fontSize: "clamp(18px, 1.4vw, 22px)",
              lineHeight: "1.12",
              maxWidth: "520px",
              textShadow: "0 2px 24px hsl(var(--v3-neon) / 0.18)",
            }}
          >
            {ev.title}
          </h1>
        </div>

        {/* Info row with neon icons */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
          {ev.venue_name && (
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <MapPin className="w-3.5 h-3.5 text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.8)]" />
              </div>
              <span className="text-xs lg:text-sm font-bold text-foreground/95 truncate max-w-[180px] lg:max-w-[280px]">{ev.venue_name}</span>
              {venueRank && venueRank <= 3 && (
                <span className="px-1.5 py-0.5 rounded bg-primary/20 text-[9px] font-bold text-primary">#{venueRank}</span>
              )}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-accent drop-shadow-[0_0_6px_hsl(var(--accent)/0.8)]" />
            </div>
            <span className="text-xs lg:text-sm font-semibold text-foreground/85 capitalize">{fmtDateFull(ev.date_time)}</span>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex gap-2 pt-1">
          <Link
            to={`/evento/${ev.slug}`}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-primary/90 hover:bg-primary text-primary-foreground text-sm font-semibold tracking-normal shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.5)] active:scale-95 transition-all"
          >
            Ver evento <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            to={`/transporte?event=${encodeURIComponent(ev.title)}&venue=${encodeURIComponent(ev.venue_name || "")}&date=${ev.date_time}`}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-background/40 backdrop-blur-md border border-white/10 text-foreground/90 text-sm font-medium hover:border-primary/40 hover:text-foreground transition-all active:scale-95"
          >
            <Car className="w-4 h-4 text-primary/80" /> Como vou?
          </Link>
        </div>
      </div>

      {/* Carousel controls */}
      {total > 1 && (
        <>
          <button
            type="button"
            aria-label="Anterior"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); go(-1); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-background/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-foreground/90 hover:bg-background/60 active:scale-95 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Próximo"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); go(1); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-background/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-foreground/90 hover:bg-background/60 active:scale-95 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
            {slides!.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ir para slide ${i + 1}`}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange?.(i); }}
                className={`h-1.5 rounded-full transition-all ${i === cur ? "w-5 bg-primary" : "w-1.5 bg-white/40 hover:bg-white/70"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── BENTO GRID — Transport hero + category quick-actions ─── */
function BentoGrid() {
  const quickCats = [
    {
      categoryKey: "festa",
      label: "Festas",
      icon: PartyPopper,
      background:
        "radial-gradient(circle at 20% 18%, hsl(var(--accent) / 0.42), transparent 28%), radial-gradient(circle at 78% 22%, hsl(var(--primary) / 0.35), transparent 24%), linear-gradient(135deg, hsl(var(--primary) / 0.32), hsl(var(--card) / 0.78))",
      texture: "confetti",
    },
    {
      categoryKey: "show",
      label: "Shows",
      icon: Mic2,
      background:
        "linear-gradient(115deg, transparent 0 30%, hsl(var(--primary) / 0.30) 31% 35%, transparent 36% 100%), linear-gradient(245deg, transparent 0 26%, hsl(var(--accent) / 0.26) 27% 31%, transparent 32% 100%), linear-gradient(135deg, hsl(var(--secondary) / 0.95), hsl(var(--card) / 0.82))",
      texture: "stage",
    },
    {
      categoryKey: "balada",
      label: "Baladas",
      icon: Zap,
      background:
        "repeating-linear-gradient(118deg, hsl(var(--foreground) / 0.10) 0 2px, transparent 2px 18px), radial-gradient(circle at 76% 28%, hsl(var(--accent) / 0.36), transparent 30%), linear-gradient(135deg, hsl(var(--accent) / 0.30), hsl(var(--card) / 0.84))",
      texture: "strobo",
    },
    {
      categoryKey: "bar",
      label: "Bares",
      icon: Beer,
      background:
        "radial-gradient(circle at 28% 26%, hsl(var(--badge-bar) / 0.38), transparent 26%), radial-gradient(circle at 86% 70%, hsl(var(--badge-hoje) / 0.24), transparent 24%), linear-gradient(135deg, hsl(var(--secondary) / 0.92), hsl(var(--card) / 0.78))",
      texture: "bar",
    },
    {
      categoryKey: "restaurante",
      label: "Restaurantes",
      icon: Utensils,
      background:
        "radial-gradient(circle at 30% 30%, hsl(var(--v3-neon) / 0.34), transparent 28%), radial-gradient(circle at 80% 80%, hsl(var(--v3-neon-soft) / 0.28), transparent 28%), linear-gradient(135deg, hsl(var(--card) / 0.92), hsl(var(--secondary) / 0.78))",
      texture: "bar",
    },
    {
      categoryKey: "gastrobar",
      label: "Gastrobar",
      icon: Zap,
      background:
        "radial-gradient(circle at 22% 30%, hsl(var(--accent) / 0.32), transparent 28%), radial-gradient(circle at 82% 72%, hsl(var(--primary) / 0.26), transparent 28%), linear-gradient(135deg, hsl(var(--secondary) / 0.92), hsl(var(--card) / 0.82))",
      texture: "bar",
    },
  ] as const;

  return (
    <FadeSection className="px-4 pt-5 pb-3">
      <div className="grid grid-cols-2 gap-3 auto-rows-[136px]">
        {/* Transport — large featured tile (2 cols, 2 rows) */}
        <Link
          to="/transporte"
          className="col-span-2 relative rounded-3xl overflow-hidden p-4 flex flex-col justify-between active:scale-[0.98] hover:scale-[1.02] transition-transform duration-300 group v3-neon-hover"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--v3-neon)) 0%, hsl(var(--v3-neon-soft)) 60%, hsl(270 80% 35%) 100%)",
          }}
        >
          {/* Animated glow */}
          <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/20 blur-3xl group-hover:scale-110 transition-transform duration-500" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-black/20 blur-3xl" />

          <div className="relative flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-sm text-[9px] font-extrabold text-white uppercase tracking-widest">
              Transporte
            </span>
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:rotate-[-8deg] transition-transform duration-500">
              <Car className="w-7 h-7 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.6)]" />
            </div>
          </div>

          <div className="relative space-y-1">
            <h3 className="font-display font-black text-2xl text-white leading-none">
              COMO VOCÊ<br />VAI?
            </h3>
            <p className="text-[11px] font-medium text-white/80">
              Encontre carona pro próximo rolê
            </p>
            <div className="flex items-center gap-1 pt-1.5 text-[10px] font-bold text-white uppercase tracking-wider">
              Pedir agora <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </Link>

        {/* Category visual cards */}
        {quickCats.map((cat) => <CategoryBentoCard key={cat.categoryKey} {...cat} />)}
      </div>
    </FadeSection>
  );
}

function CategoryBentoCard({
  categoryKey,
  label,
  icon: Icon,
  background,
  texture,
}: {
  categoryKey: string;
  label: string;
  icon: typeof PartyPopper;
  background: string;
  texture: "confetti" | "stage" | "strobo" | "bar";
}) {
  return (
    <Link
      to={`/descobrir?cat=${categoryKey}`}
      className="relative rounded-3xl overflow-hidden v3-glass v3-neon-hover active:scale-[0.96] hover:scale-105 transition-transform duration-300 group"
      style={{ background }}
    >
      <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px]" />
      {texture === "confetti" && (
        <div className="absolute inset-0 opacity-60" style={{ backgroundImage: "radial-gradient(circle at 30% 30%, hsl(var(--foreground) / 0.25) 0 2px, transparent 3px), radial-gradient(circle at 62% 42%, hsl(var(--accent) / 0.28) 0 2px, transparent 3px), radial-gradient(circle at 78% 68%, hsl(var(--primary) / 0.24) 0 2px, transparent 3px)" }} />
      )}
      {texture === "stage" && <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-background/85 to-transparent" />}
      {texture === "bar" && <div className="absolute inset-x-6 bottom-5 h-8 rounded-full border border-foreground/12 bg-foreground/5 blur-[1px]" />}

      <div className="absolute top-3 right-3 w-9 h-9 rounded-2xl v3-glass-strong flex items-center justify-center group-hover:rotate-6 transition-transform duration-300">
        <Icon className="w-4.5 h-4.5 text-primary drop-shadow-[0_0_10px_hsl(var(--primary)/0.8)]" />
      </div>
      <div className="absolute bottom-4 left-4 right-4">
        <span className="font-display text-[17px] font-black uppercase tracking-wide text-foreground v3-neon-text leading-tight line-clamp-2 break-words">
          {label}
        </span>
      </div>
      <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-foreground/10 group-hover:ring-primary/55 transition-colors" />
    </Link>
  );
}

function VibeSelector({ selected, onSelect }: { selected: string; onSelect: (key: string) => void }) {
  return (
    <FadeSection className="px-4 py-2">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory">
        {VIBE_FILTERS.map((vibe) => {
          const active = selected === vibe.key;
          return (
            <button
              key={vibe.key}
              type="button"
              onClick={() => onSelect(active ? "" : vibe.key)}
              className={`shrink-0 snap-start rounded-2xl px-4 py-2.5 text-[11px] font-extrabold border transition-all active:scale-95 ${
                active
                  ? "gradient-primary text-primary-foreground border-primary/50 neon-glow"
                  : "v3-glass text-foreground border-border/40 hover:border-primary/40"
              }`}
            >
              {vibe.label}
            </button>
          );
        })}
      </div>
    </FadeSection>
  );
}

/* ─── VENUE SPOTLIGHT (#1) — dominant card ─── */
function VenueSpotlight({ v, maxViews }: { v: VenueRank; maxViews: number }) {
  return (
    <Link
      to={`/local/${v.slug}`}
      className="relative flex items-center gap-4 p-4 mt-4 rounded-2xl bg-card border-2 border-primary/40 neon-border group overflow-hidden active:scale-[0.98] transition-transform"
    >
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 blur-3xl rounded-full" />
      <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-accent/8 blur-2xl rounded-full" />

      {/* Rank badge */}
      <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full gradient-primary neon-glow">
        <Crown className="w-3.5 h-3.5 text-primary-foreground" />
        <span className="text-[10px] font-black text-primary-foreground">#1</span>
      </div>

      <div className="w-16 h-16 rounded-xl bg-secondary overflow-hidden shrink-0 ring-2 ring-primary/40 shadow-lg">
        {v.logo_url ? (
          <img src={v.logo_url} alt={v.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-primary font-bold text-xl">{v.name[0]}</div>
        )}
      </div>

      <div className="flex-1 min-w-0 relative">
        <div className="flex items-center gap-1.5">
          <p className="font-display font-bold text-base text-foreground truncate">{v.name}</p>
          {v.verified_partner && <BadgeCheck className="w-4 h-4 text-accent shrink-0" />}
        </div>
        <p className="text-[10px] text-muted-foreground capitalize">{v.type}</p>

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-1.5">
          <span className="flex items-center gap-1 text-[10px] font-semibold text-primary">
            <Eye className="w-3 h-3" /> {v.views} views
          </span>
          {v.upcoming_events > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-accent">
              <CalendarDays className="w-3 h-3" /> {v.upcoming_events} evento{v.upcoming_events > 1 ? "s" : ""}
            </span>
          )}
          {(v.follower_count || 0) > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <Heart className="w-3 h-3" /> {v.follower_count}
            </span>
          )}
        </div>

        {/* Popularity bar */}
        <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full rounded-full gradient-primary transition-all duration-700 neon-glow" style={{ width: "100%" }} />
        </div>
        <p className="text-[9px] text-primary font-semibold mt-1">🔥 Mais acessado da semana</p>
      </div>
    </Link>
  );
}

/* ─── VENUE RANK CARD (#2-#5) ─── */
function VenueRankCard({ v, rank, maxViews }: { v: VenueRank; rank: number; maxViews: number }) {
  const pct = Math.max(15, Math.round((v.views / maxViews) * 100));
  return (
    <Link
      to={`/local/${v.slug}`}
      className="flex flex-col p-3 rounded-xl bg-card border border-border/40 hover:border-primary/20 transition-all group active:scale-[0.97]"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={`font-display font-black text-sm w-6 text-center ${rank <= 3 ? "text-primary" : "text-muted-foreground"}`}>#{rank}</span>
        <div className="w-9 h-9 rounded-lg bg-secondary overflow-hidden shrink-0">
          {v.logo_url ? (
            <img src={v.logo_url} alt={v.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px] font-bold">{v.name[0]}</div>
          )}
        </div>
        {v.verified_partner && <BadgeCheck className="w-3.5 h-3.5 text-accent ml-auto" />}
      </div>
      <p className="font-display font-semibold text-[12px] text-foreground truncate leading-tight">{v.name}</p>
      <p className="text-[9px] text-muted-foreground capitalize">{v.type}</p>
      <div className="flex items-center gap-2 mt-1.5 text-[9px] text-muted-foreground">
        <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" /> {v.views}</span>
        {v.upcoming_events > 0 && <span className="text-primary font-medium">{v.upcoming_events} ev.</span>}
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className="h-full rounded-full gradient-primary transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </Link>
  );
}

/* ─── FEATURED PARTNER CARD ─── */
function FeaturedPartnerCard({ p }: { p: any }) {
  const rankLabel = p._rank && p._rank <= 3 ? `📈 Top ${p._rank} mais acessado` : null;
  return (
    <Link
      to={`/local/${p.slug}`}
      className="shrink-0 snap-start w-[200px] rounded-xl bg-card border border-border/40 hover:border-accent/30 transition-all overflow-hidden group active:scale-[0.97]"
    >
      <div className="relative h-[80px] bg-secondary overflow-hidden">
        {p.logo_url ? (
          <img src={p.logo_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/10">
            <span className="font-display font-bold text-2xl text-primary/60">{p.name[0]}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
        {p.verified_partner && (
          <div className="absolute top-2 right-2">
            <BadgeCheck className="w-4 h-4 text-accent drop-shadow-md" />
          </div>
        )}
      </div>
      <div className="p-3 space-y-1">
        <p className="font-display font-bold text-[13px] text-foreground truncate">{p.name}</p>
        <p className="text-[9px] text-muted-foreground capitalize">{p.type}</p>
        {p.upcoming_events > 0 && (
          <p className="text-[10px] font-medium text-primary">
            🔥 {p.upcoming_events} evento{p.upcoming_events > 1 ? "s" : ""} essa semana
          </p>
        )}
        {rankLabel && <p className="text-[10px] font-medium text-accent">{rankLabel}</p>}
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary mt-1">
          Ver agenda <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </Link>
  );
}

/* ─── PREMIUM EVENT CARD — fluid native-app feel, larger radius, inner shadow ─── */
function CommandCenter({
  hero, heroIsToday, heroEvents, heroIdx, setHeroIdx, weeklyHighlight,
  todayEvents, todayCount, trending, featured, weekEvents,
  trendingIdSet, partnerRankMap, venueRanks, featuredPartners, events,
}: {
  hero: Ev | null; heroIsToday: boolean; heroEvents: Ev[];
  heroIdx: number; setHeroIdx: (n: number) => void;
  weeklyHighlight: Ev | null;
  todayEvents: Ev[]; todayCount: number; trending: Ev[]; featured: Ev[]; weekEvents: Ev[];
  trendingIdSet: Set<string>; partnerRankMap: Map<string, number>;
  venueRanks: VenueRank[]; featuredPartners: any[]; events: Ev[];
}) {
  // Evita duplicar eventos já mostrados na timeline de hoje, no hero ou no spotlight
  const excludeIds = new Set<string>();
  todayEvents.forEach(e => excludeIds.add(e.id));
  if (hero) excludeIds.add(hero.id);
  if (weeklyHighlight) excludeIds.add(weeklyHighlight.id);
  const mainPool = [...trending, ...featured, ...weekEvents].filter((e, i, arr) =>
    arr.findIndex(x => x.id === e.id) === i && !excludeIds.has(e.id)
  );
  // Embaralhamento estável por dia para variar a curadoria sem mudar a cada render
  const seed = TODAY_KEY.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const mainEvents = mainPool
    .map((e, i) => ({ e, k: ((i + 1) * 9301 + seed * 49297) % 233280 }))
    .sort((a, b) => a.k - b.k)
    .map(x => x.e)
    .slice(0, 10);

  if (!todayEvents.length && !mainEvents.length && !hero) return null;

  return (
    <FadeSection className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_320px] gap-5 px-6 py-6">

      {/* CENTER — Hero, Search, Today Timeline, Weekly Spotlight, feed */}
      <section className="min-w-0 space-y-6">
        {hero && (
          <div className="relative group rounded-3xl overflow-hidden shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.45)]">
            <ImmersiveHero
              ev={hero}
              isToday={heroIsToday}
              todayCount={todayCount}
              venueRank={hero.partner_id ? partnerRankMap.get(hero.partner_id) : undefined}
            />
            {heroEvents.length > 1 && (
              <>
                <button
                  aria-label="Slide anterior"
                  onClick={() => setHeroIdx((heroIdx - 1 + heroEvents.length) % heroEvents.length)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-xl bg-background/40 border border-primary/30 text-foreground opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/20"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  aria-label="Próximo slide"
                  onClick={() => setHeroIdx((heroIdx + 1) % heroEvents.length)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-xl bg-background/40 border border-primary/30 text-foreground opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/20"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                  {heroEvents.map((_, i) => (
                    <button
                      key={i}
                      aria-label={`Slide ${i + 1}`}
                      onClick={() => setHeroIdx(i)}
                      className={`h-2 rounded-full transition-all ${
                        i === heroIdx ? "bg-primary w-7 shadow-[0_0_10px_hsl(var(--primary)/0.7)]" : "bg-foreground/30 w-2 hover:bg-foreground/50"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <V3SearchBar
          events={mainEvents as any}
          fallbackEvent={(featured[0] || mainEvents[0]) as any}
          placeholder="Buscar evento, local, vibe..."
        />

        <V3VibeChips className="!py-0 -mx-0" />

        {Array.isArray(todayEvents) && todayEvents.length > 0 ? (
          <TodayTimeline events={todayEvents} partnerRankMap={partnerRankMap} trendingIdSet={trendingIdSet} />
        ) : (
          <TodayEmptyState />
        )}

        {weeklyHighlight && <WeeklySpotlight ev={weeklyHighlight} />}

        {mainEvents.length > 0 && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary mb-2">Curadoria Roxou</p>
            <div className="grid auto-rows-[260px] grid-cols-6 gap-4">
              {mainEvents.slice(0, 7).map((ev, i) => (
                <PremiumEventCard key={ev.id} ev={ev} size={i < 2 ? "lg" : "md"} isTrending={trendingIdSet.has(ev.id)} partnerRank={ev.partner_id ? partnerRankMap.get(ev.partner_id) : undefined} className={`${i === 0 ? "col-span-4 row-span-2" : i === 1 ? "col-span-2 row-span-2" : "col-span-2"} !h-full !min-h-0 !w-full animate-fade-up`} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* RIGHT — IA + Categories + Week agenda (glassmorphism, sticky, lazy) */}
      <aside className="sticky top-20 h-auto space-y-4 backdrop-blur-xl bg-background/40 py-6 px-4 pb-16">
        <AIHomeWidget />
        <DesktopCategoriesPanel />
        <DesktopWeekPanel events={weekEvents} />
        <DesktopFeaturedPartnersPanel partners={featuredPartners} ranks={venueRanks} />
      </aside>
    </FadeSection>
  );
}

function DesktopProfilePanel() {
  const { user, profile } = useV3Profile();
  const nickname = (profile as any)?.nickname?.trim();
  const displayName = nickname || profile?.display_name?.split(" ")[0] || "Visitante";
  const avatar = (profile as any)?.avatar_url;

  return (
    <Link
      to={user ? "/perfil" : "/auth"}
      className="flex items-center gap-3 rounded-2xl border border-border/20 bg-background/30 p-3 transition-all hover:border-primary/40 hover:bg-primary/10"
    >
      <div className="h-10 w-10 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30">
        {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <UserIcon className="h-5 w-5 text-primary" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-black text-foreground truncate">{displayName}</p>
        <p className="text-[10px] text-muted-foreground">{user ? "Ver perfil" : "Entrar / Criar conta"}</p>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
    </Link>
  );
}

function DesktopNavPanel({ todayCount }: { todayCount: number }) {
  const items = [
    { to: "/", label: "Início", icon: Sparkles },
    { to: "/ia", label: "Aura", icon: Bot },
    { to: "/descobrir", label: "Descobrir", icon: Search },
    { to: "/transporte", label: "Caronas", icon: Car },
    { to: "/parceiros", label: "Parceiros", icon: Users },
    { to: "/agenda", label: "Agenda", icon: CalendarDays },
    { to: "/economize", label: "Economize", icon: PiggyBank },
    { to: "/expo2026", label: "Expo Prudente", icon: Newspaper },
  ];
  return (
    <div className="rounded-3xl v3-glass-strong p-4">
      <p className="font-display text-2xl font-black text-primary v3-neon-text">ROXOU</p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {todayCount === 0 ? "Buscando o próximo rolê..." : `${todayCount} rolês para decidir a noite.`}
      </p>
      <div className="mt-4 space-y-1.5">
        {items.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="flex items-center gap-3 rounded-xl border border-border/15 bg-background/25 px-3 py-2.5 text-[13px] font-bold text-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary">
            <Icon className="h-4 w-4" /> {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

const DESKTOP_CATEGORIES = [
  { key: "festa", label: "Festas", icon: PartyPopper },
  { key: "show", label: "Shows", icon: Mic2 },
  { key: "bar", label: "Bares", icon: Beer },
  { key: "festival", label: "Festivais", icon: Music },
  { key: "gastrobar", label: "Gastrobar", icon: Zap },
  { key: "restaurante", label: "Restaurantes", icon: Utensils },
];

function DesktopCategoriesPanel() {
  return (
    <div className="rounded-3xl v3-glass p-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-3">Categorias</p>
      <div className="grid grid-cols-2 gap-2">
        {DESKTOP_CATEGORIES.map(({ key, label, icon: Icon }) => (
          <Link key={key} to={`/descobrir?cat=${key}`} className="flex flex-col items-center gap-1 rounded-xl border border-border/20 bg-background/25 px-2 py-3 text-[11px] font-bold text-foreground hover:border-primary/40 hover:text-primary transition-all">
            <Icon className="h-4 w-4" /> {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function DesktopWeekPanel({ events }: { events: Ev[] }) {
  if (!events.length) return null;
  return (
    <div className="rounded-3xl v3-glass p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <h2 className="font-display text-base font-black text-foreground">Agenda da semana</h2>
        </div>
        <Link to="/agenda" className="text-[10px] font-bold text-primary hover:underline">Ver tudo</Link>
      </div>
      <div className="space-y-2">
        {events.slice(0, 5).map(ev => (
          <Link key={ev.id} to={`/evento/${ev.slug}`} className="group flex gap-2.5 rounded-xl border border-border/20 bg-background/20 p-2 hover:border-primary/40 hover:bg-primary/5 transition-all">
            <div className="flex flex-col items-center justify-center rounded-lg bg-primary/10 px-2 py-1 min-w-[42px]">
              <span className="text-[8px] font-black uppercase text-primary">{format(new Date(ev.date_time), "MMM", { locale: ptBR })}</span>
              <span className="text-base font-black text-foreground leading-none">{format(new Date(ev.date_time), "dd")}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">{ev.title}</p>
              <p className="text-[10px] text-muted-foreground truncate">{fmtTime(ev.date_time)} · {ev.venue_name || "—"}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function DesktopFeaturedPartnersPanel({ partners, ranks }: { partners: any[]; ranks: VenueRank[] }) {
  const list = (partners?.length ? partners : ranks).slice(0, 5);
  if (!list.length) return null;
  return (
    <div className="rounded-3xl v3-glass p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gem className="h-4 w-4 text-accent" />
          <h2 className="font-display text-base font-black text-foreground">Parceiros destaque</h2>
        </div>
        <Link
          to="/parceiros"
          className="group inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:text-accent transition-colors"
        >
          Explorar parceiros
          <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      <div className="space-y-2">
        {list.map((p: any) => (
          <Link
            key={p.id}
            to={`/local/${p.slug}`}
            className={`group flex items-center gap-3 rounded-xl border bg-background/20 p-2 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 ${
              p.verified_partner
                ? "border-primary/25 hover:shadow-[0_0_18px_-4px_hsl(var(--primary)/0.45)]"
                : "border-white/[0.05]"
            }`}
          >
            <div className="h-10 w-10 rounded-lg overflow-hidden bg-secondary/40 flex items-center justify-center shrink-0">
              {p.logo_url ? <img src={p.logo_url} alt={p.name} loading="lazy" className="w-full h-full object-cover" /> : <span className="text-sm font-black text-primary">{p.name?.[0]}</span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-foreground truncate group-hover:text-primary transition-colors">
                {p.name} {p.verified_partner && <BadgeCheck className="inline h-3 w-3 text-primary" />}
              </p>
              <p className="text-[10px] text-muted-foreground truncate capitalize">{p.type}</p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function NowPanel({ events }: { events: Ev[] }) {
  return (
    <div className="rounded-3xl v3-glass-strong p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_14px_hsl(142_71%_45%)]" />
        <h2 className="font-display text-base font-black text-foreground">O que está rolando agora</h2>
      </div>
      <div className="space-y-3">
        {events.map(ev => (
          <Link key={ev.id} to={`/evento/${ev.slug}`} className="group flex gap-3 rounded-2xl border border-border/25 bg-background/25 p-2 transition-all hover:border-primary/40 hover:bg-primary/10">
            <SmartImage
              src={ev.image_url}
              alt={ev.title}
              wrapperClassName="h-14 w-14 rounded-xl shrink-0"
              className="h-14 w-14 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-xs font-black text-foreground group-hover:text-primary">{ev.title}</p>
              <p className="mt-1 truncate text-[10px] text-muted-foreground">{fmtTime(ev.date_time)} · {ev.venue_name || "Local a confirmar"}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function DesktopTodayCarousel({ events, partnerRankMap, trendingIdSet }: {
  events: Ev[]; partnerRankMap: Map<string, number>; trendingIdSet: Set<string>;
}) {
  return (
    <section className="rounded-3xl v3-glass p-5">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Eventos de hoje</p>
          <h2 className="font-display text-2xl font-black uppercase text-foreground">Carrossel da noite</h2>
        </div>
        <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-[10px] font-black uppercase text-primary">
          {events.length} rolês
        </span>
      </div>
      <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 pr-5 scrollbar-hide [scroll-padding-right:1.25rem]">
        {events.map((ev) => (
          <PremiumEventCard key={ev.id} ev={ev} size="lg" isTrending={trendingIdSet.has(ev.id)} partnerRank={ev.partner_id ? partnerRankMap.get(ev.partner_id) : undefined} className="!w-[280px] snap-start rounded-3xl overflow-hidden" />
        ))}
      </div>
    </section>
  );
}

function TodayEmptyState({ error, loading }: { error?: boolean; loading?: boolean }) {
  return (
    <section className="px-4 pt-6 pb-3">
      <div className="mb-3">
        <h2 className="font-display font-black text-lg text-foreground uppercase tracking-wide">⚡ Hoje</h2>
        <p className="text-[10px] text-muted-foreground">Timeline da noite em sequência</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center">
        {loading ? (
          <p className="text-xs text-muted-foreground">Carregando rolês de hoje…</p>
        ) : error ? (
          <>
            <p className="text-sm font-semibold text-foreground">Não foi possível carregar os eventos agora.</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Verifique sua conexão e tente novamente em instantes.</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-foreground">Hoje ainda não temos eventos publicados.</p>
            <Link to="/agenda" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-4 py-2 text-[11px] font-black uppercase text-primary hover:bg-primary/25">
              Ver agenda completa
            </Link>
          </>
        )}
      </div>
    </section>
  );
}

function TodayTimeline({ events, partnerRankMap, trendingIdSet, compact = false }: {
  events: Ev[]; partnerRankMap: Map<string, number>; trendingIdSet: Set<string>; compact?: boolean;
}) {
  return (
    <FadeSection className={compact ? "h-full" : "px-4 pt-5 pb-3"}>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="font-display font-black text-lg text-foreground uppercase tracking-wide">⚡ Hoje</h2>
          <p className="text-[10px] text-muted-foreground">Timeline da noite em sequência</p>
        </div>
      </div>
      <div className="relative space-y-3 pl-12">
        <div className="absolute left-5 top-3 bottom-3 w-px bg-gradient-to-b from-primary/10 via-primary/75 to-accent/10 shadow-[0_0_15px_hsl(var(--primary)/0.45)]" />
        {events.map((ev) => (
          <div key={ev.id} className="relative">
            <div className="absolute -left-12 top-5 z-10 rounded-full border border-primary/35 bg-background px-2 py-1 text-[10px] font-black text-primary shadow-[0_0_15px_hsl(var(--primary)/0.35)]">
              {fmtTime(ev.date_time)}
            </div>
            <PremiumEventCard ev={ev} size="lg" isTrending={trendingIdSet.has(ev.id)} partnerRank={ev.partner_id ? partnerRankMap.get(ev.partner_id) : undefined} timeline />
          </div>
        ))}
      </div>
    </FadeSection>
  );
}

function PremiumEventCard({ ev, size = "md", premium, isTrending, partnerRank, timeline, className }: {
  ev: Ev; size?: "md" | "lg"; premium?: boolean; isTrending?: boolean; partnerRank?: number; timeline?: boolean; className?: string;
}) {
  const isLg = size === "lg";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { isSaved, toggleSave } = useSavedEvents();
  const saved = isSaved(ev.id);
  const badge = premium ? "⭐ Premium"
    : isTrending ? "🔥 Em alta"
    : partnerRank && partnerRank <= 3 ? `📈 #${partnerRank} hoje` : null;
  const live = isEventLive(ev.date_time);

  return (
    <>
      <div
        className={`${className || ""} ${timeline ? "w-full" : "shrink-0 snap-start"} relative rounded-3xl overflow-hidden v3-glass v3-neon-hover group transition-all duration-300 hover:scale-105 active:scale-[0.97] ${
          premium ? "border-primary/40 neon-border" : ""
        } ${timeline ? "min-h-[178px]" : isLg ? "w-[260px] min-h-[320px]" : "w-[190px] min-h-[260px]"}`}
        style={{
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.05), 0 0 8px hsl(var(--primary) / 0.10), 0 8px 24px rgba(0,0,0,0.4)",
        }}
      >
        <Link to={`/evento/${ev.slug}`} className="absolute inset-0 block">
          <div className="absolute inset-0 overflow-hidden">
            <SmartImage
              src={ev.image_url}
              alt={ev.title}
              wrapperClassName="absolute inset-0 w-full h-full"
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/35 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/10" />
            {/* Inner ring shadow */}
            <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-3xl pointer-events-none group-hover:ring-primary/60 transition-colors" />
            {live && (
              <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-400/45 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300 backdrop-blur-md z-10">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_hsl(142_71%_45%)]" />
                Começou
              </span>
            )}
            <span className={`absolute ${live ? "top-9" : "top-2"} left-2 px-1.5 py-0.5 rounded-full bg-primary/95 text-[9px] font-bold text-primary-foreground uppercase tracking-wide`}>
              {getDayLabel(ev.date_time)}
            </span>
            <button
              type="button"
              aria-label={saved ? "Remover dos favoritos" : "Favoritar evento"}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleSave(ev.id);
              }}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/55 backdrop-blur-sm border border-border/30 flex items-center justify-center transition-all active:scale-90"
            >
              <Heart className={`w-4 h-4 ${saved ? "text-primary fill-primary" : "text-foreground"}`} />
            </button>
          </div>
          <div
            className="absolute bottom-0 left-0 right-0 p-3 lg:p-4 space-y-1.5"
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 40%, transparent 100%)",
            }}
          >
            <h3
              className="font-display font-medium text-foreground line-clamp-2 break-words tracking-normal"
              style={{
                fontSize: "clamp(11px, 1vw, 15px)",
                lineHeight: "1.15",
                maxWidth: "75%",
                textShadow: "0 2px 10px rgba(0,0,0,0.95), 0 0 18px rgba(0,0,0,0.65)",
              }}
            >
              {ev.title}
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-foreground/85">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/15">
                <Clock className="w-3 h-3 text-accent" />
              </span>
              <span className="capitalize">{fmtDateFull(ev.date_time)}</span>
            </div>
            {ev.venue_name && (
              <div className="flex items-center gap-1.5 text-[11px] text-foreground/80">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/15">
                  <MapPin className="w-3 h-3 text-primary shrink-0" />
                </span>
                <span className="font-medium truncate">{ev.venue_name}</span>
              </div>
            )}
            {badge && <span className="inline-block text-[10px] font-bold text-accent">{badge}</span>}
          </div>
        </Link>
        <div className="absolute bottom-3 right-3 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDrawerOpen(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-bold text-white v3-neon-hover"
            style={{ background: "linear-gradient(135deg, hsl(var(--v3-neon) / 0.95), hsl(var(--v3-neon-soft) / 0.95))" }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Reservar
          </button>
        </div>
        <div className="pointer-events-none absolute inset-x-3 top-14 z-10 hidden translate-y-2 rounded-2xl border border-primary/30 bg-background/80 p-3 opacity-0 backdrop-blur-xl transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:block">
          <p className="line-clamp-3 text-[11px] font-medium leading-relaxed text-foreground/90">
            {ev.venue_name ? `${ev.venue_name} · ` : ""}{ev.category} marcado para {fmtTime(ev.date_time)}. Veja detalhes, ingresso e opções de carona sem perder o ritmo.
          </p>
          <Link to={`/transporte?event=${encodeURIComponent(ev.title)}&venue=${encodeURIComponent(ev.venue_name || "")}&date=${ev.date_time}`} className="pointer-events-auto mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1.5 text-[10px] font-black uppercase text-primary hover:bg-primary/25">
            <Car className="h-3 w-3" /> Pedir carona
          </Link>
        </div>
      </div>
      <ReservationDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        eventTitle={ev.title}
        eventSlug={ev.slug}
        ticketUrl={ev.ticket_url}
        venueName={ev.venue_name}
        eventDate={ev.date_time}
        imageUrl={ev.image_url}
      />
    </>
  );
}

/* ─── SKELETONS ─── */
function HeroSkeleton() {
  return (
    <div className="relative h-[380px] bg-card animate-pulse">
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-5 space-y-3">
        <div className="h-3 w-16 bg-secondary/60 rounded" />
        <div className="h-8 w-3/4 bg-secondary/60 rounded" />
        <div className="h-4 w-1/2 bg-secondary/40 rounded" />
        <div className="flex gap-2 pt-1">
          <div className="h-10 w-28 rounded-full bg-secondary/50" />
          <div className="h-10 w-36 rounded-full bg-secondary/30" />
        </div>
      </div>
    </div>
  );
}

function EmptyHero() {
  return (
    <div className="relative h-[240px] flex items-center justify-center bg-card border-b border-border/30">
      <div className="text-center space-y-2">
        <Sparkles className="w-8 h-8 text-primary mx-auto opacity-50" />
        <p className="text-sm text-muted-foreground">Novos eventos em breve</p>
      </div>
    </div>
  );
}

function RailSkeleton({ count = 3 }: { count?: number }) {
  return (
    <section className="py-3">
      <div className="px-4 mb-2"><div className="h-5 w-40 bg-secondary/50 rounded animate-pulse" /></div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-1">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="shrink-0 w-[230px] rounded-xl bg-card border border-border/30 animate-pulse">
            <div className="h-[130px] bg-secondary/30 rounded-t-xl" />
            <div className="p-2.5 space-y-2">
              <div className="h-4 w-3/4 bg-secondary/40 rounded" />
              <div className="h-3 w-1/2 bg-secondary/30 rounded" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function VenueRankSkeleton() {
  return (
    <section className="px-4 pt-5 pb-3">
      <div className="h-5 w-52 bg-secondary/50 rounded animate-pulse mb-4" />
      <div className="h-24 rounded-2xl bg-card border border-border/30 animate-pulse mb-3" />
      <div className="grid grid-cols-2 gap-2">
        {[0,1,2,3].map(i => <div key={i} className="h-32 rounded-xl bg-card border border-border/30 animate-pulse" />)}
      </div>
    </section>
  );
}

function DesktopHomeSkeleton() {
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_320px] gap-5 px-6 py-6">
      <div className="space-y-6 min-w-0">
        <div className="h-[600px] rounded-3xl bg-card/60 border border-border/30 animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-40 rounded-2xl bg-card/60 border border-border/30 animate-pulse" />
          <div className="h-40 rounded-2xl bg-card/60 border border-border/30 animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[0,1,2].map(i => <div key={i} className="h-56 rounded-2xl bg-card/60 border border-border/30 animate-pulse" />)}
        </div>
      </div>
      <aside className="space-y-4">
        <div className="h-48 rounded-2xl bg-card/60 border border-border/30 animate-pulse" />
        <div className="h-64 rounded-2xl bg-card/60 border border-border/30 animate-pulse" />
        <div className="h-40 rounded-2xl bg-card/60 border border-border/30 animate-pulse" />
      </aside>
    </div>
  );
}

/* ─── CONTENT RAIL — refined spacing ─── */
function Rail({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const { ref, visible } = useScrollFadeIn();
  return (
    <section ref={ref} className={`py-2.5 transition-all duration-500 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
      <div className="flex items-end justify-between px-4 mb-2">
        <div>
          <h2 className="font-display font-bold text-[15px] text-foreground">{title}</h2>
          {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-hide snap-x snap-mandatory">
        {children}
      </div>
    </section>
  );
}

/* (CategoryChips is imported from shared component) */

/* ─── QUICK FILTER TABS — Hoje · 7 dias · Expo 2026 ─── */
const EXPO_DATE = new Date("2026-09-10T20:00:00-03:00");

function QuickFilterTabs({ todayCount, weekCount }: { todayCount: number; weekCount: number }) {
  const tabs = [
    { key: "hoje", label: "Hoje", count: todayCount, to: "/agenda?filter=today", icon: Flame },
    { key: "semana", label: "Próx. 7 dias", count: weekCount, to: "/agenda?filter=week", icon: CalendarDays },
    { key: "expo", label: "Expo 2026", count: null, to: "/expo2026", icon: Sparkles, special: true },
  ];
  return (
    <FadeSection className="px-4 pt-3 pb-1">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
        {tabs.map(({ key, label, count, to, icon: Icon, special }) => (
          <Link
            key={key}
            to={to}
            className={`shrink-0 snap-start group inline-flex items-center gap-2 rounded-2xl px-4 py-3 border transition-all active:scale-95 ${
              special
                ? "border-primary/50 v3-pulse-glow"
                : "border-border/40 v3-glass hover:border-primary/40"
            }`}
            style={
              special
                ? {
                    background:
                      "linear-gradient(135deg, hsl(var(--v3-neon) / 0.25), hsl(var(--v3-neon-soft) / 0.18))",
                  }
                : undefined
            }
          >
            <Icon className={`w-4 h-4 ${special ? "text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]" : "text-foreground/80 group-hover:text-primary"}`} />
            <span className={`text-[12px] font-extrabold uppercase tracking-wider ${special ? "text-foreground" : "text-foreground"}`}>
              {label}
            </span>
            {count !== null && count > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-primary/25 text-[10px] font-black text-primary leading-none">
                {count}
              </span>
            )}
            {special && <ArrowRight className="w-3.5 h-3.5 text-primary" />}
          </Link>
        ))}
      </div>
    </FadeSection>
  );
}

/* ─── EXPO COUNTDOWN PILL (compact) ─── */
function ExpoCountdownPill() {
  const [diff, setDiff] = useState(() => EXPO_DATE.getTime() - Date.now());
  useEffect(() => {
    const id = setInterval(() => setDiff(EXPO_DATE.getTime() - Date.now()), 60000);
    return () => clearInterval(id);
  }, []);
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-primary">
      <span className="px-2 py-1 rounded-md bg-primary/20 text-primary">{days}d</span>
      <span className="text-foreground/50">:</span>
      <span className="px-2 py-1 rounded-md bg-primary/20 text-primary">{hours}h</span>
      <span className="text-foreground/70">para a Expo</span>
    </div>
  );
}

/* ─── WEEKLY SPOTLIGHT — vídeo POV em background, glass overlay ─── */
function WeeklySpotlight({ ev }: { ev: Ev }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const hasVideo = !!ev.video_url && !videoError;

  useEffect(() => {
    setVideoReady(false);
    setVideoError(false);
  }, [ev.video_url]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !hasVideo) return;
    const tryPlay = () => v.play().catch(() => {});
    tryPlay();
    v.addEventListener("loadeddata", tryPlay);
    return () => v.removeEventListener("loadeddata", tryPlay);
  }, [hasVideo, ev.video_url]);

  return (
    <FadeSection className="px-4 pt-4 pb-2">
      {/* Section header — agency authority */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center neon-glow v3-pulse-glow">
            <Crown className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-primary">Curadoria Roxou</p>
            <h2 className="font-display font-black text-lg text-foreground uppercase tracking-tight leading-none">
              Destaque da semana
            </h2>
          </div>
        </div>
      </div>

      <Link
        to={`/evento/${ev.slug}`}
        className="relative block rounded-3xl overflow-hidden v3-glass border border-primary/30 group"
        style={{
          aspectRatio: "16 / 20",
          boxShadow:
            "0 0 0 1px hsl(var(--v3-neon) / 0.35), 0 0 30px hsl(var(--v3-neon) / 0.25), 0 24px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Background — video POV or animated image */}
        {ev.video_url && !videoError ? (
          <video
            ref={videoRef}
            src={ev.video_url}
            poster={ev.image_url || undefined}
            muted
            loop
            playsInline
            autoPlay
            preload="auto"
            onLoadedData={() => setVideoReady(true)}
            onCanPlay={() => setVideoReady(true)}
            onError={() => { setVideoError(true); setVideoReady(false); }}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${videoReady ? "opacity-100" : "opacity-0"}`}
          />
        ) : null}
        <img
          src={ev.image_url || "/placeholder.svg"}
          alt={ev.title}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            hasVideo && videoReady ? "opacity-0" : "opacity-100"
          } group-hover:scale-105 transition-transform`}
        />

        {/* Skeleton shimmer enquanto o vídeo POV ainda não está pronto */}
        {hasVideo && !videoReady && (
          <div className="absolute inset-0 v3-skeleton" aria-hidden="true" />
        )}

        {/* Cinematic overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 mix-blend-overlay" />

        {/* Top — POV badge (somente se vídeo realmente carregou) */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/15"
            style={{ background: "rgba(0,0,0,0.45)" }}
          >
            {hasVideo && videoReady ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-70 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                </span>
                <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">POV ao vivo</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Imperdível</span>
              </>
            )}
          </span>
        </div>

        {/* Bottom — glass info card */}
        <div className="absolute inset-x-3 bottom-3 rounded-2xl v3-glass-strong p-4 border border-white/10">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-primary v3-neon-text">
            {ev.category}
          </span>
          <h3 className="font-display font-black text-2xl text-foreground leading-[0.95] mt-1.5 line-clamp-2">
            {ev.title.toUpperCase()}
          </h3>
          <div className="flex items-center gap-3 mt-3 text-[11px] font-bold text-foreground/85">
            {ev.venue_name && (
              <span className="flex items-center gap-1 truncate max-w-[60%]">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0 drop-shadow-[0_0_6px_hsl(var(--primary))]" />
                <span className="truncate">{ev.venue_name}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-accent drop-shadow-[0_0_6px_hsl(var(--accent))]" />
              <span className="capitalize">{fmtDateFull(ev.date_time)}</span>
            </span>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/70">
              Toque para explorar
            </span>
            <span
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-extrabold uppercase tracking-wider text-white"
              style={{
                background:
                  "linear-gradient(135deg, hsl(var(--v3-neon)), hsl(var(--v3-neon-soft)))",
                boxShadow: "0 0 20px hsl(var(--v3-neon) / 0.5)",
              }}
            >
              Ver agora <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Animated corner glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary/30 blur-3xl group-hover:scale-110 transition-transform duration-700" />
      </Link>

      {/* Expo countdown — subtle context */}
      <div className="mt-3 flex items-center justify-center">
        <ExpoCountdownPill />
      </div>
    </FadeSection>
  );
}
