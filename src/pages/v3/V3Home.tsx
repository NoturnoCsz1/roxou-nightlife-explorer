import { useState, useMemo, ReactNode } from "react";
import { useScrollFadeIn } from "@/hooks/useScrollFadeIn";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { isAfter, startOfDay, addDays, format, isToday as isTodayFn } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays, MapPin, Sparkles, Car, ArrowRight, Clock,
  Crown, Eye, TrendingUp,
  ChevronRight, Gem, BadgeCheck, Heart, Flame,
  PartyPopper, Mic2, Zap, Beer, Music,
} from "lucide-react";
import ReservationDrawer from "@/components/v3/ReservationDrawer";
import CategoryChips from "@/components/v3/CategoryChips";
import { useSavedEvents } from "@/hooks/useSavedEvents";
import AIHomeWidget from "@/components/v3/AIHomeWidget";

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
  const tomorrow = addDays(startOfDay(new Date()), 1);
  if (dt >= tomorrow && dt < addDays(tomorrow, 1)) return "AMANHÃ";
  return format(dt, "EEEE", { locale: ptBR }).toUpperCase();
};

interface Ev {
  id: string; slug: string; title: string; image_url: string | null;
  date_time: string; venue_name: string | null; category: string;
  sub_category?: string | null; featured: boolean; partner_id: string | null; ticket_url: string | null;
}

const VIBE_FILTERS = [
  { key: "bombando", label: "🔥 Bombando" },
  { key: "musica", label: "🎸 Música ao Vivo" },
  { key: "happy", label: "🍹 Happy Hour" },
  { key: "grandes", label: "🏟️ Grandes Eventos" },
];

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

  /* ─── EVENTS ─── */
  const { data: events = [], isLoading: loadingEvents } = useQuery<Ev[]>({
    queryKey: ["v3-events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
          .select("id,slug,title,image_url,date_time,venue_name,category,sub_category,featured,partner_id,ticket_url")
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
  const { data: featuredPartners = [] } = useQuery<VenueRank[]>({
    queryKey: ["v3-featured-partners"],
    queryFn: async () => {
      const { data: partners } = await supabase
        .from("partners").select("id,name,slug,type,logo_url,short_description,verified_partner")
        .eq("active", true).limit(30);
      if (!partners?.length) return [];
      const weekEnd = addDays(today, 7).toISOString();
      const { data: evData } = await supabase
        .from("events").select("partner_id")
        .eq("status", "published").gte("date_time", today.toISOString()).lte("date_time", weekEnd);
      const evMap: Record<string, number> = {};
      evData?.forEach((e: any) => { if (e.partner_id) evMap[e.partner_id] = (evMap[e.partner_id] || 0) + 1; });
      const withEvents = partners
        .filter((p: any) => (evMap[p.id] || 0) > 0)
        .map((p: any) => ({ ...p, views: 0, upcoming_events: evMap[p.id] || 0 }))
        .sort((a: any, b: any) => b.upcoming_events - a.upcoming_events)
        .slice(0, 8);
      const rankMap = new Map(venueRanks.map((v, i) => [v.id, i + 1]));
      return withEvents.map((p: any) => ({ ...p, _rank: rankMap.get(p.id) || 0 }));
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
    return combined.filter((e, i, arr) => arr.findIndex(x => x.id === e.id) === i).slice(0, 4);
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
    const idSet = new Set(trendingIds.map(t => t.id));
    const result = events.filter(e => idSet.has(e.id) && !usedIds.has(e.id)).slice(0, 8);
    result.forEach(e => usedIds.add(e.id));
    return result;
  }, [events, trendingIds, usedIds]);

  const todayEvents = useMemo(
    () => events.filter(e => !usedIds.has(e.id) && isTodayFn(new Date(e.date_time)))
      .slice(0, 12).map(e => { usedIds.add(e.id); return e; }),
    [events, usedIds],
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
      <div className="hidden lg:block">
        <CommandCenter
          todayEvents={todayEvents}
          trending={trending}
          featured={featured}
          weekEvents={weekEvents}
          trendingIdSet={trendingIdSet}
          partnerRankMap={partnerRankMap}
        />
      </div>

      <div className="space-y-1 -mt-14 lg:hidden">
      {/* ══════ 1. IMMERSIVE HERO — viewport tall ══════ */}
      {isLoading ? <HeroSkeleton /> : hero ? (
        <div className="relative">
          <ImmersiveHero
            ev={hero}
            isToday={!!heroIsToday}
            todayCount={todayCount}
            venueRank={hero.partner_id ? partnerRankMap.get(hero.partner_id) : undefined}
          />
          {heroEvents.length > 1 && (
            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
              {heroEvents.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => setHeroIdx(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === heroIdx ? "bg-primary w-7 shadow-[0_0_10px_hsl(var(--primary)/0.7)]" : "bg-foreground/30 w-2"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      ) : <EmptyHero />}

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
                <Link key={v.id} to={`/v3/local/${v.slug}`}
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

      {/* ══════ 6. HOJE ══════ */}
      {isLoading ? <RailSkeleton count={3} /> : todayEvents.length > 0 ? (
        <TodayTimeline events={todayEvents} partnerRankMap={partnerRankMap} trendingIdSet={trendingIdSet} />
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
      {/* Footer institucional V3 */}
      <FadeSection className="px-4 pt-8 pb-4">
        <div className="flex items-center justify-center gap-4 text-[11px] font-medium text-muted-foreground">
          <Link to="/v3/sobre" className="hover:text-primary transition-colors">Sobre</Link>
          <span className="opacity-30">·</span>
          <Link to="/v3/privacidade" className="hover:text-primary transition-colors">Privacidade</Link>
          <span className="opacity-30">·</span>
          <Link to="/v3/contato" className="hover:text-primary transition-colors">Contato</Link>
        </div>
      </FadeSection>

      <div className="h-6" />
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
function ImmersiveHero({ ev, isToday, todayCount, venueRank }: {
  ev: Ev; isToday: boolean; todayCount: number; venueRank?: number;
}) {
  const dayLabel = getDayLabel(ev.date_time);
  const momentumText = isToday && todayCount > 1
    ? `+${todayCount - 1} eventos rolando`
    : venueRank && venueRank <= 3 ? "Top venue da semana" : null;

  return (
    <div className="relative h-[88vh] min-h-[560px] max-h-[820px] overflow-hidden">
      {/* Background image with Ken Burns */}
      <img
        src={ev.image_url || "/placeholder.svg"}
        alt={ev.title}
        className="absolute inset-0 w-full h-full object-cover scale-105 animate-[v3PageFade_700ms_ease-out_both]"
      />
      {/* Cinematic overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-background/15" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-transparent" />
      <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[120%] h-44 bg-primary/15 blur-[100px] rounded-full" />

      {/* Top badges */}
      <div className="absolute top-20 left-4 right-4 flex items-center gap-2 z-10">
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/95 backdrop-blur-sm neon-glow">
          {isToday ? <Flame className="w-3.5 h-3.5 text-primary-foreground" /> : <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />}
          <span className="text-[10px] font-extrabold text-primary-foreground uppercase tracking-[0.15em]">{dayLabel}</span>
        </span>
        {momentumText && (
          <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-full v3-glass-strong">
            <TrendingUp className="w-3 h-3 text-accent" />
            <span className="text-[9px] font-bold text-accent uppercase tracking-wide">{momentumText}</span>
          </span>
        )}
      </div>

      {/* Bottom content — extra-bold gigantic title */}
      <div className="absolute bottom-0 left-0 right-0 p-5 pb-12 space-y-3 z-10">
        <span className="text-[10px] font-extrabold text-primary uppercase tracking-[0.25em]">{ev.category}</span>
        <h1 className="font-display font-black text-[42px] leading-[0.95] text-foreground line-clamp-3 neon-text">
          {ev.title.toUpperCase()}
        </h1>

        {/* Info row with neon icons */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1">
          {ev.venue_name && (
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <MapPin className="w-3 h-3 text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.8)]" />
              </div>
              <span className="text-sm font-bold text-foreground/95 truncate max-w-[180px]">{ev.venue_name}</span>
              {venueRank && venueRank <= 3 && (
                <span className="px-1.5 py-0.5 rounded bg-primary/20 text-[8px] font-bold text-primary">#{venueRank}</span>
              )}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
              <Clock className="w-3 h-3 text-accent drop-shadow-[0_0_6px_hsl(var(--accent)/0.8)]" />
            </div>
            <span className="text-xs font-semibold text-foreground/85 capitalize">{fmtDateFull(ev.date_time)}</span>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex gap-2 pt-3">
          <Link
            to={`/v3/evento/${ev.slug}`}
            className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full gradient-primary text-primary-foreground text-[12px] font-extrabold uppercase tracking-wider neon-glow active:scale-95 transition-transform"
          >
            Ver evento <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to={`/v3/transporte?event=${encodeURIComponent(ev.title)}&venue=${encodeURIComponent(ev.venue_name || "")}&date=${ev.date_time}`}
            className="inline-flex items-center gap-1.5 px-4 py-3 rounded-full v3-glass-strong text-foreground text-[11px] font-bold uppercase tracking-wider hover:border-primary/50 transition-colors active:scale-95"
          >
            <Car className="w-3.5 h-3.5 text-primary" /> Como vou?
          </Link>
        </div>
      </div>
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
  ] as const;

  return (
    <FadeSection className="px-4 pt-5 pb-3">
      <div className="grid grid-cols-2 gap-3 auto-rows-[136px]">
        {/* Transport — large featured tile (2 cols, 2 rows) */}
        <Link
          to="/v3/transporte"
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
      to={`/v3/descobrir?cat=${categoryKey}`}
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
        <span className="font-display text-xl font-black uppercase tracking-wide text-foreground v3-neon-text leading-none">
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
      to={`/v3/local/${v.slug}`}
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
      to={`/v3/local/${v.slug}`}
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
      to={`/v3/local/${p.slug}`}
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
function CommandCenter({ todayEvents, trending, featured, weekEvents, trendingIdSet, partnerRankMap }: {
  todayEvents: Ev[]; trending: Ev[]; featured: Ev[]; weekEvents: Ev[];
  trendingIdSet: Set<string>; partnerRankMap: Map<string, number>;
}) {
  const sideEvents = [...trending, ...featured, ...weekEvents].filter((e, i, arr) => arr.findIndex(x => x.id === e.id) === i).slice(0, 6);
  if (!todayEvents.length && !sideEvents.length) return null;

  return (
    <FadeSection className="hidden lg:block max-w-7xl mx-auto px-6 py-8">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-primary">The Command Center</p>
          <h2 className="font-display text-3xl font-black uppercase text-foreground">Painel da noite</h2>
        </div>
        <span className="rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-[11px] font-bold uppercase text-primary shadow-[0_0_15px_hsl(var(--primary)/0.22)]">
          {todayEvents.length} eventos hoje
        </span>
      </div>
      <div className="grid grid-cols-12 grid-rows-[220px_220px] gap-4">
        <div className="col-span-7 row-span-2 rounded-3xl v3-glass p-4 shadow-[0_0_15px_hsl(var(--primary)/0.16)]">
          <TodayTimeline events={todayEvents.slice(0, 5)} partnerRankMap={partnerRankMap} trendingIdSet={trendingIdSet} compact />
        </div>
        {sideEvents.slice(0, 4).map((ev, i) => (
          <PremiumEventCard
            key={ev.id}
            ev={ev}
            size={i === 0 ? "lg" : "md"}
            isTrending={trendingIdSet.has(ev.id)}
            partnerRank={ev.partner_id ? partnerRankMap.get(ev.partner_id) : undefined}
            className={i === 0 ? "col-span-5 !w-full h-full" : "col-span-2 !w-full h-full"}
          />
        ))}
      </div>
    </FadeSection>
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
            "inset 0 1px 0 rgba(255,255,255,0.06), 0 0 15px hsl(var(--primary) / 0.18), 0 14px 36px rgba(0,0,0,0.5)",
        }}
      >
        <Link to={`/v3/evento/${ev.slug}`} className="absolute inset-0 block">
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={ev.image_url || "/placeholder.svg"}
              alt={ev.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/35 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/10" />
            {/* Inner ring shadow */}
            <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-3xl pointer-events-none group-hover:ring-primary/60 transition-colors" />
            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary/95 text-[8px] font-extrabold text-primary-foreground uppercase tracking-[0.12em]">
              {getDayLabel(ev.date_time)}
            </span>
            {live && (
              <span className="absolute top-10 left-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_hsl(142_71%_45%)]" /> A rolar
              </span>
            )}
            <button
              type="button"
              aria-label={saved ? "Remover dos favoritos" : "Favoritar evento"}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleSave(ev.id);
              }}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/65 backdrop-blur-md border border-border/40 flex items-center justify-center transition-all active:scale-90"
            >
              <Heart className={`w-4 h-4 ${saved ? "text-primary fill-primary" : "text-foreground"}`} />
            </button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
            <h3 className={`font-display font-black text-foreground line-clamp-2 leading-tight ${isLg || timeline ? "text-xl" : "text-base"}`}>{ev.title}</h3>
            <div className="flex items-center gap-2 text-[11px] font-bold text-foreground/90">
              <Clock className="w-3.5 h-3.5 text-accent drop-shadow-[0_0_8px_hsl(var(--accent)/0.8)]" />
              <span className="capitalize">{fmtDateFull(ev.date_time)}</span>
            </div>
            {ev.venue_name && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0 drop-shadow-[0_0_8px_hsl(var(--primary)/0.8)]" />
                <span className="text-[11px] font-semibold text-foreground/85 truncate">{ev.venue_name}</span>
              </div>
            )}
            {badge && <span className="inline-block text-[9px] font-bold text-accent">{badge}</span>}
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
            className="flex items-center justify-center gap-1 rounded-full px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-white v3-neon-hover"
            style={{ background: "linear-gradient(135deg, hsl(var(--v3-neon) / 0.95), hsl(var(--v3-neon-soft) / 0.95))" }}
          >
            <Sparkles className="w-3 h-3" />
            Reservar
          </button>
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
