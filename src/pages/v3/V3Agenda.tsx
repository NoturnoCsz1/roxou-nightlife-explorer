import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, format, addDays, isToday as isTodayFn, addHours, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, MapPin, Clock, Heart, Camera, Route } from "lucide-react";
import { useMemo, useState } from "react";
import { useSavedEvents } from "@/hooks/useSavedEvents";

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

const isEventNow = (dateTime: string) => {
  const start = new Date(dateTime);
  const now = new Date();
  return isWithinInterval(now, { start, end: addHours(start, 4) });
};

export default function V3Agenda() {
  const today = startOfDay(new Date());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showShareCard, setShowShareCard] = useState(false);
  const { isSaved, toggleSave } = useSavedEvents();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["v3-agenda"],
    queryFn: async () => {
      const { data } = await supabase.from("events")
        .select("id,slug,title,image_url,date_time,venue_name,address,category")
        .eq("status", "published")
        .gte("date_time", today.toISOString())
        .order("date_time").limit(100);
      return data || [];
    },
  });

  /* Group by date */
  const grouped = useMemo(() => {
    const map = new Map<string, typeof events>();
    events.forEach(e => {
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
  }, [events, today]);

  const shareGroup = grouped.find((g) => isTodayFn(new Date(g.key))) || grouped[0];

  if (isLoading) {
    return (
      <div className="px-4 pt-6 space-y-4">
        {[0,1,2].map(i => <div key={i} className="h-20 rounded-xl bg-card border border-border/30 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="pb-4 px-4 pt-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-xl text-foreground">📅 Agenda</h1>
          <p className="text-xs text-muted-foreground">Linha do tempo dos próximos rolês</p>
        </div>
        <button
          type="button"
          onClick={() => setShowShareCard((value) => !value)}
          className="shrink-0 inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-bold text-primary-foreground v3-neon-hover active:scale-95 transition-transform"
          style={{ background: "linear-gradient(135deg, hsl(var(--v3-neon)), hsl(var(--v3-neon-soft)))" }}
        >
          <Camera className="w-4 h-4" />
          Partilhar Stories
        </button>
      </div>

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

      {grouped.map(g => (
        <div key={g.key} className="mb-5">
          <h2 className="font-display font-semibold text-sm text-primary uppercase tracking-wide mb-3 capitalize">{g.label}</h2>
          <div className="relative ml-2 space-y-3 before:absolute before:left-[2.15rem] before:top-2 before:bottom-2 before:w-px before:bg-border/45">
            {g.events.map(e => (
              <div key={e.id} className="relative grid grid-cols-[4.4rem_1fr] gap-3">
                <div className="relative z-10 flex flex-col items-center pt-3">
                  <span className="rounded-2xl px-2 py-1 text-[10px] font-black text-primary-foreground shadow-[0_0_18px_hsl(var(--v3-neon)/0.35)]"
                    style={{ background: "linear-gradient(135deg, hsl(var(--v3-neon)), hsl(var(--v3-neon-soft)))" }}>
                    {fmtTime(e.date_time)}
                  </span>
                  {isEventNow(e.date_time) && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      A ROLAR
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                  className="group text-left rounded-2xl border border-border/40 bg-card/45 p-3 backdrop-blur-xl transition-all hover:border-primary/35 active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 bg-muted/30">
                      <img src={e.image_url || "/placeholder.svg"} alt={e.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold text-sm text-foreground line-clamp-2">
                        <span className="mr-1.5" aria-hidden="true">{categoryIcon(e.category)}</span>{e.title}
                      </h3>
                      {e.venue_name && (
                        <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                          <MapPin className="w-3 h-3 text-primary" />
                          <span className="text-[10px] truncate">{e.venue_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`grid transition-all duration-300 ${expandedId === e.id ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0"}`}>
                    <div className="overflow-hidden flex gap-2">
                      <a
                        href={mapsUrl(e.address, e.venue_name)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border/45 bg-secondary/55 px-3 py-2 text-[11px] font-bold text-secondary-foreground"
                      >
                        <Route className="w-3.5 h-3.5" />
                        Como Chegar
                      </a>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleSave(e.id);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-[11px] font-bold text-primary"
                      >
                        <Heart className={`w-3.5 h-3.5 ${isSaved(e.id) ? "fill-primary" : ""}`} />
                        {isSaved(e.id) ? "Favorito" : "Favoritar"}
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
