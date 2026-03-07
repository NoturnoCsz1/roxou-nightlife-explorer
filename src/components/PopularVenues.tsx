import { useEffect, useState } from "react";
import { MapPin, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface PopularVenue {
  id: string;
  name: string;
  slug: string;
  type: string;
  score: number;
}

const PopularVenues = () => {
  const [venues, setVenues] = useState<PopularVenue[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      // Get all active partners
      const { data: partners } = await supabase
        .from("partners")
        .select("id, name, slug, type")
        .eq("active", true);

      if (!partners || partners.length === 0) return;

      // Get page views for partner pages and event pages
      const { data: views } = await supabase
        .from("page_views")
        .select("page_path");

      // Get events with partner_id to map event slugs to partners
      const { data: events } = await supabase
        .from("events")
        .select("slug, partner_id")
        .eq("status", "published")
        .not("partner_id", "is", null);

      const partnerSlugMap = new Map(partners.map((p) => [p.slug, p.id]));
      const eventToPartner = new Map(
        (events || []).filter((e) => e.partner_id).map((e) => [e.slug, e.partner_id!])
      );

      // Count views per partner
      const scoreMap: Record<string, number> = {};
      partners.forEach((p) => (scoreMap[p.id] = 0));

      (views || []).forEach((v) => {
        const path = v.page_path;
        // Match /local/<slug>
        const localMatch = path.match(/^\/local\/(.+)$/);
        if (localMatch) {
          const pid = partnerSlugMap.get(localMatch[1]);
          if (pid) scoreMap[pid] = (scoreMap[pid] || 0) + 1;
        }
        // Match /evento/<slug>
        const eventMatch = path.match(/^\/evento\/(.+)$/);
        if (eventMatch) {
          const pid = eventToPartner.get(eventMatch[1]);
          if (pid && scoreMap[pid] !== undefined) scoreMap[pid] = (scoreMap[pid] || 0) + 1;
        }
      });

      const hasAnalytics = Object.values(scoreMap).some((v) => v > 0);

      if (!hasAnalytics) {
        // Fallback: rank by number of published events
        const eventCountMap: Record<string, number> = {};
        (events || []).forEach((e) => {
          if (e.partner_id) eventCountMap[e.partner_id] = (eventCountMap[e.partner_id] || 0) + 1;
        });
        const ranked = partners
          .map((p) => ({ ...p, score: eventCountMap[p.id] || 0 }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
        setVenues(ranked);
        return;
      }

      const ranked = partners
        .map((p) => ({ ...p, score: scoreMap[p.id] || 0 }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      setVenues(ranked);
    }
    load();
  }, []);

  if (venues.length === 0) return null;

  const maxScore = venues[0]?.score || 1;

  return (
    <div className="space-y-2.5">
      {venues.map((v, i) => (
        <button
          key={v.id}
          onClick={() => navigate(`/local/${v.slug}`)}
          className="group flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-left transition-all hover:neon-border card-shadow cursor-pointer"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary font-black text-sm font-display">
            {i + 1}º
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground font-display truncate">{v.name}</h3>
            <p className="text-[11px] text-muted-foreground capitalize">{v.type}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full gradient-primary transition-all"
                style={{ width: `${Math.max((v.score / maxScore) * 100, 10)}%` }}
              />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default PopularVenues;
