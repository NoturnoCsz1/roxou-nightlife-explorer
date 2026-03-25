import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabaseFetchAll";

interface RankedEvent {
  title: string;
  slug: string;
  views: number;
  date_time: string;
}

export interface TopEventExport {
  title: string;
  views: number;
  date: string;
}

interface TopEventsProps {
  since: string;
  onDataLoaded?: (data: TopEventExport[]) => void;
}

const TopEvents = ({ since, onDataLoaded }: TopEventsProps) => {
  const [ranked, setRanked] = useState<RankedEvent[]>([]);

  useEffect(() => {
    async function load() {
      const [eventsRes, viewsRes] = await Promise.all([
        supabase.from("events").select("title, slug, date_time").eq("status", "published"),
        supabase.from("page_views").select("page_path").gte("created_at", since),
      ]);

      const events = eventsRes.data || [];
      const views = viewsRes.data || [];

      const slugToEvent = new Map(events.map((e) => [e.slug, e]));
      const viewMap: Record<string, number> = {};

      views.forEach((v) => {
        const match = v.page_path.match(/^\/evento\/(.+)$/);
        if (match && slugToEvent.has(match[1])) {
          viewMap[match[1]] = (viewMap[match[1]] || 0) + 1;
        }
      });

      const result = Object.entries(viewMap)
        .map(([slug, count]) => {
          const evt = slugToEvent.get(slug)!;
          return { title: evt.title, slug, views: count, date_time: evt.date_time };
        })
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      setRanked(result);
      onDataLoaded?.(result.map((r) => ({
        title: r.title,
        views: r.views,
        date: new Date(r.date_time).toLocaleDateString("pt-BR"),
      })));
    }
    load();
  }, [since, onDataLoaded]);

  if (ranked.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/40 bg-card p-4 overflow-hidden min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Eventos Mais Vistos</h3>
      </div>
      <div className="space-y-1">
        {ranked.map((e, i) => (
          <div key={e.slug} className="flex items-center gap-2.5 py-2 border-b border-border/20 last:border-0 min-w-0">
            <span className="text-xs font-bold text-primary w-4 shrink-0 text-center">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{e.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {new Date(e.date_time).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </p>
            </div>
            <span className="text-xs font-bold text-foreground shrink-0 tabular-nums">{e.views}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopEvents;
