import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, format, addDays, isToday as isTodayFn, addHours, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, MapPin, Heart, Camera, Car, Video, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useSavedEvents } from "@/hooks/useSavedEvents";
import V3SearchBar from "@/components/v3/V3SearchBar";

const fmtTime = (d: string) => format(new Date(d), "HH'h'mm", { locale: ptBR });

const categoryIcon = (category?: string | null) => {
  const value = (category || "").toLowerCase();
  if (value.includes("show") || value.includes("música") || value.includes("musica") || value.includes("sertanejo") || value.includes("rock")) return "🎸";
  if (value.includes("bar") || value.includes("gastro") || value.includes("happy")) return "🍹";
  if (value.includes("festival") || value.includes("festa")) return "✨";
  if (value.includes("balada")) return "🪩";
  return "📍";
};

const mapsUrl = (address?: string | null, venue?: string | null) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || venue || "Presidente Prudente")}`;

const uberUrl = (address?: string | null, venue?: string | null) => {
  const q = encodeURIComponent(address || venue || "Presidente Prudente");
  return `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${q}`;
};

const noveNoveUrl = (address?: string | null, venue?: string | null) => {
  const q = encodeURIComponent(address || venue || "Presidente Prudente");
  return `https://99app.com/?dropoff=${q}`;
};

const isEventNow = (dateTime: string) => {
  const start = new Date(dateTime);
  const now = new Date();
  return isWithinInterval(now, { start, end: addHours(start, 4) });
};

export default function V3Agenda() {
  const today = startOfDay(new Date());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showShareCard, setShowShareCard] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const { isSaved, toggleSave } = useSavedEvents();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["v3-agenda"],
    queryFn: async () => {
      const { data } = await supabase.from("events")
        .select("id,slug,title,image_url,date_time,venue_name,address,category,video_url")
        .eq("status", "published")
        .gte("date_time", today.toISOString())
        .order("date_time").limit(100);
      return data || [];
    },
  });

  /* Categorias dinâmicas (a partir dos próprios eventos) */
  const categories = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    return ["todos", ...Array.from(set).slice(0, 12)];
  }, [events]);

  const filteredEvents = useMemo(() => {
    let list = events;
    if (activeCategory !== "todos") {
      list = list.filter((e) => (e.category || "").toLowerCase() === activeCategory.toLowerCase());
    }
    const term = searchTerm.trim().toLowerCase();
    if (term.length >= 2) {
      const tokens = term
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .split(/\s+/);
      list = list.filter((e) => {
        const hay = [e.title, e.venue_name, e.category, (e as any).address]
          .join(" ")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        return tokens.every((t) => hay.includes(t));
      });
    }
    return list;
  }, [events, activeCategory, searchTerm]);

  /* Group by date */
  const grouped = useMemo(() => {
    const map = new Map<string, typeof events>();
    filteredEvents.forEach((e) => {
      const key = format(new Date(e.date_time), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return Array.from(map.entries()).map(([key, evts]) => ({
      key,
      label: isTodayFn(new Date(key)) ? "Hoje" :
        new Date(key).getTime() === addDays(today, 1).getTime() ? "Amanhã" :
        format(new Date(key), "EEEE, d 'de' MMMM", { locale: ptBR }),
      events: evts,
    }));
  }, [filteredEvents, today]);

  const shareGroup = grouped.find((g) => isTodayFn(new Date(g.key))) || grouped[0];

  if (isLoading) {
    return (
      <div className="px-4 pt-6 space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-card border border-border/30 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="pb-32 px-4 pt-4">
      {/* ===== HEADER GRADIENTE NEON ===== */}
      <div className="relative mb-5 overflow-hidden rounded-3xl border border-primary/25 p-5 shadow-[0_0_42px_hsl(var(--v3-neon)/0.18)]">
        <div
          className="absolute inset-0 opacity-90 -z-10"
          style={{
            background:
              "radial-gradient(circle at 20% 0%, hsl(var(--v3-neon)/0.45), transparent 55%), radial-gradient(circle at 90% 100%, hsl(var(--v3-neon-soft)/0.35), transparent 55%), linear-gradient(135deg, hsl(var(--background)), hsl(var(--card)))",
          }}
        />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.28em] text-primary font-bold mb-2">
              <Sparkles className="w-3 h-3" />
              Curadoria Roxou
            </p>
            <h1
              className="font-display font-black text-3xl leading-tight"
              style={{
                background: "linear-gradient(135deg, hsl(var(--v3-neon)), hsl(var(--v3-neon-soft)), #fff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Agenda Completa
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Linha do tempo dos próximos rolês</p>
          </div>
          <button
            type="button"
            onClick={() => setShowShareCard((value) => !value)}
            className="shrink-0 inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold text-primary-foreground v3-neon-hover active:scale-95 transition-transform shadow-[0_0_24px_hsl(var(--v3-neon)/0.4)]"
            style={{ background: "linear-gradient(135deg, hsl(var(--v3-neon)), hsl(var(--v3-neon-soft)))" }}
          >
            <Camera className="w-4 h-4" />
            Stories
          </button>
        </div>

        {/* CHIPS DE CATEGORIA */}
        {categories.length > 1 && (
          <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
            {categories.map((cat) => {
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all ${
                    active
                      ? "text-primary-foreground shadow-[0_0_18px_hsl(var(--v3-neon)/0.5)]"
                      : "border border-border/40 bg-card/50 text-muted-foreground hover:text-foreground hover:border-primary/40"
                  }`}
                  style={
                    active
                      ? { background: "linear-gradient(135deg, hsl(var(--v3-neon)), hsl(var(--v3-neon-soft)))" }
                      : undefined
                  }
                >
                  {cat === "todos" ? "✨ Tudo" : `${categoryIcon(cat)} ${cat}`}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== STORY CARD ===== */}
      {showShareCard && shareGroup && (
        <div className="mb-5 overflow-hidden rounded-3xl border border-primary/25 shadow-[0_0_36px_hsl(var(--v3-neon)/0.18)] animate-scale-in">
          <div className="relative min-h-[560px] p-5 flex flex-col justify-between bg-[radial-gradient(circle_at_top_left,hsl(var(--v3-neon)/0.34),transparent_34%),linear-gradient(160deg,hsl(var(--background)),hsl(var(--card)),hsl(var(--background)))]">
            <div>
              <div className="flex items-center justify-between gap-3 mb-7">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-primary font-bold">ROXOU AGENDA</p>
                  <h2 className="font-display text-3xl font-black text-foreground capitalize">{shareGroup.label}</h2>
                </div>
                <div className="rounded-2xl border border-primary/25 bg-card/45 px-3 py-2 text-xs font-bold text-primary">Story</div>
              </div>
              <div className="space-y-3">
                {shareGroup.events.slice(0, 7).map((event) => (
                  <div key={event.id} className="rounded-2xl border border-border/35 bg-card/45 p-3 backdrop-blur-xl">
                    <div className="flex items-start gap-3">
                      <span className="rounded-xl bg-primary/15 px-2 py-1 text-xs font-black text-primary">{fmtTime(event.date_time)}</span>
                      <div className="min-w-0">
                        <p className="font-display text-sm font-bold text-foreground line-clamp-1">{event.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{event.venue_name || "Local a confirmar"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-6 text-center text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">roxou.com.br</p>
          </div>
        </div>
      )}

      {grouped.length === 0 && (
        <div className="py-16 text-center">
          <CalendarDays className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum evento programado</p>
        </div>
      )}

      {/* ===== TIMELINE ===== */}
      {grouped.map((g) => (
        <div key={g.key} className="mb-6">
          <h2 className="font-display font-semibold text-sm text-primary uppercase tracking-wide mb-3 capitalize flex items-center gap-2">
            <span className="h-1 w-6 rounded-full bg-gradient-to-r from-primary to-transparent" />
            {g.label}
          </h2>
          <div className="relative ml-2 space-y-4 before:absolute before:left-[2.45rem] before:top-3 before:bottom-3 before:w-px before:bg-gradient-to-b before:from-primary/60 before:via-primary/20 before:to-transparent">
            {g.events.map((e: any) => {
              const expanded = expandedId === e.id;
              const hasPOV = !!e.video_url;
              return (
                <div key={e.id} className="relative grid grid-cols-[5rem_1fr] gap-3">
                  {/* TIMELINE NODE + BADGE NEON */}
                  <div className="relative z-10 flex flex-col items-center pt-3">
                    <span
                      className="rounded-full px-2.5 py-1.5 text-[10px] font-black text-primary-foreground shadow-[0_0_22px_hsl(var(--v3-neon)/0.55)] ring-2 ring-background"
                      style={{ background: "linear-gradient(135deg, hsl(var(--v3-neon)), hsl(var(--v3-neon-soft)))" }}
                    >
                      {fmtTime(e.date_time)}
                    </span>
                    {isEventNow(e.date_time) && (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        AO VIVO
                      </span>
                    )}
                  </div>

                  {/* GLASS CARD COM HOVER NEON */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : e.id)}
                    className="group text-left rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xl transition-all duration-300 hover:border-primary/50 hover:bg-white/[0.07] hover:shadow-[0_0_28px_hsl(var(--v3-neon)/0.35)] active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 bg-muted/30 ring-1 ring-white/10">
                        <img
                          src={e.image_url || "/placeholder.svg"}
                          alt={e.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          loading="lazy"
                        />
                        {hasPOV && (
                          <span className="absolute bottom-1 right-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground shadow-[0_0_10px_hsl(var(--v3-neon)/0.7)]">
                            <Video className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-semibold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                          <span className="mr-1.5" aria-hidden="true">{categoryIcon(e.category)}</span>
                          {e.title}
                        </h3>
                        {e.venue_name && (
                          <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                            <MapPin className="w-3 h-3 text-primary" />
                            <span className="text-[10px] truncate">{e.venue_name}</span>
                          </div>
                        )}
                        {hasPOV && (
                          <span className="inline-flex items-center gap-1 mt-1.5 rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary uppercase tracking-wider">
                            <Video className="w-2.5 h-2.5" />
                            POV disponível
                          </span>
                        )}
                      </div>
                    </div>

                    {/* AÇÕES RÁPIDAS */}
                    <div
                      className={`grid transition-all duration-300 ${
                        expanded ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="grid grid-cols-2 gap-2">
                          <a
                            href={mapsUrl(e.address, e.venue_name)}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-[11px] font-bold text-primary hover:bg-primary/20 transition-colors"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            Ver no Mapa
                          </a>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleSave(e.id);
                            }}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border/45 bg-secondary/55 px-3 py-2 text-[11px] font-bold text-secondary-foreground cursor-pointer"
                          >
                            <Heart className={`w-3.5 h-3.5 ${isSaved(e.id) ? "fill-primary text-primary" : ""}`} />
                            {isSaved(e.id) ? "Salvo" : "Salvar"}
                          </span>
                          <a
                            href={uberUrl(e.address, e.venue_name)}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-black/60 px-3 py-2 text-[11px] font-bold text-white hover:bg-black/80 transition-colors"
                          >
                            <Car className="w-3.5 h-3.5" />
                            Uber
                          </a>
                          <a
                            href={noveNoveUrl(e.address, e.venue_name)}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-3 py-2 text-[11px] font-bold text-yellow-300 hover:bg-yellow-400/20 transition-colors"
                          >
                            <Car className="w-3.5 h-3.5" />
                            99
                          </a>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
