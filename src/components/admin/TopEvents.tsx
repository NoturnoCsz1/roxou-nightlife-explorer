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
      const [eventsRes, views] = await Promise.all([
        supabase.from("events").select("title, slug, date_time").eq("status", "published"),
        fetchAllRows<{ page_path: string }>(
          () => supabase.from("page_views").select("page_path").gte("created_at", since)
        ),
      ]);

      const events = eventsRes.data || [];
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

  const maxViews = ranked[0]?.views || 1;

  return (
    <div className="rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm p-5 overflow-hidden min-w-0">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10">
          <Flame className="h-3.5 w-3.5 text-primary" />
        </div>
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Eventos Mais Vistos</h3>
      </div>
      <div className="space-y-1.5">
        {ranked.map((e, i) => (
          <div key={e.slug} className="flex items-center gap-2.5 py-1.5 min-w-0 group">
            <span className="text-[11px] font-bold text-primary/60 w-4 shrink-0 text-right">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <p className="text-xs font-medium truncate group-hover:text-primary transition">{e.title}</p>
                <span className="text-[11px] font-bold text-foreground shrink-0 tabular-nums">{e.views}</span>
              </div>
              <div className="h-1 rounded-full bg-muted/40 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary/20 transition-all duration-500"
                  style={{ width: `${(e.views / maxViews) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {new Date(e.date_time).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopEvents;
