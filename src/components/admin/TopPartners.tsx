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

  return (
    <div className="rounded-xl border border-border/40 bg-card p-4 overflow-hidden min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Parceiros Mais Populares</h3>
      </div>
      <div className="space-y-1">
        {ranked.map((p, i) => (
          <div key={p.slug} className="flex items-center gap-2.5 py-2 border-b border-border/20 last:border-0 min-w-0">
            <span className="text-xs font-bold text-primary w-4 shrink-0 text-center">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{p.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Pág {p.views} · Evt {p.eventViews} · {p.eventCount} evento{p.eventCount !== 1 ? "s" : ""}
              </p>
            </div>
            <span className="text-xs font-bold text-foreground shrink-0 tabular-nums">{p.total}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopPartners;
