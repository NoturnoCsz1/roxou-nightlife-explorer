import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RankedEvent {
  title: string;
  slug: string;
  views: number;
  date_time: string;
}

interface TopEventsProps {
  since: string;
}

const TopEvents = ({ since }: TopEventsProps) => {
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
    }
    load();
  }, [since]);

  if (ranked.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/40 bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Eventos Mais Vistos</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b border-border/30">
              <th className="text-left py-2 font-medium">#</th>
              <th className="text-left py-2 font-medium">Evento</th>
              <th className="text-right py-2 font-medium">Data</th>
              <th className="text-right py-2 font-medium">Views</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((e, i) => (
              <tr key={e.slug} className="border-b border-border/20 last:border-0">
                <td className="py-2 font-bold text-primary">{i + 1}</td>
                <td className="py-2 font-medium truncate max-w-[180px]">{e.title}</td>
                <td className="py-2 text-right text-muted-foreground whitespace-nowrap">
                  {new Date(e.date_time).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </td>
                <td className="py-2 text-right font-bold">{e.views}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopEvents;
