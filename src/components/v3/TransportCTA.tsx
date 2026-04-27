import { Car, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { isRideWindowClosed, RIDE_EXPIRED_MESSAGE } from "@/lib/rideTimeRules";

interface TransportCTAProps {
  eventName?: string;
  venueName?: string;
  eventDate?: string;
}

export default function TransportCTA({ eventName, venueName, eventDate }: TransportCTAProps) {
  const params = new URLSearchParams();
  if (eventName) params.set("event", eventName);
  if (venueName) params.set("venue", venueName);
  if (eventDate) params.set("date", eventDate);
  const closed = isRideWindowClosed(eventDate);

  return (
    <Link
      to={closed ? "#" : `/v3/transporte?${params.toString()}`}
      onClick={(e) => {
        if (closed) {
          e.preventDefault();
          toast.error(RIDE_EXPIRED_MESSAGE);
        }
      }}
      className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 group hover:border-primary/40 transition-all"
    >
      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
        <Car className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display font-semibold text-sm text-foreground">🚗 COMO VOCÊ VAI?</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{closed ? "Sistema de carona encerrado para este evento" : "Encontre uma carona para este evento"}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-0.5 transition-transform shrink-0" />
    </Link>
  );
}
