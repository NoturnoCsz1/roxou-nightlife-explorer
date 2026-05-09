import { ExternalLink, Car, Sparkles, ArrowRight, Flame, BadgeCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { isRideWindowClosed, RIDE_EXPIRED_MESSAGE } from "@/lib/rideTimeRules";
import { optimizedImageUrl, optimizedSrcSet } from "@/lib/imageOptimizer";

interface ReservationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventTitle: string;
  eventSlug: string;
  ticketUrl?: string | null;
  venueName?: string | null;
  eventDate?: string | null;
  imageUrl?: string | null;
  onTicketClick?: () => void;
}

/**
 * Deterministic mock for urgency badge — same slug always produces same label,
 * so the user doesn't see it flicker. Replace with real availability later.
 */
function urgencyFor(slug: string): "ultimas" | "garantida" | "lotando" {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  const m = h % 10;
  if (m < 3) return "ultimas";
  if (m < 6) return "lotando";
  return "garantida";
}

function UrgencyBadge({ slug }: { slug: string }) {
  const kind = urgencyFor(slug);
  if (kind === "ultimas") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-destructive/15 border border-destructive/30 text-[10px] font-bold uppercase tracking-wider text-destructive v3-pulse-glow">
        <Flame className="w-3 h-3" /> Últimas vagas
      </span>
    );
  }
  if (kind === "lotando") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider text-amber-400">
        <Sparkles className="w-3 h-3" /> Lotando rápido
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
      <BadgeCheck className="w-3 h-3" /> Vaga garantida
    </span>
  );
}

function Body({
  eventTitle,
  eventSlug,
  ticketUrl,
  venueName,
  eventDate,
  imageUrl,
  onTicketClick,
  onClose,
}: ReservationDrawerProps & { onClose: () => void }) {
  const navigate = useNavigate();
  const rideClosed = isRideWindowClosed(eventDate);

  const goTransport = () => {
    if (rideClosed) {
      toast.error(RIDE_EXPIRED_MESSAGE);
      return;
    }
    const params = new URLSearchParams();
    params.set("event", eventTitle);
    if (venueName) params.set("venue", venueName);
    if (eventDate) params.set("date", eventDate);
    onClose();
    navigate(`/transporte?${params.toString()}`);
  };

  return (
    <div className="px-5 pb-6 pt-2 space-y-5 v3-theme">
      {/* Event preview header */}
      <div className="flex items-center gap-3">
        {imageUrl && (
          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 v3-glass">
            <img
              src={optimizedImageUrl(imageUrl, 192, 75) || imageUrl}
              srcSet={optimizedSrcSet(imageUrl, [96, 192, 288], 75)}
              sizes="56px"
              alt={eventTitle}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">Reservar</p>
          <h3 className="font-display font-bold text-base text-foreground line-clamp-2 leading-tight">
            {eventTitle}
          </h3>
        </div>
      </div>

      <UrgencyBadge slug={eventSlug} />

      {/* Option B — Transport (primary, neon pulse) */}
      <button
        onClick={goTransport}
        className="w-full relative overflow-hidden rounded-2xl p-4 text-left v3-pulse-glow group"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--v3-neon) / 0.85), hsl(var(--v3-neon-soft) / 0.85))",
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_60%)] pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
            <Car className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-extrabold text-[13px] uppercase tracking-wide text-white">
              🚗 Transporte ROXOU
            </p>
            <p className="text-[11px] text-white/85 mt-0.5">
              {rideClosed ? "Sistema de carona encerrado para este evento" : "Carona segura, ar, Wi-Fi e playlist. Vai sem stress."}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-white shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </button>

      {/* Option A — External ticket (secondary, thin border) */}
      {ticketUrl ? (
        <a
          href={ticketUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => { try { onTicketClick?.(); } catch {} onClose(); }}
          className="w-full flex items-center gap-3 rounded-2xl p-4 v3-glass v3-neon-hover group"
        >
          <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <ExternalLink className="w-5 h-5 text-foreground/80" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-[13px] uppercase tracking-wide text-foreground">
              Comprar ingresso
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Você será levado ao site do organizador
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </a>
      ) : (
        <div className="w-full flex items-center gap-3 rounded-2xl p-4 v3-glass opacity-60">
          <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <ExternalLink className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-[13px] uppercase tracking-wide text-muted-foreground">
              Sem link de ingresso
            </p>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5">
              Procure direto com a casa do evento
            </p>
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/60 text-center pt-1">
        Roxou conecta você ao role. Os serviços externos seguem suas próprias regras.
      </p>
    </div>
  );
}

export default function ReservationDrawer(props: ReservationDrawerProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={props.open} onOpenChange={props.onOpenChange}>
        <DrawerContent className="v3-glass-strong border-white/10">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Como você quer ir?</DrawerTitle>
          </DrawerHeader>
          <Body {...props} onClose={() => props.onOpenChange(false)} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent
        side="right"
        className="v3-glass-strong border-l border-white/10 w-full sm:max-w-md p-0"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Como você quer ir?</SheetTitle>
        </SheetHeader>
        <div className="pt-4">
          <Body {...props} onClose={() => props.onOpenChange(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
