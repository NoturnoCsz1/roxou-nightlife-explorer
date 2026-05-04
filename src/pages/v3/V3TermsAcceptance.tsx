import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { Shield } from "lucide-react";
import LegalDisclaimer from "@/components/LegalDisclaimer";
import { toast } from "sonner";

export default function V3TermsAcceptance() {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAccept = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Você precisa estar logado para aceitar os termos");
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ accepted_terms_at: new Date().toISOString() })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Termos aceitos com sucesso!");
      navigate("/transporte");
    } catch {
      toast.error("Erro ao aceitar termos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-8 space-y-6 max-w-md mx-auto">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-display font-bold text-xl text-foreground">Aceite dos Termos</h1>
        <p className="text-sm text-muted-foreground">Para usar o Roxou Transporte, você precisa aceitar nossos termos</p>
      </div>

      <LegalDisclaimer />

      <div className="space-y-3">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border/40">
          <Checkbox
            id="terms"
            checked={accepted}
            onCheckedChange={(v) => setAccepted(v === true)}
            className="mt-0.5"
          />
          <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
            Li e aceito os{" "}
            <Link to="/terms" className="text-primary hover:underline">Termos de Uso</Link> e a{" "}
            <Link to="/privacy" className="text-primary hover:underline">Política de Privacidade</Link> do Roxou Transporte.
          </label>
        </div>
      </div>

      <Button
        onClick={handleAccept}
        disabled={!accepted || loading}
        className="w-full h-12 rounded-xl font-semibold text-sm"
      >
        {loading ? "Processando..." : "Aceitar e continuar"}
      </Button>
    </div>
  );
}
