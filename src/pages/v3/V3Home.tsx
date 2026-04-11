import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { isAfter, startOfDay, addDays, format, isToday as isTodayFn } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays, MapPin, Sparkles, Car, ArrowRight, Clock,
  Flame, Music, Mic2, Beer, Zap, PartyPopper, Crown, Eye, TrendingUp,
  ChevronRight, Star, Gem, BarChart3,
} from "lucide-react";

/* ───── helpers ───── */
const fmtTime = (d: string) => format(new Date(d), "HH'h'mm", { locale: ptBR });
const fmtDateShort = (d: string) => format(new Date(d), "EEE, d MMM", { locale: ptBR });
const fmtDateFull = (d: string) => format(new Date(d), "EEE, d MMM · HH'h'mm", { locale: ptBR });
const getDayLabel = (d: string) => {
  const dt = new Date(d);
  if (isTodayFn(dt)) return "HOJE";
  const tomorrow = addDays(startOfDay(new Date()), 1);
  if (dt >= tomorrow && dt < addDays(tomorrow, 1)) return "AMANHÃ";
  return format(dt, "EEEE", { locale: ptBR }).toUpperCase();
};

interface Ev {
  id: string; slug: string; title: string; image_url: string | null;
  date_time: string; venue_name: string | null; category: string;
  featured: boolean; partner_id: string | null;
}

interface VenueRank {
  id: string; name: string; slug: string; type: string;
  logo_url: string | null; short_description: string | null;
  views: number; upcoming_events: number; verified_partner: boolean;
}

/* ═══════════════════════════════════════════════════════════════
   V3 HOME — premium nightlife discovery + partner visibility
   ═══════════════════════════════════════════════════════════════ */
export default function V3Home() {
  const [catFilter, setCatFilter] = useState("");
  const now = new Date();
  const today = startOfDay(now);

  /* ─── EVENTS ─── */
  const { data: events = [], isLoading: loadingEvents } = useQuery<Ev[]>({
    queryKey: ["v3-events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id,slug,title,image_url,date_time,venue_name,category,featured,partner_id")
        .eq("status", "published")
        .gte("date_time", today.toISOString())
        .order("date_time", { ascending: true })
        .limit(80);
      return (data as Ev[]) || [];
    },
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

  /* ─── VENUE RANKINGS (views last 7d + partner metadata) ─── */
  const { data: venueRanks = [], isLoading: loadingVenues } = useQuery<VenueRank[]>({
    queryKey: ["v3-venue-ranks"],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: views } = await supabase
        .from("page_views").select("partner_id")
        .not("partner_id", "is", null).gte("created_at", since);
      if (!views?.length) return [];
      const counts: Record<string, number> = {};
      views.forEach((r: any) => { if (r.partner_id) counts[r.partner_id] = (counts[r.partner_id] || 0) + 1; });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
      if (!sorted.length) return [];
      const ids = sorted.map(([id]) => id);
      const { data: partners } = await supabase
        .from("partners").select("id,name,slug,type,logo_url,short_description,verified_partner")
        .in("id", ids);
      if (!partners) return [];
      // count upcoming events per partner
      const { data: evCounts } = await supabase
        .from("events").select("partner_id")
        .eq("status", "published").gte("date_time", today.toISOString())
        .in("partner_id", ids);
      const evMap: Record<string, number> = {};
      evCounts?.forEach((e: any) => { if (e.partner_id) evMap[e.partner_id] = (evMap[e.partner_id] || 0) + 1; });
      return sorted.map(([id, views]) => {
        const p = partners.find((pp: any) => pp.id === id);
        return p ? { ...p, views, upcoming_events: evMap[id] || 0 } : null;
      }).filter(Boolean) as VenueRank[];
    },
  });

  /* ─── FEATURED PARTNERS (for dedicated section) ─── */
  const { data: featuredPartners = [] } = useQuery<VenueRank[]>({
    queryKey: ["v3-featured-partners"],
    queryFn: async () => {
      const { data: partners } = await supabase
        .from("partners").select("id,name,slug,type,logo_url,short_description,verified_partner")
        .eq("active", true).limit(30);
      if (!partners?.length) return [];
      // get event counts for this week
      const weekEnd = addDays(today, 7).toISOString();
      const { data: evData } = await supabase
        .from("events").select("partner_id")
        .eq("status", "published").gte("date_time", today.toISOString()).lte("date_time", weekEnd);
      const evMap: Record<string, number> = {};
      evData?.forEach((e: any) => { if (e.partner_id) evMap[e.partner_id] = (evMap[e.partner_id] || 0) + 1; });
      // only show partners with upcoming events
      const withEvents = partners
        .filter((p: any) => (evMap[p.id] || 0) > 0)
        .map((p: any) => ({ ...p, views: 0, upcoming_events: evMap[p.id] || 0 }))
        .sort((a: any, b: any) => b.upcoming_events - a.upcoming_events)
        .slice(0, 8);
      // enrich with rank position if available
      const rankMap = new Map(venueRanks.map((v, i) => [v.id, i + 1]));
      return withEvents.map((p: any) => ({ ...p, _rank: rankMap.get(p.id) || 0 }));
    },
    enabled: venueRanks !== undefined,
  });

  /* ─── DEDUPLICATION ─── */
  const heroEvents = useMemo(() => {
    const featured = events.filter(e => e.featured);
    const rest = events.filter(e => !e.featured);
    // sort rest by trending views
    const trendMap = new Map(trendingIds.map(t => [t.id, t.views]));
    rest.sort((a, b) => (trendMap.get(b.id) || 0) - (trendMap.get(a.id) || 0));
    const combined = [...featured, ...rest];
    const unique = combined.filter((e, i, arr) => arr.findIndex(x => x.id === e.id) === i);
    return unique.slice(0, 4);
  }, [events, trendingIds]);

  const [heroIdx, setHeroIdx] = useState(0);
  const hero = heroEvents[heroIdx] || heroEvents[0] || null;
  const heroIsToday = hero && isTodayFn(new Date(hero.date_time));
  const todayCount = useMemo(() => events.filter(e => isTodayFn(new Date(e.date_time))).length, [events]);

  const usedIds = useMemo(() => {
    const s = new Set<string>();
    heroEvents.forEach(e => s.add(e.id));
    return s;
  }, [heroEvents]);

  const trending = useMemo(() => {
    const idSet = new Set(trendingIds.map((t) => t.id));
    const result = events.filter((e) => idSet.has(e.id) && !usedIds.has(e.id)).slice(0, 8);
    result.forEach((e) => usedIds.add(e.id));
    return result;
  }, [events, trendingIds, usedIds]);

  const todayEvents = useMemo(
    () => events.filter((e) => !usedIds.has(e.id) && isTodayFn(new Date(e.date_time)))
      .slice(0, 12).map((e) => { usedIds.add(e.id); return e; }),
    [events, usedIds],
  );

  const featured = useMemo(
    () => events.filter((e) => e.featured && !usedIds.has(e.id))
      .slice(0, 8).map((e) => { usedIds.add(e.id); return e; }),
    [events, usedIds],
  );

  const weekEvents = useMemo(
    () => events.filter((e) => !usedIds.has(e.id) && isAfter(new Date(e.date_time), addDays(today, 1)) && isAfter(addDays(today, 7), new Date(e.date_time)))
      .slice(0, 12),
    [events, today, usedIds],
  );

  const filtered = useMemo(
    () => (catFilter ? events.filter((e) => e.category === catFilter) : []),
    [events, catFilter],
  );

  const maxViews = venueRanks[0]?.views || 1;
  const isLoading = loadingEvents;

  /* venue rank lookup for event cards */
  const partnerRankMap = useMemo(() => {
    const m = new Map<string, number>();
    venueRanks.forEach((v, i) => m.set(v.id, i + 1));
    return m;
  }, [venueRanks]);

  const trendingIdSet = useMemo(() => new Set(trendingIds.map(t => t.id)), [trendingIds]);

  return (
    <div className="space-y-0">
      {/* ══════ 1. HERO ══════ */}
      {isLoading ? <HeroSkeleton /> : hero ? (
        <HeroSection
          ev={hero}
          isToday={!!heroIsToday}
          todayCount={todayCount}
          venueRank={hero.partner_id ? partnerRankMap.get(hero.partner_id) : undefined}
        />
      ) : <EmptyHero />}

      {/* ══════ 2. CATEGORIES ══════ */}
      <CategoryChips selected={catFilter} onSelect={setCatFilter} />

      {catFilter && filtered.length > 0 && (
        <Rail title={catFilter}>
          {filtered.slice(0, 12).map((e) => (
            <EventCard key={e.id} ev={e} partnerRank={e.partner_id ? partnerRankMap.get(e.partner_id) : undefined} isTrending={trendingIdSet.has(e.id)} />
          ))}
        </Rail>
      )}

      {/* ══════ 3. EM ALTA AGORA (events) ══════ */}
      {loadingTrending ? <RailSkeleton count={3} /> : trending.length > 0 ? (
        <Rail title="🔥 Em alta agora" subtitle="Mais acessados nas últimas 24h">
          {trending.map((e) => (
            <EventCard key={e.id} ev={e} size="lg" isTrending partnerRank={e.partner_id ? partnerRankMap.get(e.partner_id) : undefined} />
          ))}
        </Rail>
      ) : null}

      {/* ══════ 4. 🔥 LOCAIS EM ALTA AGORA ══════ */}
      {loadingVenues ? <VenueRankSkeleton /> : venueRanks.length > 0 ? (
        <section className="px-4 pt-5 pb-3">
          <div className="flex items-center gap-2 mb-0.5">
            <Flame className="w-5 h-5 text-primary" />
            <h2 className="font-display font-bold text-lg text-foreground uppercase tracking-wide">Locais em alta agora</h2>
          </div>
          <p className="text-[11px] text-muted-foreground mb-4">Os lugares mais acessados no Roxou</p>

          {/* #1 SPOTLIGHT */}
          {venueRanks[0] && <VenueSpotlight v={venueRanks[0]} maxViews={maxViews} />}

          {/* #2-#5 compact */}
          {venueRanks.length > 1 && (
            <div className="grid grid-cols-2 gap-2 mt-3">
              {venueRanks.slice(1, 5).map((v, i) => (
                <VenueRankCard key={v.id} v={v} rank={i + 2} maxViews={maxViews} />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {/* ══════ 5. HOJE ══════ */}
      {isLoading ? <RailSkeleton count={3} /> : todayEvents.length > 0 ? (
        <Rail title="⚡ Hoje" subtitle="Rolando agora em Prudente">
          {todayEvents.map((e) => (
            <EventCard key={e.id} ev={e} size="lg" partnerRank={e.partner_id ? partnerRankMap.get(e.partner_id) : undefined} isTrending={trendingIdSet.has(e.id)} />
          ))}
        </Rail>
      ) : null}

      {/* ══════ 6. 💎 PARCEIROS EM DESTAQUE ══════ */}
      {(featuredPartners as any[]).length > 0 && (
        <section className="px-4 pt-5 pb-3">
          <div className="flex items-center gap-2 mb-0.5">
            <Gem className="w-5 h-5 text-accent" />
            <h2 className="font-display font-bold text-lg text-foreground uppercase tracking-wide">Parceiros em destaque</h2>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">Quem está movimentando a cena</p>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory">
            {(featuredPartners as any[]).map((p) => (
              <FeaturedPartnerCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      {/* ══════ 7. TRANSPORT ACTION ══════ */}
      <div className="px-4 py-3">
        <Link
          to="/v3/transporte"
          className="relative flex items-center gap-4 p-4 rounded-2xl overflow-hidden border border-primary/20 group active:scale-[0.98] transition-transform"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-accent/5" />
          <div className="relative w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center">
            <Car className="w-5 h-5 text-primary" />
          </div>
          <div className="relative flex-1 min-w-0">
            <p className="font-display font-bold text-sm text-foreground">🚗 Saindo hoje?</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Garanta sua carona pro rolê</p>
          </div>
          <span className="relative shrink-0 px-3 py-1.5 rounded-full gradient-primary text-[10px] font-bold text-primary-foreground uppercase tracking-wide">
            Ver caronas
          </span>
        </Link>
      </div>

      {/* ══════ 8. EVENTOS PREMIUM ══════ */}
      {featured.length > 0 && (
        <Rail title="⭐ Eventos premium" subtitle="Destaque">
          {featured.map((e) => (
            <EventCard key={e.id} ev={e} size="lg" premium partnerRank={e.partner_id ? partnerRankMap.get(e.partner_id) : undefined} />
          ))}
        </Rail>
      )}

      {/* ══════ 9. ESTA SEMANA ══════ */}
      {isLoading ? <RailSkeleton count={4} /> : weekEvents.length > 0 ? (
        <Rail title="📅 Esta semana" subtitle="Próximos 7 dias">
          {weekEvents.map((e) => (
            <EventCard key={e.id} ev={e} partnerRank={e.partner_id ? partnerRankMap.get(e.partner_id) : undefined} />
          ))}
        </Rail>
      ) : null}

      <div className="h-6" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

/* ─── HERO ─── */
function HeroSection({ ev, isToday, todayCount, venueRank }: {
  ev: Ev; isToday: boolean; todayCount: number; venueRank?: number;
}) {
  const dayLabel = getDayLabel(ev.date_time);
  const momentumText = isToday && todayCount > 1
    ? `+${todayCount - 1} eventos rolando`
    : venueRank && venueRank <= 3 ? "Top venue da semana" : null;

  return (
    <div className="relative">
      <div className="relative h-[380px] overflow-hidden">
        <img
          src={ev.image_url || "/placeholder.svg"} alt={ev.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />

        {/* badge */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/90 backdrop-blur-sm neon-glow">
            {isToday ? <Flame className="w-3.5 h-3.5 text-primary-foreground" /> : <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />}
            <span className="text-[10px] font-bold text-primary-foreground uppercase tracking-wider">{dayLabel}</span>
          </span>
          {momentumText && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-card/80 backdrop-blur-sm border border-border/40">
              <TrendingUp className="w-3 h-3 text-accent" />
              <span className="text-[9px] font-semibold text-accent">{momentumText}</span>
            </span>
          )}
        </div>

        {/* content */}
        <div className="absolute bottom-0 left-0 right-0 p-5 space-y-2">
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{ev.category}</span>
          <h1 className="font-display font-bold text-[26px] text-foreground leading-[1.15] line-clamp-2 neon-text">{ev.title}</h1>

          {/* venue prominent */}
          {ev.venue_name && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-sm font-semibold text-foreground/90">{ev.venue_name}</span>
              {venueRank && venueRank <= 3 && (
                <span className="ml-1 px-1.5 py-0.5 rounded bg-primary/20 text-[8px] font-bold text-primary">#{venueRank}</span>
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-medium capitalize">{fmtDateFull(ev.date_time)}</span>
          </div>

          {/* CTAs */}
          <div className="flex gap-2 pt-1">
            <Link to={`/v3/evento/${ev.slug}`} className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full gradient-primary text-primary-foreground text-xs font-bold neon-glow active:scale-95 transition-transform">
              Ver evento <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to={`/v3/transporte?event=${encodeURIComponent(ev.title)}&venue=${encodeURIComponent(ev.venue_name || "")}&date=${ev.date_time}`}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 text-foreground text-xs font-semibold hover:border-primary/40 transition-colors active:scale-95"
            >
              <Car className="w-3.5 h-3.5 text-primary" /> Como você vai?
            </Link>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3/4 h-6 bg-primary/12 blur-2xl rounded-full" />
    </div>
  );
}

/* ─── VENUE SPOTLIGHT (#1) ─── */
function VenueSpotlight({ v, maxViews }: { v: VenueRank; maxViews: number }) {
  return (
    <Link
      to={`/local/${v.slug}`}
      className="relative flex items-center gap-4 p-4 rounded-2xl bg-card border border-primary/30 neon-border group overflow-hidden active:scale-[0.98] transition-transform"
    >
      <div className="absolute -top-8 -right-8 w-28 h-28 bg-primary/8 blur-3xl rounded-full" />
      <div className="absolute top-2.5 right-3 flex items-center gap-1">
        <Crown className="w-4 h-4 text-primary" />
        <span className="text-[10px] font-bold text-primary">#1</span>
      </div>
      <div className="w-14 h-14 rounded-xl bg-secondary overflow-hidden shrink-0 ring-2 ring-primary/30">
        {v.logo_url ? (
          <img src={v.logo_url} alt={v.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-primary font-bold text-lg">{v.name[0]}</div>
        )}
      </div>
      <div className="flex-1 min-w-0 relative">
        <p className="font-display font-bold text-base text-foreground truncate pr-12">{v.name}</p>
        <p className="text-[10px] text-muted-foreground capitalize">{v.type}</p>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="flex items-center gap-1 text-[10px] font-medium text-primary">
            <Eye className="w-3 h-3" /> {v.views} views
          </span>
          {v.upcoming_events > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-accent">
              <CalendarDays className="w-3 h-3" /> {v.upcoming_events} evento{v.upcoming_events > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="mt-1.5 h-1.5 rounded-full bg-secondary overflow-hidden">
          <div className="h-full rounded-full gradient-primary transition-all duration-700" style={{ width: "100%" }} />
        </div>
      </div>
    </Link>
  );
}

/* ─── VENUE RANK CARD (#2-#5) ─── */
function VenueRankCard({ v, rank, maxViews }: { v: VenueRank; rank: number; maxViews: number }) {
  return (
    <Link
      to={`/local/${v.slug}`}
      className="flex flex-col p-3 rounded-xl bg-card border border-border/40 hover:border-primary/20 transition-all group active:scale-[0.97]"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="font-display font-bold text-sm text-muted-foreground w-5">#{rank}</span>
        <div className="w-8 h-8 rounded-lg bg-secondary overflow-hidden shrink-0">
          {v.logo_url ? (
            <img src={v.logo_url} alt={v.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px] font-bold">{v.name[0]}</div>
          )}
        </div>
      </div>
      <p className="font-display font-semibold text-[12px] text-foreground truncate leading-tight">{v.name}</p>
      <p className="text-[9px] text-muted-foreground capitalize">{v.type}</p>
      <div className="flex items-center gap-1 mt-1.5 text-[9px] text-muted-foreground">
        <Eye className="w-2.5 h-2.5" /> {v.views}
      </div>
      <div className="mt-1 h-1 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full gradient-primary transition-all duration-500"
          style={{ width: `${Math.max(15, Math.round((v.views / maxViews) * 100))}%` }}
        />
      </div>
    </Link>
  );
}

/* ─── FEATURED PARTNER CARD (horizontal rail) ─── */
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
      </div>
      <div className="p-3 space-y-1">
        <p className="font-display font-bold text-[13px] text-foreground truncate">{p.name}</p>
        <p className="text-[9px] text-muted-foreground capitalize">{p.type}</p>
        {p.upcoming_events > 0 && (
          <p className="text-[10px] font-medium text-primary">
            🔥 {p.upcoming_events} evento{p.upcoming_events > 1 ? "s" : ""} essa semana
          </p>
        )}
        {rankLabel && (
          <p className="text-[10px] font-medium text-accent">{rankLabel}</p>
        )}
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary mt-1">
          Ver agenda <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </Link>
  );
}

/* ─── EVENT CARD (with partner connection) ─── */
function EventCard({ ev, size = "md", premium, isTrending, partnerRank }: {
  ev: Ev; size?: "md" | "lg"; premium?: boolean; isTrending?: boolean; partnerRank?: number;
}) {
  const isLg = size === "lg";
  const badge = premium ? "⭐ Premium"
    : isTrending ? "🔥 Em alta"
    : partnerRank && partnerRank <= 3 ? `📈 #${partnerRank} hoje` : null;

  return (
    <Link
      to={`/v3/evento/${ev.slug}`}
      className={`shrink-0 snap-start rounded-xl overflow-hidden bg-card border group transition-all active:scale-[0.97] ${
        premium ? "border-primary/30 neon-border" : "border-border/40 hover:border-border/60"
      } ${isLg ? "w-[230px]" : "w-[165px]"}`}
    >
      <div className={`relative ${isLg ? "h-[130px]" : "h-[100px]"} overflow-hidden`}>
        <img
          src={ev.image_url || "/placeholder.svg"} alt={ev.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* time pill */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-sm">
          <Clock className="w-2.5 h-2.5 text-primary" />
          <span className="text-[9px] font-bold text-foreground">{fmtTime(ev.date_time)}</span>
        </div>

        {/* day label */}
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary/90 text-[8px] font-bold text-primary-foreground uppercase tracking-wider">
          {getDayLabel(ev.date_time)}
        </span>
      </div>

      <div className="p-2.5 space-y-1">
        <h3 className="font-display font-semibold text-[12px] text-foreground line-clamp-2 leading-snug">{ev.title}</h3>

        {/* partner/venue line — prominent */}
        {ev.venue_name && (
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-primary shrink-0" />
            <span className="text-[10px] font-semibold text-foreground/80 truncate">{ev.venue_name}</span>
          </div>
        )}

        {/* badge */}
        {badge && (
          <span className="inline-block text-[9px] font-bold text-accent">{badge}</span>
        )}
      </div>
    </Link>
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
      <div className="h-20 rounded-2xl bg-card border border-border/30 animate-pulse mb-3" />
      <div className="grid grid-cols-2 gap-2">
        {[0,1,2,3].map((i) => <div key={i} className="h-28 rounded-xl bg-card border border-border/30 animate-pulse" />)}
      </div>
    </section>
  );
}

/* ─── CONTENT RAIL ─── */
function Rail({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="py-3">
      <div className="flex items-end justify-between px-4 mb-2">
        <div>
          <h2 className="font-display font-bold text-base text-foreground">{title}</h2>
          {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-hide snap-x snap-mandatory">
        {children}
      </div>
    </section>
  );
}

/* ─── CATEGORY CHIPS ─── */
const CATS = [
  { key: "festa", label: "Festas", icon: PartyPopper, color: "bg-primary/15 text-primary" },
  { key: "show", label: "Shows", icon: Mic2, color: "bg-blue-500/15 text-blue-400" },
  { key: "balada", label: "Baladas", icon: Zap, color: "bg-accent/15 text-accent" },
  { key: "bar", label: "Bares", icon: Beer, color: "bg-emerald-500/15 text-emerald-400" },
  { key: "sertanejo", label: "Sertanejo", icon: Music, color: "bg-orange-500/15 text-orange-400" },
  { key: "funk", label: "Funk", icon: Flame, color: "bg-pink-500/15 text-pink-400" },
];

function CategoryChips({ selected, onSelect }: { selected: string; onSelect: (c: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
      {CATS.map(({ key, label, icon: Icon, color }) => (
        <button
          key={key}
          onClick={() => onSelect(selected === key ? "" : key)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium shrink-0 transition-all border ${
            selected === key
              ? "gradient-primary text-primary-foreground border-primary neon-glow"
              : `${color} border-transparent hover:border-border`
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
