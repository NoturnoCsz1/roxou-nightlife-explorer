/**
 * UpdatePasswordPage — `/auth/update-password`.
 *
 * Página chamada pelo link de redefinição de senha do Supabase. Quando o
 * usuário clica no link do e-mail, o Supabase abre esta rota com tokens
 * de recovery; `onAuthStateChange` emite `PASSWORD_RECOVERY`, e aqui o
 * usuário define a nova senha via `supabase.auth.updateUser`.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase já processa o fragmento da URL automaticamente (detectSessionInUrl).
    // Quando a sessão estiver pronta, liberamos o form.
    let mounted = true;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted && data.session) setReady(true);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        if (mounted) setReady(true);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Use uma senha com ao menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não conferem.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível atualizar a senha. Tente novamente.");
      return;
    }
    toast.success("Senha atualizada com sucesso.");
    navigate("/", { replace: true });
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-6 bg-background">
      <div className="w-full max-w-md space-y-4">
        <header className="text-center space-y-1.5">
          <h1 className="text-2xl font-display font-black text-primary tracking-tight">
            ROXOU
          </h1>
          <p className="text-sm text-muted-foreground">Definir nova senha</p>
        </header>

        {!ready ? (
          <div className="rounded-2xl border border-border/40 bg-card/60 p-5 text-sm text-muted-foreground text-center">
            Validando link de recuperação...
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-border/40 bg-card/60 p-5 space-y-3"
          >
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Nova senha
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full h-11 px-3 rounded-md border border-border bg-background outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Mínimo 8 caracteres"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Confirmar senha
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={loading}
                className="w-full h-11 px-3 rounded-md border border-border bg-background outline-none focus:ring-2 focus:ring-primary/40"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-colors disabled:opacity-60"
            >
              {loading ? "Salvando..." : "Atualizar senha"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
