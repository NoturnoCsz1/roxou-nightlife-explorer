import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { isAfter, startOfDay, addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays, MapPin, Sparkles, Car, ArrowRight, ChevronRight,
  Flame, Music, Mic2, Beer, Zap, PartyPopper, Crown, Eye,
} from "lucide-react";

/* ───── helpers ───── */
const fmtDate = (d: string) => format(new Date(d), "EEE, d MMM · HH'h'mm", { locale: ptBR });

/* ───── types ───── */
interface Ev {
  id: string; slug: string; title: string; image_url: string | null;
  date_time: string; venue_name: string | null; category: string;
  featured: boolean; partner_id: string | null;
}

/* ═══════════════════════════════════════════════════════════════
   V3 HOME — high-conversion nightlife app
   ═══════════════════════════════════════════════════════════════ */
export default function V3Home() {
  const [catFilter, setCatFilter] = useState("");
  const now = new Date();
  const today = startOfDay(now);

  /* events */
  const { data: events = [] } = useQuery<Ev[]>({
    queryKey: ["v3-events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id,slug,title,image_url,date_time,venue_name,category,featured,partner_id")
        .eq("status", "published")
        .gte("date_time", today.toISOString())
        .order("date_time", { ascending: true })
        .limit(60);
      return (data as Ev[]) || [];
    },
  });

  /* trending (views last 24h) */
  const { data: trendingIds = [] } = useQuery({
    queryKey: ["v3-trending"],
    queryFn: async () => {
      const since = new Date(Date.now() - 86400000).toISOString();
      const { data } = await supabase
        .from("page_views")
        .select("event_id")
        .not("event_id", "is", null)
        .gte("created_at", since);
      if (!data) return [];
      const counts: Record<string, number> = {};
      data.forEach((r: { event_id: string | null }) => {
        if (r.event_id) counts[r.event_id] = (counts[r.event_id] || 0) + 1;
      });
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id, views]) => ({ id, views }));
    },
  });

  /* popular venues */
  const { data: venues = [] } = useQuery({
    queryKey: ["v3-popular-venues"],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data } = await supabase
        .from("page_views")
        .select("partner_id")
        .not("partner_id", "is", null)
        .gte("created_at", since);
      if (!data) return [];
      const counts: Record<string, number> = {};
      data.forEach((r: { partner_id: string | null }) => {
        if (r.partner_id) counts[r.partner_id] = (counts[r.partner_id] || 0) + 1;
      });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (!sorted.length) return [];
      const ids = sorted.map(([id]) => id);
      const { data: partners } = await supabase
        .from("partners")
        .select("id,name,slug,type,logo_url")
        .in("id", ids);
      if (!partners) return [];
      return sorted.map(([id, views]) => {
        const p = partners.find((pp: any) => pp.id === id);
        return p ? { ...p, views } : null;
      }).filter(Boolean) as { id: string; name: string; slug: string; type: string; logo_url: string | null; views: number }[];
    },
  });

  /* derived */
  const hero = useMemo(() => events.find((e) => e.featured) || events[0], [events]);
  const heroIsToday = hero && isAfter(addDays(today, 1), new Date(hero.date_time)) && isAfter(new Date(hero.date_time), today);

  const trending = useMemo(() => {
    const ids = new Set(trendingIds.map((t) => t.id));
    return events.filter((e) => ids.has(e.id)).slice(0, 8);
  }, [events, trendingIds]);

  const todayEvents = useMemo(
    () => events.filter((e) => e.id !== hero?.id && isAfter(new Date(e.date_time), today) && isAfter(addDays(today, 1), new Date(e.date_time))),
    [events, today, hero],
  );

  const weekEvents = useMemo(
    () => events.filter((e) => isAfter(new Date(e.date_time), addDays(today, 1)) && isAfter(addDays(today, 7), new Date(e.date_time))),
    [events, today],
  );

  const featured = useMemo(() => events.filter((e) => e.featured && e.id !== hero?.id), [events, hero]);

  const filtered = useMemo(
    () => (catFilter ? events.filter((e) => e.category === catFilter) : []),
    [events, catFilter],
  );

  const maxVenueViews = venues[0]?.views || 1;

  return (
    <div className="space-y-1">
      {/* ─── 1. HERO ─── */}
      {hero && <HeroSection ev={hero} isToday={!!heroIsToday} />}

      {/* ─── 2. CATEGORIES ─── */}
      <CategoryChips selected={catFilter} onSelect={setCatFilter} />

      {/* filtered results */}
      {catFilter && filtered.length > 0 && (
        <Rail title={`${catFilter}`}>
          {filtered.slice(0, 12).map((e) => <EventCard key={e.id} ev={e} />)}
        </Rail>
      )}

      {/* ─── 3. TRENDING ─── */}
      {trending.length > 0 && (
        <Rail title="🔥 Em alta agora" subtitle="Mais vistos nas últimas 24h">
          {trending.map((e) => <EventCard key={e.id} ev={e} size="lg" />)}
        </Rail>
      )}

      {/* ─── 4. POPULAR VENUES ─── */}
      {venues.length > 0 && (
        <section className="px-4 py-4">
          <h2 className="font-display font-bold text-lg text-foreground">📍 Locais em destaque</h2>
          <p className="text-xs text-muted-foreground mb-3">Ranking da semana</p>
          <div className="space-y-2">
            {venues.map((v, i) => (
              <Link
                key={v.id}
                to={`/local/${v.slug}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40 group hover:border-primary/30 transition-all"
              >
                <span className={`font-display font-bold text-lg w-7 text-center ${i === 0 ? "text-primary neon-text" : "text-muted-foreground"}`}>
                  {i === 0 ? <Crown className="w-5 h-5 text-primary inline" /> : `#${i + 1}`}
                </span>
                <div className="w-10 h-10 rounded-lg bg-secondary overflow-hidden shrink-0">
                  {v.logo_url ? (
                    <img src={v.logo_url} alt={v.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-bold">{v.name[0]}</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-sm text-foreground truncate">{v.name}</p>
                  <p className="text-[10px] text-muted-foreground">{v.type}</p>
                  <div className="mt-1 h-1 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full gradient-primary"
                      style={{ width: `${Math.round((v.views / maxVenueViews) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                  <Eye className="w-3 h-3" />
                  <span className="text-[10px] font-medium">{v.views}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─── 5. TODAY ─── */}
      {todayEvents.length > 0 && (
        <Rail title="⚡ Hoje" subtitle="Acontecendo agora">
          {todayEvents.map((e) => <EventCard key={e.id} ev={e} size="lg" />)}
        </Rail>
      )}

      {/* ─── 6. TRANSPORT CTA ─── */}
      <div className="px-4 py-2">
        <Link
          to="/v3/transporte"
          className="relative flex items-center gap-4 p-4 rounded-2xl overflow-hidden border border-primary/20 group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/15 via-accent/10 to-transparent" />
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/10 blur-3xl rounded-full" />
          <div className="relative w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center neon-glow">
            <Car className="w-6 h-6 text-primary" />
          </div>
          <div className="relative flex-1">
            <p className="font-display font-bold text-sm text-foreground">🚗 Roxou Transporte</p>
            <p className="text-xs text-muted-foreground mt-0.5">Encontre uma carona pro rolê</p>
          </div>
          <ArrowRight className="relative w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* ─── 7. PREMIUM / FEATURED ─── */}
      {featured.length > 0 && (
        <Rail title="⭐ Eventos premium" subtitle="Patrocinado">
          {featured.map((e) => <EventCard key={e.id} ev={e} size="lg" premium />)}
        </Rail>
      )}

      {/* ─── 8. THIS WEEK ─── */}
      {weekEvents.length > 0 && (
        <Rail title="📅 Esta semana" subtitle="Próximos 7 dias">
          {weekEvents.slice(0, 12).map((e) => <EventCard key={e.id} ev={e} />)}
        </Rail>
      )}
    </div>
  );
}

/* ═══════ SUB-COMPONENTS ═══════ */

/* ─── HERO ─── */
function HeroSection({ ev, isToday }: { ev: Ev; isToday: boolean }) {
  return (
    <div className="relative">
      <Link to={`/v3/evento/${ev.slug}`} className="block relative h-[340px] overflow-hidden group">
        <img
          src={ev.image_url || "/placeholder.svg"}
          alt={ev.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

        {/* badge */}
        <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/90 backdrop-blur-sm neon-glow">
          {isToday ? <Flame className="w-3.5 h-3.5 text-primary-foreground" /> : <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />}
          <span className="text-[10px] font-bold text-primary-foreground uppercase tracking-wider">
            {isToday ? "Hoje" : "Destaque"}
          </span>
        </div>

        {/* content */}
        <div className="absolute bottom-0 left-0 right-0 p-5 space-y-3">
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">{ev.category}</span>
          <h1 className="font-display font-bold text-2xl text-foreground leading-tight line-clamp-2 neon-text">{ev.title}</h1>
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              <span className="text-xs capitalize">{fmtDate(ev.date_time)}</span>
            </div>
            {ev.venue_name && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span className="text-xs truncate max-w-[140px]">{ev.venue_name}</span>
              </div>
            )}
          </div>

          {/* CTAs */}
          <div className="flex gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full gradient-primary text-primary-foreground text-xs font-bold neon-glow">
              Ver evento <ArrowRight className="w-3.5 h-3.5" />
            </span>
            <Link
              to={`/v3/transporte?event=${encodeURIComponent(ev.title)}&venue=${encodeURIComponent(ev.venue_name || "")}&date=${ev.date_time}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-card/80 backdrop-blur-sm border border-border/40 text-foreground text-xs font-medium hover:border-primary/40 transition-colors"
            >
              <Car className="w-3.5 h-3.5 text-primary" /> Ir com motorista
            </Link>
          </div>
        </div>
      </Link>
      {/* bottom glow */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2/3 h-8 bg-primary/15 blur-2xl rounded-full" />
    </div>
  );
}

/* ─── EVENT CARD ─── */
function EventCard({ ev, size = "md", premium }: { ev: Ev; size?: "md" | "lg"; premium?: boolean }) {
  const isLg = size === "lg";
  return (
    <Link
      to={`/v3/evento/${ev.slug}`}
      className={`shrink-0 snap-start rounded-xl overflow-hidden bg-card border group transition-all active:scale-[0.97] ${
        premium ? "border-primary/30 neon-border" : "border-border/40"
      } ${isLg ? "w-[260px]" : "w-[180px]"}`}
    >
      <div className={`relative ${isLg ? "h-[150px]" : "h-[120px]"} overflow-hidden`}>
        <img
          src={ev.image_url || "/placeholder.svg"}
          alt={ev.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary/90 text-[9px] font-bold text-primary-foreground uppercase tracking-wide">
          {ev.category}
        </span>
        {premium && (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full gradient-primary text-[9px] font-bold text-primary-foreground uppercase">
            ⭐ Premium
          </span>
        )}
      </div>
      <div className="p-3 space-y-1">
        <h3 className="font-display font-semibold text-sm text-foreground line-clamp-2 leading-tight">{ev.title}</h3>
        <div className="flex items-center gap-1 text-muted-foreground">
          <CalendarDays className="w-3 h-3 shrink-0" />
          <span className="text-[10px] capitalize">{fmtDate(ev.date_time)}</span>
        </div>
        {ev.venue_name && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="text-[10px] truncate">{ev.venue_name}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

/* ─── CONTENT RAIL ─── */
function Rail({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="py-3">
      <div className="flex items-end justify-between px-4 mb-2">
        <div>
          <h2 className="font-display font-bold text-lg text-foreground">{title}</h2>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide snap-x snap-mandatory">
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
