import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogIn } from "lucide-react";
import {
  mapAuthError,
  readReturnToFromUrl,
  signInWithGoogle,
} from "@/lib/authHelpers";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();
  const returnTo = readReturnToFromUrl("/admin/dashboard");

  // Se já logado, vai direto para destino.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled || !data?.user) return;
      navigate(returnTo, { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, returnTo]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha email e senha");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(mapAuthError(error));
      return;
    }
    toast.success("Login realizado!");
    navigate(returnTo, { replace: true });
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    const r = await signInWithGoogle(returnTo);
    setGoogleLoading(false);
    if (!r.ok) toast.error(r.error ?? "Erro ao entrar com Google");
  }

  async function handleReset() {
    if (!email.trim()) {
      toast.error("Informe seu e-mail acima para receber o link.");
      return;
    }
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    setResetLoading(false);
    if (error) {
      toast.error("Não foi possível enviar o e-mail de redefinição.");
      return;
    }
    toast.success("Enviamos um link para redefinir sua senha.");
  }

  const busy = loading || googleLoading || resetLoading;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black font-display neon-text text-primary tracking-tight">ROXOU</h1>
          <p className="text-xs text-muted-foreground mt-1">Painel Administrativo</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4 rounded-2xl border border-border/40 bg-card p-6">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              className="w-full rounded-lg border border-border/50 bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/50 transition mt-1"
              placeholder="admin@roxou.com"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Senha</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              className="w-full rounded-lg border border-border/50 bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/50 transition mt-1"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" />
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={busy}
            className="w-full text-[11px] text-muted-foreground underline hover:text-foreground disabled:opacity-60"
          >
            {resetLoading ? "Enviando..." : "Esqueci minha senha"}
          </button>

          <div className="pt-3 border-t border-border/40">
            <button
              type="button"
              onClick={handleGoogle}
              disabled={busy}
              className="w-full h-10 rounded-lg border border-border bg-background text-sm font-medium hover:bg-accent transition disabled:opacity-60"
            >
              {googleLoading ? "Conectando..." : "Entrar com Google"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
