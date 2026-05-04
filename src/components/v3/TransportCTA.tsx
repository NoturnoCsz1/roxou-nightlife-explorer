import { Car, ArrowRight, Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { isRideWindowClosed, RIDE_EXPIRED_MESSAGE } from "@/lib/rideTimeRules";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TransportCTAProps {
  eventName?: string;
  venueName?: string;
  eventDate?: string;
}

export default function TransportCTA({ eventName, venueName, eventDate }: TransportCTAProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [gateOpen, setGateOpen] = useState(false);
  const params = new URLSearchParams();
  if (eventName) params.set("event", eventName);
  if (venueName) params.set("venue", venueName);
  if (eventDate) params.set("date", eventDate);
  const closed = isRideWindowClosed(eventDate);
  const target = `/v3/transporte?${params.toString()}`;

  return (
    <>
      <Link
        to={closed ? "#" : target}
        onClick={(e) => {
          if (closed) {
            e.preventDefault();
            toast.error(RIDE_EXPIRED_MESSAGE);
            return;
          }
          if (!user) {
            e.preventDefault();
            setGateOpen(true);
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

      <AlertDialog open={gateOpen} onOpenChange={setGateOpen}>
        <AlertDialogContent className="rounded-2xl bg-background/90 backdrop-blur-xl border-primary/30">
          <AlertDialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mb-2">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <AlertDialogTitle className="text-center font-display">
              Caronas exclusivas para membros Roxou
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Para sua segurança, as caronas são exclusivas da nossa galera cadastrada. Faça login para continuar. 💜
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <AlertDialogCancel className="rounded-xl">Agora não</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => navigate(`/v3/perfil`)}
              className="rounded-xl bg-primary hover:bg-primary/90"
            >
              Entrar para solicitar carona
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
