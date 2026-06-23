/**
 * PartnerLoginPage — Ajuste final com explicação comercial e UX mobile.
 *
 * Login principal no `parceiro.roxou.com.br` agora é e-mail + senha via
 * `supabase.auth.signInWithPassword`, enquanto o Google OAuth segue
 * pendente de configuração do secret no provider Supabase.
 *
 * - Email/senha: principal.
 * - "Esqueci minha senha": dispara resetPasswordForEmail com redirect
 *   para `${origin}/login`.
 * - "Solicitar acesso": roteia o usuário (logado ou não) para o fluxo
 *   de onboarding.
 * - Google: mantido como secundário, marcado "em breve" enquanto o
 *   OAuth secret não está configurado.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { listMyAccessRequests } from "../services/partnerAccessRequests";
import { mapAuthError, signInWithGoogle, safeReturnTo } from "@/lib/authHelpers";

const GOOGLE_ENABLED = true;

const partnerOrigin = () =>
  typeof window === "undefined" ? "" : window.location.origin;

const buildPartnerUrl = (path: string) => `${partnerOrigin()}${path}`;

const readNextParam = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const sp = new URLSearchParams(window.location.search);
    return safeReturnTo(sp.get("next") ?? sp.get("returnTo"), "") || null;
  } catch {
    return null;
  }
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

const features = [
  "Reservas e camarotes",
  "Listas VIP e check-in por QR Code",
  "Equipe, validadores e acessos temporários",
  "Relatórios, operação diária e transporte",
];

const sheetItems = [
  { title: "Reservas Pro", desc: "Gestão de reservas, camarotes e mesas com controle de lotação em tempo real." },
  { title: "Listas VIP", desc: "Listas por nome, check-in via QR Code e controle de entrada com validadores." },
  { title: "Equipe e validadores", desc: "Cadastro de funcionários, permissões granulares e acessos temporários por PIN." },
  { title: "Transporte e excursões", desc: "Organização de excursões, caronas e transporte privativo para eventos." },
  { title: "Relatórios", desc: "Dashboard com métricas de ocupação, conversão, faturamento e operação diária." },
];

const PartnerLoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

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

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Informe e-mail e senha.");
      return;
    }
    setEmailLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error || !data?.user) {
        toast.error("E-mail ou senha inválidos.");
        setEmailLoading(false);
        return;
      }
      const next = readNextParam();
      const dest = next ?? (await resolveDestination(data.user.id));
      navigate(dest, { replace: true });
    } catch (err) {
      console.error("[PARTNER LOGIN] email/password error:", err);
      toast.error("E-mail ou senha inválidos.");
      setEmailLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      toast.error("Informe seu e-mail acima para receber o link.");
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: buildPartnerUrl("/login") },
      );
      if (error) throw error;
      toast.success("Enviamos um link para redefinir sua senha.");
    } catch (err) {
      console.error("[PARTNER LOGIN] reset password error:", err);
      toast.error("Não foi possível enviar o e-mail de redefinição.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!GOOGLE_ENABLED) {
      toast.info("Login com Google em breve. Use e-mail e senha por enquanto.");
      return;
    }
    try {
      const next = readNextParam() ?? "/dashboard";
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: buildPartnerUrl(next) },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err) {
      console.error("[PARTNER LOGIN] Google OAuth error:", err);
      toast.error(
        err instanceof Error ? err.message : "Erro ao entrar com Google",
      );
    }
  };

  const handleRequestAccess = async () => {
    setRequestLoading(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        navigate("/onboarding");
        return;
      }
      const dest = await resolveDestination(data.user.id);
      navigate(dest);
    } catch (err) {
      console.error("[PARTNER LOGIN] Access request error:", err);
      toast.error("Não foi possível continuar.");
    } finally {
      setRequestLoading(false);
    }
  };

  const busy = emailLoading || resetLoading || requestLoading;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-6 bg-background">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <header className="text-center space-y-1.5">
          <span className="inline-block rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
            Beta Fechado
          </span>
          <h1 className="text-2xl font-display font-black text-primary tracking-tight">
            ROXOU PARTNER PRO
          </h1>
          <p className="text-sm text-muted-foreground leading-snug">
            Gerencie reservas, listas VIP, equipe, check-ins e operações do seu evento em um só lugar.
          </p>
        </header>

        {/* What you manage */}
        <div className="rounded-xl border border-border/40 bg-card/40 px-4 py-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            O que você gerencia aqui?
          </p>
          <ul className="space-y-1">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs text-foreground">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                <span className="leading-snug">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Login form */}
        <form
          onSubmit={handleEmailLogin}
          className="rounded-2xl border border-border/40 bg-card/60 p-5 space-y-3 relative z-10"
        >
          <div className="space-y-1">
            <label htmlFor="partner-email" className="text-xs font-medium text-muted-foreground">
              E-mail
            </label>
            <input
              id="partner-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              className="w-full h-11 px-3 rounded-md border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="voce@estabelecimento.com"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="partner-password" className="text-xs font-medium text-muted-foreground">
              Senha
            </label>
            <input
              id="partner-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              className="w-full h-11 px-3 rounded-md border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full h-11 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {emailLoading ? "Entrando..." : "Entrar com e-mail"}
          </button>

          <div className="flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={busy}
              className="text-muted-foreground underline hover:text-foreground disabled:opacity-60"
            >
              {resetLoading ? "Enviando..." : "Esqueci minha senha"}
            </button>
            <button
              type="button"
              onClick={handleRequestAccess}
              disabled={busy}
              className="text-primary underline hover:opacity-80 disabled:opacity-60"
            >
              {requestLoading ? "Abrindo..." : "Solicitar acesso"}
            </button>
          </div>

          <div className="pt-2 border-t border-border/40">
            <button
              type="button"
              onClick={handleGoogle}
              disabled={busy || !GOOGLE_ENABLED}
              className="w-full h-10 rounded-md border border-border bg-background text-muted-foreground text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              title={GOOGLE_ENABLED ? "" : "Em breve"}
            >
              {GOOGLE_ENABLED ? "Entrar com Google" : "Google em breve"}
            </button>
          </div>
        </form>

        {/* Features accordion */}
        <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
          <button
            type="button"
            onClick={() => setSheetOpen((s) => !s)}
            className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-medium text-primary hover:opacity-80 transition-opacity"
          >
            <span>Conheça os recursos</span>
            {sheetOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {sheetOpen && (
            <div className="px-4 pb-3 space-y-2 border-t border-border/30">
              {sheetItems.map((item) => (
                <div key={item.title} className="pt-2">
                  <p className="text-xs font-semibold text-foreground">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug">{item.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer copy */}
        <p className="text-[11px] text-muted-foreground text-center leading-snug px-2">
          Uma central para bares, festas e eventos controlarem reservas, listas VIP, check-ins, equipe e operação em tempo real.
        </p>

        <p className="text-[11px] text-muted-foreground text-center px-4">
          Disponível apenas para estabelecimentos e organizadores cadastrados na Roxou.
        </p>

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
