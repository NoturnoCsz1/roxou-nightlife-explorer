import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabaseFetchAll";

interface RankedPartner {
  name: string;
  slug: string;
  views: number;
  eventViews: number;
  eventCount: number;
  total: number;
}

export interface TopPartnerExport {
  name: string;
  pageViews: number;
  eventViews: number;
  eventCount: number;
  total: number;
}

interface TopPartnersProps {
  since: string;
  onDataLoaded?: (data: TopPartnerExport[]) => void;
}

const TopPartners = ({ since, onDataLoaded }: TopPartnersProps) => {
  const [ranked, setRanked] = useState<RankedPartner[]>([]);

  useEffect(() => {
    async function load() {
      const [partnersRes, views, eventsRes] = await Promise.all([
        supabase.from("partners").select("id, name, slug").eq("active", true),
        fetchAllRows<{ page_path: string }>(
          () => supabase.from("page_views").select("page_path").gte("created_at", since)
        ),
        supabase.from("events").select("slug, partner_id").eq("status", "published").not("partner_id", "is", null),
      ]);

      const partners = partnersRes.data || [];
      const events = eventsRes.data || [];

      const partnerSlugMap = new Map(partners.map((p) => [p.slug, p.id]));
      const eventToPartner = new Map(events.filter((e) => e.partner_id).map((e) => [e.slug, e.partner_id!]));

      const eventCountMap: Record<string, number> = {};
      partners.forEach((p) => { eventCountMap[p.id] = 0; });
      events.forEach((e) => {
        if (e.partner_id && eventCountMap[e.partner_id] !== undefined) {
          eventCountMap[e.partner_id]++;
        }
      });

      const directMap: Record<string, number> = {};
      const eventMap: Record<string, number> = {};
      partners.forEach((p) => { directMap[p.id] = 0; eventMap[p.id] = 0; });

      views.forEach((v) => {
        const localMatch = v.page_path.match(/^\/local\/(.+)$/);
        if (localMatch) {
          const pid = partnerSlugMap.get(localMatch[1]);
          if (pid) directMap[pid] = (directMap[pid] || 0) + 1;
        }
        const eventMatch = v.page_path.match(/^\/evento\/(.+)$/);
        if (eventMatch) {
          const pid = eventToPartner.get(eventMatch[1]);
          if (pid && directMap[pid] !== undefined) eventMap[pid] = (eventMap[pid] || 0) + 1;
        }
      });

      const result = partners
        .map((p) => ({
          name: p.name,
          slug: p.slug,
          views: directMap[p.id] || 0,
          eventViews: eventMap[p.id] || 0,
          eventCount: eventCountMap[p.id] || 0,
          total: (directMap[p.id] || 0) + (eventMap[p.id] || 0),
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      setRanked(result);
      onDataLoaded?.(result.map((r) => ({
        name: r.name,
        pageViews: r.views,
        eventViews: r.eventViews,
        eventCount: r.eventCount,
        total: r.total,
      })));
    }
    load();
  }, [since, onDataLoaded]);

  if (ranked.length === 0) return null;

  const maxTotal = ranked[0]?.total || 1;

  return (
    <div className="rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm p-5 overflow-hidden min-w-0">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-accent/10">
          <TrendingUp className="h-3.5 w-3.5 text-accent" />
        </div>
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Parceiros Mais Populares</h3>
      </div>
      <div className="space-y-1.5">
        {ranked.map((p, i) => (
          <div key={p.slug} className="flex items-center gap-2.5 py-1.5 min-w-0 group">
            <span className="text-[11px] font-bold text-accent/60 w-4 shrink-0 text-right">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <p className="text-xs font-medium truncate group-hover:text-accent transition">{p.name}</p>
                <span className="text-[11px] font-bold text-foreground shrink-0 tabular-nums">{p.total}</span>
              </div>
              <div className="h-1 rounded-full bg-muted/40 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent/70 to-accent/20 transition-all duration-500"
                  style={{ width: `${(p.total / maxTotal) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Pág {p.views} · Evt {p.eventViews} · {p.eventCount} evento{p.eventCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopPartners;
