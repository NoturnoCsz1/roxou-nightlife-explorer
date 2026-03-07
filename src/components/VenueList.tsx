import { useEffect, useState } from "react";
import { MapPin, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface VenueData {
  name: string;
  type: string;
  address: string;
  eventsCount: number;
}

const VenueCard = ({ venue }: { venue: VenueData }) => (
  <div className="group flex items-center gap-3 rounded-2xl bg-card p-4 transition-all hover:neon-border card-shadow cursor-pointer">
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl gradient-primary">
      <MapPin className="h-5 w-5 text-primary-foreground" />
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="text-sm font-bold text-foreground font-display truncate">{venue.name}</h3>
      <p className="text-[11px] text-muted-foreground">{venue.type} · {venue.address}</p>
    </div>
    <div className="text-right shrink-0 flex items-center gap-1">
      <span className="text-[11px] font-bold text-primary">{venue.eventsCount}</span>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
    </div>
  </div>
);

const VenueList = () => {
  const [venues, setVenues] = useState<VenueData[]>([]);

  useEffect(() => {
    async function load() {
      const { data: partners } = await supabase
        .from("partners")
        .select("id, name, type, neighborhood")
        .eq("active", true)
        .order("name")
        .limit(5);

      if (!partners || partners.length === 0) return;

      // Count events per partner
      const { data: events } = await supabase
        .from("events")
        .select("partner_id")
        .eq("status", "published")
        .not("partner_id", "is", null);

      const countMap: Record<string, number> = {};
      (events || []).forEach((e) => {
        if (e.partner_id) countMap[e.partner_id] = (countMap[e.partner_id] || 0) + 1;
      });

      setVenues(
        partners.map((p) => ({
          name: p.name,
          type: p.type,
          address: p.neighborhood || "",
          eventsCount: countMap[p.id] || 0,
        }))
      );
    }
    load();
  }, []);

  if (venues.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {venues.map((v) => (
        <VenueCard key={v.name} venue={v} />
      ))}
    </div>
  );
};

export default VenueList;
