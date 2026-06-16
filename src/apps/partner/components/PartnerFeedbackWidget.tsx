/**
 * PartnerFeedbackWidget — Fase 9K
 *
 * Botão flutuante que abre um popover para enviar feedback do beta.
 * Persiste em `partner_beta_feedback`.
 */
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageSquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { submitBetaFeedback } from "../services/partnerBeta";
import { usePartnerAuth } from "../hooks/usePartnerAuth";

export function PartnerFeedbackWidget() {
  const { selectedPartnerId } = usePartnerAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

  // FIX 10F: ocultar em telas críticas (modo portaria / check-in público).
  const HIDDEN_PATHS = ["/checkin", "/portaria"];
  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;

  const send = async () => {
    if (!msg.trim()) return;
    setSending(true);
    try {
      await submitBetaFeedback({
        message: msg,
        page: pathname,
        partnerId: selectedPartnerId,
      });
      toast({ title: "Obrigado!", description: "Feedback enviado." });
      setMsg("");
      setOpen(false);
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
    <div className="fixed bottom-24 right-4 z-40 md:bottom-6">


      {open ? (
        <Card className="w-72 p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Feedback do beta</p>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <Textarea
            placeholder="Conte o que melhorou ou o que está travando..."
            rows={4}
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button
              size="sm"
              onClick={() => void send()}
              disabled={!msg.trim() || sending}
            >
              {sending ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </Card>
      ) : (
        <Button
          size="sm"
          className="rounded-full shadow-lg"
          onClick={() => setOpen(true)}
        >
          <MessageSquarePlus className="mr-1 h-4 w-4" />
          Feedback
        </Button>
      )}
    </div>
  );
}
