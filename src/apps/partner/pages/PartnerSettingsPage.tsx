/**
 * PartnerSettingsPage — Suporte e Feedback (Sprint final).
 *
 * Substitui o widget flutuante por uma seção dedicada em Configurações,
 * usando GlassCard premium. Sem alteração de backend.
 */
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageSquarePlus, AlertOctagon, LifeBuoy, Send } from "lucide-react";
import { GlassCard } from "../components/ui/GlassCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { usePartnerAuth } from "../hooks/usePartnerAuth";
import { submitBetaFeedback } from "../services/partnerBeta";

type FeedbackKind = "suggestion" | "issue" | "contact";

const KIND_META: Record<
  FeedbackKind,
  { title: string; description: string; placeholder: string; tag: string }
> = {
  suggestion: {
    title: "Enviar sugestão",
    description: "Conte o que pode melhorar no Partner Pro.",
    placeholder: "Ex.: gostaria de filtrar reservas por promoter...",
    tag: "[Sugestão]",
  },
  issue: {
    title: "Reportar problema",
    description: "Descreva o erro ou comportamento inesperado.",
    placeholder: "Passos para reproduzir, o que esperava ver...",
    tag: "[Problema]",
  },
  contact: {
    title: "Falar com a equipe Roxou",
    description: "Envie sua mensagem direto para o time.",
    placeholder: "Como podemos te ajudar?",
    tag: "[Contato]",
  },
};

function FeedbackOption({
  icon: Icon,
  title,
  hint,
  onClick,
}: {
  icon: typeof MessageSquarePlus;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-lg bg-background/30 border border-white/5 p-3 hover:bg-background/50 transition-colors flex items-start gap-3"
    >
      <span className="rounded-md bg-primary/15 text-primary p-2 shrink-0">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}

const PartnerSettingsPage = () => {
  const { selectedPartnerId } = usePartnerAuth();
  const { pathname } = useLocation();
  const [kind, setKind] = useState<FeedbackKind | null>(null);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

  const meta = kind ? KIND_META[kind] : null;

  const close = () => {
    if (sending) return;
    setKind(null);
    setMsg("");
  };

  const send = async () => {
    if (!kind || !msg.trim()) return;
    setSending(true);
    try {
      await submitBetaFeedback({
        message: `${KIND_META[kind].tag} ${msg.trim()}`,
        page: pathname,
        partnerId: selectedPartnerId,
      });
      toast({ title: "Obrigado!", description: "Mensagem enviada à equipe Roxou." });
      setKind(null);
      setMsg("");
    } catch (e) {
      toast({
        title: "Não foi possível enviar",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8 space-y-6 max-w-3xl mx-auto pb-24">
      <header>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Preferências e canais de suporte do Partner Pro.
        </p>
      </header>

      <GlassCard variant="gradient" padding="md">
        <div className="flex items-center gap-2 mb-3">
          <LifeBuoy className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">Suporte e Feedback</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Sua opinião nos ajuda a evoluir o Partner Pro.
        </p>
        <div className="grid gap-2">
          <FeedbackOption
            icon={MessageSquarePlus}
            title="Enviar sugestão"
            hint="Ideia de melhoria ou nova funcionalidade"
            onClick={() => setKind("suggestion")}
          />
          <FeedbackOption
            icon={AlertOctagon}
            title="Reportar problema"
            hint="Erros, lentidão ou comportamento estranho"
            onClick={() => setKind("issue")}
          />
          <FeedbackOption
            icon={Send}
            title="Falar com a equipe Roxou"
            hint="Tirar dúvidas ou pedir ajuda"
            onClick={() => setKind("contact")}
          />
        </div>
      </GlassCard>

      <Dialog open={!!kind} onOpenChange={(o) => (!o ? close() : null)}>
        <DialogContent className="max-w-md">
          {meta ? (
            <>
              <DialogHeader>
                <DialogTitle>{meta.title}</DialogTitle>
                <DialogDescription>{meta.description}</DialogDescription>
              </DialogHeader>
              <Textarea
                rows={5}
                placeholder={meta.placeholder}
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                disabled={sending}
              />
              <DialogFooter>
                <Button variant="ghost" onClick={close} disabled={sending}>
                  Cancelar
                </Button>
                <Button onClick={() => void send()} disabled={!msg.trim() || sending}>
                  {sending ? "Enviando..." : "Enviar"}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default PartnerSettingsPage;
