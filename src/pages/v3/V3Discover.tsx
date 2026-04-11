import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { isAfter, startOfDay, addDays, format, isToday as isTodayFn } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Search, MapPin, Clock, Flame, Music, Mic2, Beer, Zap, PartyPopper,
  ChevronRight, Utensils, Dribbble,
  TrendingUp, BadgeCheck, X,
} from "lucide-react";
import { Input } from "@/components/ui/input";

const fmtTime = (d: string) => format(new Date(d), "HH'h'mm", { locale: ptBR });
const _fmtDateShort = (d: string) => format(new Date(d), "EEE, d MMM", { locale: ptBR });
const getDayLabel = (d: string) => {
  const dt = new Date(d);
  if (isTodayFn(dt)) return "HOJE";
  const tomorrow = addDays(startOfDay(new Date()), 1);
  if (dt >= tomorrow && dt < addDays(tomorrow, 1)) return "AMANHÃ";
  return format(dt, "EEEE", { locale: ptBR }).toUpperCase();
};

/* ─── CATEGORIES ─── */
const CATEGORIES = [
  { key: "bar", label: "Bar", icon: Beer, color: "bg-emerald-500/15 text-emerald-400" },
  { key: "balada", label: "Balada", icon: Zap, color: "bg-accent/15 text-accent" },
  { key: "festa", label: "Festa", icon: PartyPopper, color: "bg-primary/15 text-primary" },
  { key: "show", label: "Evento", icon: Mic2, color: "bg-blue-500/15 text-blue-400" },
  { key: "restaurante", label: "Restaurante", icon: Utensils, color: "bg-amber-500/15 text-amber-400" },
  { key: "casa de shows", label: "Casa de Show", icon: Music, color: "bg-violet-500/15 text-violet-400" },
  { key: "festival", label: "Futebol", icon: Dribbble, color: "bg-green-500/15 text-green-400" },
];

const SUBCATEGORIES = [
  { key: "funk", label: "Funk" },
  { key: "mpb", label: "MPB" },
  { key: "rock", label: "Rock" },
  { key: "pop_rock", label: "Pop Rock" },
  { key: "eletronica", label: "Eletrônico" },
  { key: "bailao", label: "Bailão" },
  { key: "sertanejo", label: "Sertanejo" },
];

const DATE_FILTERS = [
  { key: "hoje", label: "Hoje" },
  { key: "amanha", label: "Amanhã" },
  { key: "semana", label: "Esta semana" },
];

interface Ev {
  id: string; slug: string; title: string; image_url: string | null;
  date_time: string; venue_name: string | null; category: string;
  sub_category: string | null; featured: boolean; partner_id: string | null;
}

export default function V3Discover() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [subFilter, setSubFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const now = new Date();
  const today = startOfDay(now);

  /* ─── EVENTS ─── */
  const { data: events = [], isLoading: _loadingEvents } = useQuery<Ev[]>({
    queryKey: ["v3-discover-events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id,slug,title,image_url,date_time,venue_name,category,sub_category,featured,partner_id")
        .eq("status", "published")
        .gte("date_time", today.toISOString())
        .order("date_time", { ascending: true })
        .limit(200);
      return (data as Ev[]) || [];
    },
  });

  /* ─── TRENDING ─── */
  const { data: trendingIds = [] } = useQuery({
    queryKey: ["v3-trending-discover"],
    queryFn: async () => {
      const since = new Date(Date.now() - 86400000).toISOString();
      const { data } = await supabase.from("page_views").select("event_id")
        .not("event_id", "is", null).gte("created_at", since);
      if (!data) return [];
      const counts: Record<string, number> = {};
      data.forEach((r: any) => { if (r.event_id) counts[r.event_id] = (counts[r.event_id] || 0) + 1; });
      return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id]) => id);
    },
  });

  /* ─── VERIFIED PARTNERS ─── */
  const { data: verifiedPartners = [] } = useQuery({
    queryKey: ["v3-verified-partners"],
    queryFn: async () => {
      const { data } = await supabase.from("partners")
        .select("id,name,slug,type,logo_url,short_description,verified_partner")
        .eq("active", true).eq("verified_partner", true).limit(20);
      return data || [];
    },
  });

  /* ─── FILTERING ─── */
  const filtered = useMemo(() => {
    let result = events;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        (e.venue_name && e.venue_name.toLowerCase().includes(q))
      );
    }

    if (catFilter) {
      // For "restaurante" and "casa de shows", match partner type via venue events
      result = result.filter(e => e.category === catFilter);
    }

    if (subFilter) {
      result = result.filter(e => e.sub_category === subFilter || e.category === subFilter);
    }

    if (dateFilter === "hoje") {
      result = result.filter(e => isTodayFn(new Date(e.date_time)));
    } else if (dateFilter === "amanha") {
      const tmrw = addDays(today, 1);
      result = result.filter(e => {
        const d = startOfDay(new Date(e.date_time));
        return d.getTime() === tmrw.getTime();
      });
    } else if (dateFilter === "semana") {
      const weekEnd = addDays(today, 7);
      result = result.filter(e => isAfter(weekEnd, new Date(e.date_time)));
    }

    return result;
  }, [events, search, catFilter, subFilter, dateFilter, today]);

  const trendingSet = useMemo(() => new Set(trendingIds), [trendingIds]);
  const trending = useMemo(() => events.filter(e => trendingSet.has(e.id)).slice(0, 8), [events, trendingSet]);

  const hasActiveFilter = !!search || !!catFilter || !!subFilter || !!dateFilter;

  /* ─── Popular categories by event count ─── */
  const popularCats = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach(e => { counts[e.category] = (counts[e.category] || 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, count]) => {
        const cat = CATEGORIES.find(c => c.key === key);
        return cat ? { ...cat, count } : null;
      })
      .filter(Boolean) as (typeof CATEGORIES[0] & { count: number })[];
  }, [events]);

  return (
    <div className="pb-4">
      {/* ── Search ── */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar eventos, locais..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 rounded-xl bg-card border-border/40 text-sm"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* ── Categories ── */}
      <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-hide">
        {CATEGORIES.map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => setCatFilter(catFilter === key ? "" : key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium shrink-0 transition-all border ${
              catFilter === key
                ? "gradient-primary text-primary-foreground border-primary neon-glow"
                : `${color} border-transparent hover:border-border`
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Subcategories ── */}
      <div className="flex gap-1.5 overflow-x-auto px-4 py-1 scrollbar-hide">
        {SUBCATEGORIES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSubFilter(subFilter === key ? "" : key)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium shrink-0 transition-all border ${
              subFilter === key
                ? "bg-primary/20 text-primary border-primary/40"
                : "bg-card text-muted-foreground border-border/30 hover:border-border/60"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Date filters ── */}
      <div className="flex gap-2 px-4 py-2">
        {DATE_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setDateFilter(dateFilter === key ? "" : key)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
              dateFilter === key
                ? "bg-accent/20 text-accent border-accent/40"
                : "bg-card text-muted-foreground border-border/30 hover:border-border/60"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Active filter results ── */}
      {hasActiveFilter ? (
        <section className="px-4 pt-3">
          <p className="text-xs text-muted-foreground mb-3">
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
          </p>
          {filtered.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5">
              {filtered.slice(0, 20).map(e => (
                <DiscoverEventCard key={e.id} ev={e} isTrending={trendingSet.has(e.id)} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Search className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum evento encontrado</p>
            </div>
          )}
        </section>
      ) : (
        <>
          {/* ── Em alta ── */}
          {trending.length > 0 && (
            <section className="py-3">
              <div className="flex items-center gap-2 px-4 mb-2">
                <Flame className="w-4 h-4 text-primary" />
                <h2 className="font-display font-bold text-base text-foreground">Em alta agora</h2>
              </div>
              <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-hide snap-x snap-mandatory">
                {trending.map(e => (
                  <Link key={e.id} to={`/v3/evento/${e.slug}`}
                    className="shrink-0 snap-start w-[200px] rounded-xl overflow-hidden bg-card border border-border/40 group active:scale-[0.97] transition-transform">
                    <div className="relative h-[110px] overflow-hidden">
                      <img src={e.image_url || "/placeholder.svg"} alt={e.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <span className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/90 text-[8px] font-bold text-primary-foreground">
                        <TrendingUp className="w-2.5 h-2.5" /> EM ALTA
                      </span>
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-sm">
                        <Clock className="w-2.5 h-2.5 text-primary" />
                        <span className="text-[9px] font-bold text-foreground">{fmtTime(e.date_time)}</span>
                      </div>
                    </div>
                    <div className="p-2.5 space-y-1">
                      <h3 className="font-display font-semibold text-[12px] text-foreground line-clamp-2 leading-snug">{e.title}</h3>
                      {e.venue_name && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-primary shrink-0" />
                          <span className="text-[10px] text-muted-foreground truncate">{e.venue_name}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── Parceiros verificados ── */}
          {verifiedPartners.length > 0 && (
            <section className="py-3">
              <div className="flex items-center gap-2 px-4 mb-2">
                <BadgeCheck className="w-4 h-4 text-accent" />
                <h2 className="font-display font-bold text-base text-foreground">Parceiros verificados</h2>
              </div>
              <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-hide snap-x snap-mandatory">
                {verifiedPartners.map((p: any) => (
                  <Link key={p.id} to={`/v3/local/${p.slug}`}
                    className="shrink-0 snap-start w-[160px] rounded-xl bg-card border border-border/40 hover:border-accent/30 transition-all overflow-hidden group active:scale-[0.97]">
                    <div className="relative h-[70px] bg-secondary overflow-hidden">
                      {p.logo_url ? (
                        <img src={p.logo_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/10">
                          <span className="font-display font-bold text-xl text-primary/60">{p.name[0]}</span>
                        </div>
                      )}
                      <div className="absolute top-1.5 right-1.5">
                        <BadgeCheck className="w-4 h-4 text-accent drop-shadow-md" />
                      </div>
                    </div>
                    <div className="p-2.5">
                      <p className="font-display font-bold text-[12px] text-foreground truncate">{p.name}</p>
                      <p className="text-[9px] text-muted-foreground capitalize">{p.type}</p>
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary mt-1">
                        Ver agenda <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── Categorias populares ── */}
          {popularCats.length > 0 && (
            <section className="px-4 py-3">
              <h2 className="font-display font-bold text-base text-foreground mb-3">Categorias populares</h2>
              <div className="grid grid-cols-2 gap-2">
                {popularCats.map(c => (
                  <button
                    key={c.key}
                    onClick={() => setCatFilter(c.key)}
                    className={`flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-primary/30 transition-all ${c.color} bg-opacity-50`}
                  >
                    <c.icon className="w-5 h-5 shrink-0" />
                    <div className="text-left">
                      <p className="text-xs font-semibold text-foreground">{c.label}</p>
                      <p className="text-[10px] text-muted-foreground">{c.count} evento{c.count > 1 ? "s" : ""}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <div className="h-4" />
    </div>
  );
}

/* ── GRID EVENT CARD ── */
function DiscoverEventCard({ ev, isTrending }: { ev: Ev; isTrending?: boolean }) {
  return (
    <Link to={`/v3/evento/${ev.slug}`}
      className="rounded-xl overflow-hidden bg-card border border-border/40 group active:scale-[0.97] transition-transform">
      <div className="relative h-[100px] overflow-hidden">
        <img src={ev.image_url || "/placeholder.svg"} alt={ev.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-primary/90 text-[8px] font-bold text-primary-foreground uppercase tracking-wider">
          {getDayLabel(ev.date_time)}
        </span>
        <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm">
          <Clock className="w-2.5 h-2.5 text-primary" />
          <span className="text-[9px] font-bold text-foreground">{fmtTime(ev.date_time)}</span>
        </div>
        {isTrending && (
          <span className="absolute top-1.5 right-1.5 text-[8px] font-bold text-accent">🔥</span>
        )}
      </div>
      <div className="p-2 space-y-0.5">
        <h3 className="font-display font-semibold text-[11px] text-foreground line-clamp-2 leading-snug">{ev.title}</h3>
        {ev.venue_name && (
          <div className="flex items-center gap-1">
            <MapPin className="w-2.5 h-2.5 text-primary shrink-0" />
            <span className="text-[9px] text-muted-foreground truncate">{ev.venue_name}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
