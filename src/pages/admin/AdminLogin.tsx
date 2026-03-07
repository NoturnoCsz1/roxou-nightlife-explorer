import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogIn } from "lucide-react";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
      toast.error(error.message);
    } else {
      toast.success("Login realizado!");
      navigate("/admin/dashboard");
    }
  }

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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border/50 bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/50 transition mt-1"
              placeholder="admin@roxou.com"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border/50 bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/50 transition mt-1"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" />
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
