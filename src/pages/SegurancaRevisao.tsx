import { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, AlertTriangle, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sanitizeText } from "@/shared/utils/sanitize";

export default function SegurancaRevisao() {
  const [reason, setReason] = useState("");
  const [contact, setContact] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const cleanReason = sanitizeText(reason, 1000);
    const cleanContact = sanitizeText(contact, 200);
    if (cleanReason.length < 10) {
      toast.error("Descreva sua contestação com pelo menos 10 caracteres.");
      return;
    }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("security_reports").insert({
      reporter_id: user?.id ?? null,
      target_user_id: user?.id ?? null,
      category: "appeal",
      severity: "low",
      evidence: `[CONTATO: ${cleanContact}] ${cleanReason}`,
      status: "pending",
    } as any);
    setBusy(false);
    if (error) { toast.error("Não foi possível enviar agora. Tente novamente."); return; }
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-3xl border border-border/40 bg-card/80 backdrop-blur-xl p-6 sm:p-8 space-y-5 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/15 border border-primary/30 grid place-items-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Revisão de segurança</h1>
            <p className="text-xs text-muted-foreground">Roxou · Política da Comunidade</p>
          </div>
        </div>

        <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/5 p-4 text-sm text-foreground/90 leading-relaxed flex gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
          <p>
            A atividade detectada na sua conta violou as <strong>políticas de segurança da Roxou</strong>.
            Seu acesso a partes da plataforma pode estar temporariamente limitado enquanto nossa equipe revisa.
          </p>
        </div>

        {sent ? (
          <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-5 text-center space-y-2">
            <div className="text-2xl">✅</div>
            <p className="text-sm font-medium text-foreground">Sua contestação foi recebida.</p>
            <p className="text-xs text-muted-foreground">
              Nossa equipe vai analisar e responder pelo contato informado em até 72h úteis.
            </p>
            <Link to="/" className="inline-block mt-3 text-xs font-bold uppercase text-primary hover:underline">
              Voltar para a Roxou
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-bold uppercase text-muted-foreground">Conte o que aconteceu</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={5}
                maxLength={1000}
                placeholder="Descreva a situação. Não inclua dados sensíveis."
                className="mt-1 w-full rounded-xl border border-border/40 bg-background/70 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
              />
              <span className="text-[10px] text-muted-foreground">{reason.length}/1000</span>
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-muted-foreground">Como podemos te responder?</span>
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                maxLength={200}
                placeholder="E-mail ou WhatsApp"
                className="mt-1 w-full rounded-xl border border-border/40 bg-background/70 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
              />
            </label>
            <button
              onClick={submit}
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition"
            >
              <MessageSquare className="h-4 w-4" />
              {busy ? "Enviando..." : "Enviar contestação"}
            </button>
            <p className="text-[11px] text-muted-foreground text-center">
              Por motivos de segurança, não compartilhamos detalhes técnicos do bloqueio.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
