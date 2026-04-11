import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, format, addDays, isToday as isTodayFn } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { CalendarDays, MapPin, Clock } from "lucide-react";
import { useMemo } from "react";

const fmtTime = (d: string) => format(new Date(d), "HH'h'mm", { locale: ptBR });

export default function V3Agenda() {
  const today = startOfDay(new Date());

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["v3-agenda"],
    queryFn: async () => {
      const { data } = await supabase.from("events")
        .select("id,slug,title,image_url,date_time,venue_name,category")
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

  if (isLoading) {
    return (
      <div className="px-4 pt-6 space-y-4">
        {[0,1,2].map(i => <div key={i} className="h-20 rounded-xl bg-card border border-border/30 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="pb-4 px-4 pt-4">
      <h1 className="font-display font-bold text-xl text-foreground mb-4">📅 Agenda</h1>

      {grouped.length === 0 && (
        <div className="py-16 text-center">
          <CalendarDays className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum evento programado</p>
        </div>
      )}

      {grouped.map(g => (
        <div key={g.key} className="mb-5">
          <h2 className="font-display font-semibold text-sm text-primary uppercase tracking-wide mb-2 capitalize">{g.label}</h2>
          <div className="space-y-2">
            {g.events.map(e => (
              <Link key={e.id} to={`/v3/evento/${e.slug}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40 hover:border-primary/20 transition-all group active:scale-[0.98]">
                <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0">
                  <img src={e.image_url || "/placeholder.svg"} alt={e.title} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-semibold text-xs text-foreground line-clamp-1">{e.title}</h3>
                  <div className="flex items-center gap-1 mt-0.5 text-muted-foreground">
                    <Clock className="w-3 h-3 text-primary" />
                    <span className="text-[10px]">{fmtTime(e.date_time)}</span>
                  </div>
                  {e.venue_name && (
                    <div className="flex items-center gap-1 mt-0.5 text-muted-foreground">
                      <MapPin className="w-3 h-3 text-primary" />
                      <span className="text-[10px] truncate">{e.venue_name}</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
