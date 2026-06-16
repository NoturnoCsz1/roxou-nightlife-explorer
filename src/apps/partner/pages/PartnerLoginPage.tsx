/**
 * PartnerLoginPage — Fase 10A (hotfix botões).
 *
 * Tela inicial de `parceiro.roxou.com.br`.
 * - Login Google via OAuth gerenciado Lovable Cloud.
 * - CTA "Solicitar acesso" que roteia conforme o estado do usuário.
 *
 * Causa raiz do bug anterior:
 *   O endpoint nativo `/auth/v1/authorize?provider=google` retorna 400
 *   quando o provider Google do Auth não tem secret nativo salvo. No
 *   Lovable Cloud, o fluxo correto usa o broker OAuth gerenciado.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { listMyAccessRequests } from "../services/partnerAccessRequests";

const partnerOrigin = () =>
  typeof window === "undefined" ? "" : window.location.origin;

const buildPartnerUrl = (path: string) => `${partnerOrigin()}${path}`;

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

async function resolveDestination(userId: string): Promise<string> {
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

  try {
    const reqs = await listMyAccessRequests();
    if (reqs.some((r) => r.status === "pending")) return "/pending";
  } catch {
    /* noop */
  }

  return "/onboarding";
}

async function startGoogleOAuth(redirectPath: string) {
  const redirectTo = buildPartnerUrl(redirectPath);
  // eslint-disable-next-line no-console
  console.log("[PARTNER LOGIN] managed Google OAuth → redirect_uri:", redirectTo);
  const result = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: redirectTo,
  });
  if (result.error) throw result.error;
  if (result.redirected) return;
  if (typeof window !== "undefined") {
    window.location.href = redirectTo;
  }
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

  const handleGoogle = async () => {
    // eslint-disable-next-line no-console
    console.log("[PARTNER LOGIN] Google button clicked");
    setGoogleLoading(true);
    try {
      const next = readNextParam() ?? "/dashboard";
      await startGoogleOAuth(next);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[PARTNER LOGIN] Google OAuth error:", err);
      toast.error(
        err instanceof Error ? err.message : "Erro ao entrar com Google",
      );
      setGoogleLoading(false);
    }
  };

  const handleRequestAccess = async () => {
    // eslint-disable-next-line no-console
    console.log("[PARTNER LOGIN] Access request clicked");
    setRequestLoading(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        await startGoogleOAuth("/onboarding");
        return;
      }
      const dest = await resolveDestination(data.user.id);
      navigate(dest);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[PARTNER LOGIN] Access request error:", err);
      toast.error(
        err instanceof Error ? err.message : "Não foi possível continuar",
      );
    } finally {
      setRequestLoading(false);
    }
  };

  const busy = googleLoading || requestLoading;

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

        <div className="rounded-2xl border border-border/40 bg-card/60 p-5 space-y-3 relative z-10">
          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="w-full h-11 rounded-md border border-border bg-background hover:bg-muted text-foreground font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {googleLoading ? "Entrando..." : "Entrar com Google"}
          </button>

          <button
            type="button"
            onClick={handleRequestAccess}
            disabled={busy}
            className="w-full h-11 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {requestLoading ? "Abrindo..." : "Solicitar acesso ao Partner Pro"}
          </button>

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
