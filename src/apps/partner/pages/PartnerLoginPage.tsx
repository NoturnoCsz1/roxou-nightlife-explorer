/**
 * PartnerLoginPage — Fase 10A.
 *
 * Tela inicial de `parceiro.roxou.com.br`.
 * - Login Google via Lovable Auth (compartilhado com a Roxou pública).
 * - CTA "Solicitar acesso ao Partner Pro" para parceiros novos.
 * - Após login, gate é feito por PartnerStandaloneLayout (redireciona para
 *   /dashboard ou /onboarding conforme acesso).
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const PartnerLoginPage = () => {
  const navigate = useNavigate();
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    // Se já tem sessão, sai do login e deixa o layout decidir o destino.
    let cancelled = false;
    void supabase.auth.getUser().then(({ data }) => {
      if (!cancelled && data?.user) navigate("/", { replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      // Em produção, força o subdomínio do Partner Pro.
      // Em dev/preview, usa a origem atual + /dashboard.
      const isPartnerSubdomain =
        typeof window !== "undefined" &&
        window.location.hostname === "parceiro.roxou.com.br";
      const redirectTo = isPartnerSubdomain
        ? "https://parceiro.roxou.com.br/dashboard"
        : `${window.location.origin}/dashboard`;

      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: redirectTo,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao entrar com Google",
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10 bg-background">
      <div className="w-full max-w-md space-y-6">
        <header className="text-center space-y-2">
          <span className="inline-block rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
            Beta Fechado
          </span>
          <h1 className="text-2xl font-display font-black text-primary tracking-tight">
            ROXOU PARTNER PRO
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie seu estabelecimento, eventos, reservas e listas VIP em um só lugar.
          </p>
        </header>

        <div className="rounded-2xl border border-border/40 bg-card/60 p-5 space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogle}
            disabled={googleLoading}
          >
            {googleLoading ? "Entrando..." : "Entrar com Google"}
          </Button>

          <Button
            variant="default"
            className="w-full"
            onClick={() => navigate("/onboarding")}
          >
            Solicitar acesso ao Partner Pro
          </Button>

          <p className="text-[11px] text-muted-foreground text-center pt-1">
            Disponível apenas para estabelecimentos já cadastrados na Roxou.
          </p>
        </div>

        <p className="text-[11px] text-center text-muted-foreground">
          Para visitantes:{" "}
          <a className="underline hover:text-foreground" href="https://roxou.com.br">
            voltar para a Roxou
          </a>
        </p>
      </div>
    </main>
  );
};

export default PartnerLoginPage;
