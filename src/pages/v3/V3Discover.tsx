import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { isAfter, startOfDay, addDays, format, isToday as isTodayFn } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Search, MapPin, Clock, Flame, Music, Mic2, Beer, Zap, PartyPopper,
  ChevronRight, Dribbble, UtensilsCrossed, Building2, Sparkles,
  TrendingUp, BadgeCheck, X, Bookmark, Heart, Filter as FilterIcon, SlidersHorizontal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useSavedEvents } from "@/hooks/useSavedEvents";
import { useSavedPartners } from "@/hooks/useSavedPartners";

const fmtTime = (d: string) => format(new Date(d), "HH'h'mm", { locale: ptBR });
const getDayLabel = (d: string) => {
  const dt = new Date(d);
  if (isTodayFn(dt)) return "HOJE";
  const tomorrow = addDays(startOfDay(new Date()), 1);
  if (dt >= tomorrow && dt < addDays(tomorrow, 1)) return "AMANHÃ";
  return format(dt, "EEEE", { locale: ptBR }).toUpperCase();
};

/* ─── EVENT CATEGORIES ─── */
const EVENT_CATEGORIES = [
  { key: "bar", label: "Bar", icon: Beer, color: "bg-emerald-500/15 text-emerald-400" },
  { key: "balada", label: "Balada", icon: Zap, color: "bg-accent/15 text-accent" },
  { key: "festa", label: "Festa", icon: PartyPopper, color: "bg-primary/15 text-primary" },
  { key: "show", label: "Show", icon: Mic2, color: "bg-blue-500/15 text-blue-400" },
  { key: "festival", label: "Futebol", icon: Dribbble, color: "bg-green-500/15 text-green-400" },
];

/* ─── VENUE TYPES ─── */
const VENUE_TYPES = [
  { key: "bar", label: "Bar" },
  { key: "balada", label: "Balada" },
  { key: "restaurante", label: "Restaurante" },
  { key: "casa de show", label: "Casa de Show" },
  { key: "pub", label: "Pub" },
];

/* ─── SUBCATEGORIES ─── */
const SUBCATEGORIES = [
  { key: "funk", label: "Funk" },
  { key: "mpb", label: "MPB" },
  { key: "rock", label: "Rock" },
  { key: "pop_rock", label: "Pop Rock" },
  { key: "eletronica", label: "Eletrônico" },
  { key: "sertanejo", label: "Sertanejo" },
  { key: "pagode", label: "Pagode" },
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
  const [venueTypeFilter, setVenueTypeFilter] = useState("");
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [showMostAccessed, setShowMostAccessed] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const today = startOfDay(new Date());
  const { user } = useAuth();
  const { isSaved, toggleSave } = useSavedEvents();
  const { isFollowed, toggleFollow } = useSavedPartners();

  /* ─── EVENTS ─── */
  const { data: events = [] } = useQuery<Ev[]>({
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
      return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([id]) => id);
    },
  });

  /* ─── VERIFIED PARTNERS ─── */
  const { data: allPartners = [] } = useQuery({
    queryKey: ["v3-all-partners-discover"],
    queryFn: async () => {
      const { data } = await supabase.from("partners")
        .select("id,name,slug,type,logo_url,short_description,verified_partner")
        .eq("active", true).limit(50);
      return data || [];
    },
  });

  /* ─── DEBOUNCED SEARCH ─── */
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  /* ─── PARTNER SEARCH (fallback layer) ─── */
  const { data: partnerMatches = [] } = useQuery({
    queryKey: ["v3-partner-search", debouncedSearch],
    enabled: debouncedSearch.length >= 2,
    queryFn: async () => {
      const term = `%${debouncedSearch}%`;
      const { data } = await supabase
        .from("partners")
        .select("id,name,slug,type,logo_url,short_description,verified_partner,city")
        .eq("active", true)
        .or(`name.ilike.${term},short_description.ilike.${term},neighborhood.ilike.${term}`)
        .limit(8);
      return data || [];
    },
  });

  const verifiedPartnerIds = useMemo(() => new Set((allPartners as any[]).filter((p: any) => p.verified_partner).map((p: any) => p.id)), [allPartners]);
  const verifiedPartners = useMemo(() => (allPartners as any[]).filter((p: any) => p.verified_partner), [allPartners]);
  const partnerTypeMap = useMemo(() => {
    const m = new Map<string, string>();
    (allPartners as any[]).forEach((p: any) => m.set(p.id, p.type));
    return m;
  }, [allPartners]);

  /* ─── NORMALIZE (case + accent insensitive) ─── */
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  /* ─── FILTERING ─── */
  const filtered = useMemo(() => {
    let result = events;

    if (search) {
      const q = norm(search);
      result = result.filter(e =>
        norm(e.title).includes(q) ||
        (e.venue_name && norm(e.venue_name).includes(q))
      );
    }
    if (catFilter) result = result.filter(e => e.category === catFilter);
    if (subFilter) result = result.filter(e => e.sub_category === subFilter || e.category === subFilter);

    if (dateFilter === "hoje") {
      result = result.filter(e => isTodayFn(new Date(e.date_time)));
    } else if (dateFilter === "amanha") {
      const tmrw = addDays(today, 1);
      result = result.filter(e => startOfDay(new Date(e.date_time)).getTime() === tmrw.getTime());
    } else if (dateFilter === "semana") {
      result = result.filter(e => isAfter(addDays(today, 7), new Date(e.date_time)));
    }

    if (showVerifiedOnly) result = result.filter(e => e.partner_id && verifiedPartnerIds.has(e.partner_id));
    if (showMostAccessed) {
      const trendSet = new Set(trendingIds);
      result = result.filter(e => trendSet.has(e.id));
    }
    if (venueTypeFilter) {
      result = result.filter(e => e.partner_id && partnerTypeMap.get(e.partner_id)?.toLowerCase() === venueTypeFilter);
    }

    return result;
  }, [events, search, catFilter, subFilter, dateFilter, today, showVerifiedOnly, showMostAccessed, venueTypeFilter, verifiedPartnerIds, trendingIds, partnerTypeMap]);

  /* ─── CATEGORY GUESS (fallback when nothing matches) ─── */
  const guessedCategory = useMemo(() => {
    if (!debouncedSearch) return null;
    const q = norm(debouncedSearch);
    const map: Record<string, string[]> = {
      balada: ["balada", "club", "night", "noite", "pista"],
      festa: ["festa", "open", "rave", "baile"],
      show: ["show", "banda", "ao vivo", "acustico", "voz"],
      bar: ["bar", "boteco", "chopp", "happy"],
      festival: ["festival", "futebol", "jogo", "copa", "brasileir"],
      restaurante: ["restaurante", "jantar", "rodizio", "gastro"],
    };
    for (const [cat, keys] of Object.entries(map)) {
      if (keys.some(k => q.includes(k))) return cat;
    }
    return null;
  }, [debouncedSearch]);

  const suggestedByCategory = useMemo(() => {
    if (!guessedCategory) return [];
    return events.filter(e => e.category === guessedCategory).slice(0, 6);
  }, [events, guessedCategory]);

  const trendingSet = useMemo(() => new Set(trendingIds), [trendingIds]);
  const trending = useMemo(() => events.filter(e => trendingSet.has(e.id)).slice(0, 8), [events, trendingSet]);

  const hasActiveFilter = !!search || !!catFilter || !!subFilter || !!dateFilter || showVerifiedOnly || showMostAccessed || !!venueTypeFilter;

  const clearFilters = () => {
    setCatFilter(""); setSubFilter(""); setDateFilter(""); setSearch("");
    setShowVerifiedOnly(false); setShowMostAccessed(false); setVenueTypeFilter("");
  };

  const popularCats = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach(e => { counts[e.category] = (counts[e.category] || 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([key, count]) => {
        const cat = EVENT_CATEGORIES.find(c => c.key === key);
        return cat ? { ...cat, count } : null;
      })
      .filter(Boolean) as (typeof EVENT_CATEGORIES[0] & { count: number })[];
  }, [events]);

  const activeFilterCount = [catFilter, subFilter, dateFilter, venueTypeFilter, showVerifiedOnly, showMostAccessed].filter(Boolean).length;

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
            className="pl-9 pr-20 h-11 rounded-xl bg-card border-border/40 text-sm"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {search && (
              <button onClick={() => setSearch("")} className="p-1">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${showFilters ? "bg-primary/20 text-primary" : "bg-secondary/50 text-muted-foreground"}`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full gradient-primary text-[8px] font-bold text-primary-foreground flex items-center justify-center">{activeFilterCount}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Event Categories ── */}
      <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-hide">
        {EVENT_CATEGORIES.map(({ key, label, icon: Icon, color }) => (
          <button key={key} onClick={() => setCatFilter(catFilter === key ? "" : key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium shrink-0 transition-all border ${
              catFilter === key ? "gradient-primary text-primary-foreground border-primary neon-glow" : `${color} border-transparent hover:border-border`
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* ── Extended Filters Panel ── */}
      {showFilters && (
        <div className="px-4 py-2 space-y-2 border-b border-border/20 pb-3">
          {/* Subcategories */}
          <div>
            <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide">Estilo musical</span>
            <div className="flex gap-1.5 overflow-x-auto mt-1 scrollbar-hide">
              {SUBCATEGORIES.map(({ key, label }) => (
                <button key={key} onClick={() => setSubFilter(subFilter === key ? "" : key)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium shrink-0 transition-all border ${
                    subFilter === key ? "bg-primary/20 text-primary border-primary/40" : "bg-card text-muted-foreground border-border/30"
                  }`}
                >{label}</button>
              ))}
            </div>
          </div>

          {/* Venue type */}
          <div>
            <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide">Tipo de local</span>
            <div className="flex gap-1.5 overflow-x-auto mt-1 scrollbar-hide">
              {VENUE_TYPES.map(({ key, label }) => (
                <button key={key} onClick={() => setVenueTypeFilter(venueTypeFilter === key ? "" : key)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium shrink-0 transition-all border ${
                    venueTypeFilter === key ? "bg-accent/20 text-accent border-accent/40" : "bg-card text-muted-foreground border-border/30"
                  }`}
                >{label}</button>
              ))}
            </div>
          </div>

          {/* Date + special */}
          <div className="flex gap-1.5 flex-wrap">
            {DATE_FILTERS.map(({ key, label }) => (
              <button key={key} onClick={() => setDateFilter(dateFilter === key ? "" : key)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all border ${
                  dateFilter === key ? "bg-accent/20 text-accent border-accent/40" : "bg-card text-muted-foreground border-border/30"
                }`}
              >{label}</button>
            ))}
            <button onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all border ${
                showVerifiedOnly ? "bg-accent/20 text-accent border-accent/40" : "bg-card text-muted-foreground border-border/30"
              }`}
            ><BadgeCheck className="w-3 h-3" /> Verificados</button>
            <button onClick={() => setShowMostAccessed(!showMostAccessed)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all border ${
                showMostAccessed ? "bg-primary/20 text-primary border-primary/40" : "bg-card text-muted-foreground border-border/30"
              }`}
            ><TrendingUp className="w-3 h-3" /> Mais acessados</button>
          </div>
        </div>
      )}

      {/* ── Active filter results ── */}
      {hasActiveFilter ? (
        <section className="px-4 pt-3 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {filtered.length + (search ? partnerMatches.length : 0)} resultado{filtered.length + (search ? partnerMatches.length : 0) !== 1 ? "s" : ""}
            </p>
            <button onClick={clearFilters} className="text-[10px] text-primary font-medium">Limpar filtros</button>
          </div>

          {/* Eventos encontrados */}
          {filtered.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Flame className="w-3 h-3 text-primary" /> Eventos encontrados
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                {filtered.slice(0, 20).map(e => (
                  <DiscoverEventCard key={e.id} ev={e} isTrending={trendingSet.has(e.id)} saved={isSaved(e.id)} onToggleSave={() => toggleSave(e.id)} />
                ))}
              </div>
            </div>
          )}

          {/* Locais e Parceiros */}
          {search && partnerMatches.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-accent" /> Locais e parceiros
              </h3>
              <div className="space-y-2">
                {partnerMatches.map((p: any) => (
                  <Link key={p.id} to={`/v3/local/${p.slug}`}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border/40 hover:border-primary/40 transition-all active:scale-[0.98]">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary shrink-0">
                      {p.logo_url ? (
                        <img src={p.logo_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/10">
                          <span className="font-display font-bold text-base text-primary/60">{p.name[0]}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="font-display font-bold text-sm text-foreground truncate">{p.name}</p>
                        {p.verified_partner && <BadgeCheck className="w-3.5 h-3.5 text-accent shrink-0" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground capitalize truncate">
                        {p.type}{p.city ? ` · ${p.city}` : ""}
                      </p>
                      <p className="text-[10px] text-primary font-semibold mt-0.5">Local encontrado · ver agenda</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Sugestões por categoria (quando nada bateu nos eventos) */}
          {filtered.length === 0 && suggestedByCategory.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-primary" /> Sugestões para você
              </h3>
              <p className="text-[11px] text-muted-foreground/70 mb-2">
                Eventos da categoria mais próxima do que você buscou:
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {suggestedByCategory.map(e => (
                  <DiscoverEventCard key={e.id} ev={e} isTrending={trendingSet.has(e.id)} saved={isSaved(e.id)} onToggleSave={() => toggleSave(e.id)} />
                ))}
              </div>
            </div>
          )}

          {/* UX "Nada encontrado" → trending fallback */}
          {filtered.length === 0 && partnerMatches.length === 0 && suggestedByCategory.length === 0 && (
            <div>
              <div className="py-6 text-center">
                <Search className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-foreground font-semibold">
                  {search
                    ? `Não encontramos resultados para "${search}" hoje`
                    : "Nenhum evento com esses filtros"}
                </p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  Mas confira o que está bombando em Prudente:
                </p>
              </div>
              {trending.length > 0 && (
                <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory -mx-4 px-4">
                  {trending.map(e => (
                    <Link key={e.id} to={`/v3/evento/${e.slug}`}
                      className="shrink-0 snap-start w-[180px] rounded-xl overflow-hidden bg-card border border-border/40">
                      <div className="relative h-[100px] overflow-hidden">
                        <img src={e.image_url || "/placeholder.svg"} alt={e.title}
                          className="w-full h-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <span className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/90 text-[8px] font-bold text-primary-foreground">
                          <TrendingUp className="w-2.5 h-2.5" /> EM ALTA
                        </span>
                      </div>
                      <div className="p-2">
                        <h3 className="font-display font-semibold text-[11px] text-foreground line-clamp-2 leading-snug">{e.title}</h3>
                        {e.venue_name && (
                          <p className="text-[9px] text-muted-foreground truncate mt-0.5">{e.venue_name}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
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
                  <div key={p.id} className="shrink-0 snap-start w-[160px] rounded-xl bg-card border border-border/40 hover:border-accent/30 transition-all overflow-hidden">
                    <Link to={`/v3/local/${p.slug}`}>
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
                      <div className="p-2.5 pb-1">
                        <p className="font-display font-bold text-[12px] text-foreground truncate">{p.name}</p>
                        <p className="text-[9px] text-muted-foreground capitalize">{p.type}</p>
                      </div>
                    </Link>
                    <div className="px-2.5 pb-2.5 flex items-center justify-between">
                      <Link to={`/v3/local/${p.slug}`} className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary">
                        Ver agenda <ChevronRight className="w-3 h-3" />
                      </Link>
                      {user && (
                        <button onClick={() => toggleFollow(p.id)} className="p-1">
                          <Heart className={`w-3.5 h-3.5 transition-colors ${isFollowed(p.id) ? "text-primary fill-primary" : "text-muted-foreground/40 hover:text-primary"}`} />
                        </button>
                      )}
                    </div>
                  </div>
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
                  <button key={c.key} onClick={() => setCatFilter(c.key)}
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
function DiscoverEventCard({ ev, isTrending, saved, onToggleSave }: {
  ev: Ev; isTrending?: boolean; saved?: boolean; onToggleSave?: () => void;
}) {
  return (
    <div className="relative rounded-xl overflow-hidden bg-card border border-border/40 group active:scale-[0.97] transition-transform">
      <Link to={`/v3/evento/${ev.slug}`}>
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
      {onToggleSave && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSave(); }}
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center z-10"
        >
          <Bookmark className={`w-3 h-3 ${saved ? "text-primary fill-primary" : "text-white"}`} />
        </button>
      )}
    </div>
  );
}
