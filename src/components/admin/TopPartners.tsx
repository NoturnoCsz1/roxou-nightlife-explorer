import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
      const [partnersRes, viewsRes, eventsRes] = await Promise.all([
        supabase.from("partners").select("id, name, slug").eq("active", true),
        supabase.from("page_views").select("page_path").gte("created_at", since),
        supabase.from("events").select("slug, partner_id").eq("status", "published").not("partner_id", "is", null),
      ]);

      const partners = partnersRes.data || [];
      const views = viewsRes.data || [];
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
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-xs" style={{ minWidth: "360px" }}>
          <thead>
            <tr className="text-muted-foreground border-b border-border/30">
              <th className="text-left py-2 font-medium">#</th>
              <th className="text-left py-2 font-medium">Parceiro</th>
              <th className="text-right py-2 font-medium">Pág</th>
              <th className="text-right py-2 font-medium">Evt</th>
              <th className="text-right py-2 font-medium">Nº</th>
              <th className="text-right py-2 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((p, i) => (
              <tr key={p.slug} className="border-b border-border/20 last:border-0">
                <td className="py-2 font-bold text-primary">{i + 1}</td>
                <td className="py-2 font-medium truncate max-w-[100px]">{p.name}</td>
                <td className="py-2 text-right text-muted-foreground">{p.views}</td>
                <td className="py-2 text-right text-muted-foreground">{p.eventViews}</td>
                <td className="py-2 text-right text-muted-foreground">{p.eventCount}</td>
                <td className="py-2 text-right font-bold">{p.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopPartners;
