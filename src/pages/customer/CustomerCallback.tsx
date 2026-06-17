/**
 * CustomerCallback — finaliza o magic link.
 *
 * Aguarda a sessão ativa, opcionalmente chama
 * link_record_to_customer(kind, token) e redireciona para `redirect`.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import SEO from "@/components/SEO";
import { useToast } from "@/hooks/use-toast";
import { useCustomerSession } from "@/hooks/useCustomerSession";
import { linkRecordToCustomer } from "@/services/customerProfile";

const CustomerCallback = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useCustomerSession();
  const [message, setMessage] = useState("Concluindo seu acesso…");
  const handled = useRef(false);

  const redirectPath = params.get("redirect") || "/cliente/minhas-reservas";
  const kind = params.get("kind");
  const token = params.get("token");

  useEffect(() => {
    if (handled.current) return;
    if (loading) return;
    if (!user) {
      // Pode ainda estar processando hash do Supabase — aguarda um pouco
      const t = setTimeout(() => {
        if (!handled.current) {
          handled.current = true;
          navigate("/cliente/login", { replace: true });
        }
      }, 4000);
      return () => clearTimeout(t);
    }
    handled.current = true;
    (async () => {
      if (kind && token && (kind === "reservation" || kind === "vip_entry")) {
        setMessage("Salvando comprovante na sua conta…");
        try {
          const res = await linkRecordToCustomer(kind, token);
          toast({
            title: res.linked
              ? "Comprovante salvo na sua conta."
              : "Comprovante já estava salvo.",
          });
        } catch (err) {
          toast({
            title: "Conta autenticada, mas não foi possível salvar.",
            description: (err as Error).message,
            variant: "destructive",
          });
        }
      }
      navigate(redirectPath, { replace: true });
    })();
  }, [loading, user, kind, token, redirectPath, navigate, toast]);

  return (
    <main className="min-h-screen w-full bg-background">
      <SEO title="Entrando… | Roxou" description="Concluindo sua entrada." />
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </main>
  );
};

export default CustomerCallback;
