import { ExternalLink, X } from "lucide-react";
import RoxouVenueMap from "@/components/maps/RoxouVenueMap";
import type { Establishment } from "./types";

interface Props {
  e: Establishment;
  onClose: () => void;
}

export function EstabelecimentosMapModal({ e, onClose }: Props) {
  if (e.latitude == null || e.longitude == null) return null;
  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border/40 rounded-2xl p-4 w-full max-w-lg space-y-3"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm">{e.name}</h3>
            <p className="text-[11px] text-muted-foreground">{e.address || "—"}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <RoxouVenueMap
          lat={Number(e.latitude)}
          lng={Number(e.longitude)}
          name={e.name}
          address={e.address}
          height={320}
        />
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${e.latitude},${e.longitude}`}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" /> Abrir no Google Maps
        </a>
      </div>
    </div>
  );
}
