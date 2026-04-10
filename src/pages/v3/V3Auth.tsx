import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Lock, User, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

type Mode = "login" | "signup";

export default function V3Auth() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/v3";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: window.location.origin + redirectTo,
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu e-mail para confirmar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Login realizado!");
        navigate(redirectTo);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro na autenticação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-6 max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/v3" className="p-2 -ml-2 rounded-xl hover:bg-card transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="font-display font-bold text-xl text-foreground">
            {mode === "login" ? "Entrar" : "Criar conta"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {mode === "login" ? "Acesse sua conta Roxou" : "Junte-se ao Roxou"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm text-muted-foreground">Nome</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="pl-10 h-12 rounded-xl bg-card border-border/40"
                required
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm text-muted-foreground">E-mail</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="pl-10 h-12 rounded-xl bg-card border-border/40"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm text-muted-foreground">Senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              minLength={6}
              className="pl-10 h-12 rounded-xl bg-card border-border/40"
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-xl font-semibold text-sm"
        >
          {loading ? "Processando..." : mode === "login" ? "Entrar" : "Criar conta"}
        </Button>
      </form>

      <div className="text-center">
        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="text-sm text-primary hover:underline"
        >
          {mode === "login" ? "Não tem conta? Criar agora" : "Já tem conta? Entrar"}
        </button>
      </div>
    </div>
  );
}
