/**
 * PartnerLoginPage — Fase 10A.
 *
 * Tela inicial de `parceiro.roxou.com.br`.
 * - Login Google via Lovable Auth (compartilhado com a Roxou pública).
 * - CTA "Solicitar acesso ao Partner Pro" que roteia de forma inteligente
 *   conforme o estado do usuário (deslogado / sem acesso / pending / ativo).
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { listMyAccessRequests } from "../services/partnerAccessRequests";

/** Caminho absoluto sempre dentro do subdomínio Partner Pro. */
const partnerOrigin = () => {
  if (typeof window === "undefined") return "";
  return window.location.origin;
};

const buildPartnerUrl = (path: string) => `${partnerOrigin()}${path}`;

/** Lê ?next= e devolve um path interno seguro (começa com "/"). */
const readNextParam = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const sp = new URLSearchParams(window.location.search);
    const n = sp.get("next");
    if (n && n.startsWith("/") && !n.startsWith("//")) return n;
  } catch {
    /* noop */
  }
  return null;
};

/** Decide para onde mandar um usuário logado dentro do Partner Pro. */
async function resolveDestination(userId: string): Promise<string> {
  // 1) Acesso ativo => dashboard
  const { data: beta } = await supabase
    .from("partner_beta_access")
    .select("partner_id")
    .eq("user_id", userId)
    .eq("access_enabled", true)
    .limit(1);
  if (beta && beta.length > 0) return "/dashboard";

  const { data: pu } = await supabase
    .from("partner_users")
    .select("partner_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1);
  if (pu && pu.length > 0) return "/dashboard";

  // 2) Pending => /pending
  try {
    const reqs = await listMyAccessRequests();
    if (reqs.some((r) => r.status === "pending")) return "/pending";
  } catch {
    /* noop */
  }

  // 3) Sem nada => onboarding
  return "/onboarding";
}

const PartnerLoginPage = () => {
  const navigate = useNavigate();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled || !data?.user) return;
      const next = readNextParam();
      const dest = next ?? (await resolveDestination(data.user.id));
      if (!cancelled) navigate(dest, { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const startGoogle = async (nextPath: string) => {
    const redirectTo = buildPartnerUrl(nextPath);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: redirectTo,
    });
    if (result.error) throw result.error;
    if (result.redirected) return true;
    return false;
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const next = readNextParam() ?? "/dashboard";
      const redirected = await startGoogle(next);
      if (!redirected) navigate(next, { replace: true });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao entrar com Google",
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleRequestAccess = async () => {
    setRequestLoading(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        // Não logado: inicia Google e retorna direto no /onboarding.
        const redirected = await startGoogle("/onboarding");
        if (!redirected) navigate("/onboarding");
        return;
      }
      const dest = await resolveDestination(data.user.id);
      navigate(dest);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível continuar",
      );
    } finally {
      setRequestLoading(false);
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
            disabled={googleLoading || requestLoading}
          >
            {googleLoading ? "Entrando..." : "Entrar com Google"}
          </Button>

          <Button
            variant="default"
            className="w-full"
            onClick={handleRequestAccess}
            disabled={googleLoading || requestLoading}
          >
            {requestLoading ? "Abrindo..." : "Solicitar acesso ao Partner Pro"}
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
