import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck, Lock, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useV3Profile } from "@/hooks/useV3Profile";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Disparado após aceite com sucesso. */
  onAccepted?: () => void;
}

/**
 * Modal de aceite +18 + Termos LGPD da Comunidade ROXOU.
 * Persiste age_confirmed_at e community_terms_accepted_at no profile.
 */
export default function CommunityConsentModal({ open, onOpenChange, onAccepted }: Props) {
  const { user, profile } = useV3Profile();
  const [age18, setAge18] = useState(false);
  const [terms, setTerms] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAge18(!!(profile as any)?.age_confirmed_at);
      setTerms(!!(profile as any)?.community_terms_accepted_at);
    }
  }, [open, profile]);

  const canSubmit = age18 && terms && !saving;

  const handleAccept = async () => {
    if (!user) {
      toast.error("Faça login para continuar.");
      return;
    }
    setSaving(true);
    const now = new Date().toISOString();
    const { error } = await supabase.from("profiles").update({
      age_confirmed_at: now,
      community_terms_accepted_at: now,
    } as any).eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao registrar aceite: " + error.message);
      return;
    }
    toast.success("Tudo certo! Bem-vindo à Comunidade ROXOU.");
    onAccepted?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border-primary/30 bg-background/95 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, hsl(280 90% 60%), hsl(320 90% 60%))" }}
          >
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <DialogTitle className="font-display font-black text-lg">Comunidade ROXOU</DialogTitle>
            <DialogDescription className="text-xs">Antes de entrar na vibe</DialogDescription>
          </div>
        </div>

        <div className="space-y-3 mt-2">
          <div className="rounded-2xl border border-border/30 bg-card/40 p-3">
            <div className="flex items-start gap-2.5">
              <Lock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-foreground mb-1">Privacidade e LGPD</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Os dados de interação na Comunidade são <strong>temporários</strong> (deletados após o evento). 
                  Seu WhatsApp é protegido por <strong>criptografia ponta a ponta</strong> e só liberado quando você confirma uma carona.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/30 bg-card/40 p-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 text-accent mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-foreground mb-1">Boas práticas</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Sem spam, sem assédio, sem desrespeito. Mensagens podem ser moderadas e contas reincidentes serão removidas.
                </p>
              </div>
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-border/30 bg-background/40 p-3 cursor-pointer hover:border-primary/40 transition">
            <Checkbox checked={age18} onCheckedChange={(v) => setAge18(!!v)} className="mt-0.5" />
            <span className="text-xs text-foreground leading-relaxed">
              Declaro que tenho <strong>18 anos ou mais</strong> e estou apto a participar da Comunidade.
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-border/30 bg-background/40 p-3 cursor-pointer hover:border-primary/40 transition">
            <Checkbox checked={terms} onCheckedChange={(v) => setTerms(!!v)} className="mt-0.5" />
            <span className="text-xs text-foreground leading-relaxed">
              Li e aceito os <strong>Termos da Comunidade ROXOU</strong> e a Política de Privacidade.
            </span>
          </label>
        </div>

        <Button
          onClick={handleAccept}
          disabled={!canSubmit}
          className="w-full mt-3 rounded-2xl h-12 font-bold text-white border-0 disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, hsl(280 90% 60%), hsl(320 90% 60%))",
            boxShadow: "0 8px 30px -8px hsl(290 90% 60% / 0.6)",
          }}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Concordar e entrar na vibe"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
