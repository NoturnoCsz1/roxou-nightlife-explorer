import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function V3Auth() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      toast.success("Login realizado!");
      navigate(redirectTo);
    } catch (err: any) {
      toast.error(err.message || "Erro ao entrar com Google");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="px-4 pt-3 pb-8 max-w-md mx-auto">
      {/* Voltar — discreto, alinhado ao topo */}
      <Link
        to="/"
        className="inline-flex items-center gap-1 -ml-1 mb-3 px-2 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar
      </Link>

      {/* Header compacto: logo + título imediatos */}
      <div className="text-center mb-4">
        <p
          className="font-display font-black text-2xl text-primary"
          style={{ textShadow: "0 0 24px hsl(var(--primary)/0.5)" }}
        >
          ROXOU
        </p>
        <h1 className="mt-2 font-display font-bold text-xl text-foreground leading-tight">
          Entrar na Roxou
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          É rápido, seguro e sem senha.
        </p>
      </div>

      {/* Card de login — CTA dentro da primeira dobra */}
      <div className="rounded-2xl border border-border/40 bg-card/60 p-4 space-y-3">
        <Button
          variant="outline"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-3 border-border/40 bg-card hover:bg-accent"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {googleLoading ? "Conectando..." : "Continuar com Google"}
        </Button>

        <p className="text-[11px] text-muted-foreground/70 text-center leading-relaxed">
          Ao continuar, você concorda com os termos de uso da Roxou.
        </p>
      </div>

      {/* Benefícios — abaixo da dobra, não empurra o CTA */}
      <p className="mt-4 text-[11px] text-muted-foreground/80 text-center leading-relaxed px-2">
        Entrando você pode salvar eventos, comentar nos jogos
        <br className="hidden sm:inline" /> e pedir caronas.
      </p>
    </div>
  );
}
