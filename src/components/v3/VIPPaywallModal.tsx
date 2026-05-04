import { Crown, Gift, Sparkles, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface VIPPaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function VIPPaywallModal({ open, onOpenChange }: VIPPaywallModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[340px] rounded-3xl border-primary/30 bg-background/95 p-0 overflow-hidden v3-neon-glow">
        <div className="relative p-5 space-y-4">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-accent/10 to-transparent pointer-events-none" />
          <DialogHeader className="relative text-left space-y-2">
            <div className="h-12 w-12 rounded-2xl gradient-primary flex items-center justify-center neon-glow">
              <Crown className="h-6 w-6 text-primary-foreground" />
            </div>
            <DialogTitle className="font-display text-2xl font-black text-foreground">ROXOU VIP</DialogTitle>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Você usou suas 3 mensagens grátis de hoje. Desbloqueie recomendações ilimitadas, dicas de economia e prioridade nas oportunidades.
            </p>
          </DialogHeader>

          <div className="relative grid gap-2">
            {[
              "Aura sem limite diário",
              "Alertas de promoções e happy hours",
              "15 dias grátis a cada amigo indicado",
            ].map(item => (
              <div key={item} className="flex items-center gap-2 rounded-2xl border border-border/30 bg-card/60 px-3 py-2 text-xs text-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> {item}
              </div>
            ))}
          </div>

          <div className="relative space-y-2">
            <Button className="w-full rounded-2xl h-12 font-black gradient-primary text-primary-foreground neon-glow">
              Entrar na lista VIP
            </Button>
            <button onClick={() => onOpenChange(false)} className="w-full text-[11px] font-semibold text-muted-foreground hover:text-foreground">
              Continuar grátis amanhã
            </button>
          </div>

          <div className="relative flex items-center gap-2 rounded-2xl border border-accent/20 bg-accent/10 p-3 text-[11px] text-accent">
            <Gift className="h-4 w-4 shrink-0" /> Indique um amigo pelo seu perfil e ganhe 15 dias de VIP quando ele entrar.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
