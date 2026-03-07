import { MapPin, ChevronRight } from "lucide-react";
import { venues } from "@/data/events";

const VenueCard = ({ venue }: { venue: typeof venues[0] }) => (
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

const VenueList = () => (
  <div className="space-y-2.5">
    {venues.map((v) => (
      <VenueCard key={v.name} venue={v} />
    ))}
  </div>
);

export default VenueList;
