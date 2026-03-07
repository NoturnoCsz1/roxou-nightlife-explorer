import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RankedPartner {
  name: string;
  slug: string;
  views: number;
  eventViews: number;
  total: number;
}

const TopPartners = () => {
  const [ranked, setRanked] = useState<RankedPartner[]>([]);

  useEffect(() => {
    async function load() {
      const [partnersRes, viewsRes, eventsRes] = await Promise.all([
        supabase.from("partners").select("id, name, slug").eq("active", true),
        supabase.from("page_views").select("page_path"),
        supabase.from("events").select("slug, partner_id").eq("status", "published").not("partner_id", "is", null),
      ]);

      const partners = partnersRes.data || [];
      const views = viewsRes.data || [];
      const events = eventsRes.data || [];

      const partnerSlugMap = new Map(partners.map((p) => [p.slug, p.id]));
      const eventToPartner = new Map(events.filter((e) => e.partner_id).map((e) => [e.slug, e.partner_id!]));

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
          total: (directMap[p.id] || 0) + (eventMap[p.id] || 0),
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      setRanked(result);
    }
    load();
  }, []);

  if (ranked.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/40 bg-card p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <TrendingUp className="h-3.5 w-3.5 text-primary" />
        <h3 className="text-xs font-semibold text-foreground">Parceiros Mais Populares</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b border-border/30">
              <th className="text-left py-1.5 font-medium">#</th>
              <th className="text-left py-1.5 font-medium">Parceiro</th>
              <th className="text-right py-1.5 font-medium">Página</th>
              <th className="text-right py-1.5 font-medium">Eventos</th>
              <th className="text-right py-1.5 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((p, i) => (
              <tr key={p.slug} className="border-b border-border/20 last:border-0">
                <td className="py-1.5 font-bold text-primary">{i + 1}</td>
                <td className="py-1.5 font-medium truncate max-w-[120px]">{p.name}</td>
                <td className="py-1.5 text-right text-muted-foreground">{p.views}</td>
                <td className="py-1.5 text-right text-muted-foreground">{p.eventViews}</td>
                <td className="py-1.5 text-right font-bold">{p.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TopPartners;
