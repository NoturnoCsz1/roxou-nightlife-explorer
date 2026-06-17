/**
 * CustomerLogin — Magic Link por e-mail (Supabase Auth).
 *
 * Query params:
 *   redirect=<path>     — para onde voltar após autenticar
 *   kind=reservation|vip_entry & token=<uuid> — claim a ser executado
 *
 * Mobile-first. Sem senha. WhatsApp/telefone aparece como "Em breve".
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";
import { useToast } from "@/hooks/use-toast";
import { useCustomerSession } from "@/hooks/useCustomerSession";

const CustomerLogin = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading, signInWithEmail } = useCustomerSession();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const redirectPath = params.get("redirect") || "/cliente/minhas-reservas";
  const kind = params.get("kind");
  const token = params.get("token");

  const callbackUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const cb = new URL("/cliente/callback", window.location.origin);
    cb.searchParams.set("redirect", redirectPath);
    if (kind && token) {
      cb.searchParams.set("kind", kind);
      cb.searchParams.set("token", token);
    }
    return cb.toString();
  }, [redirectPath, kind, token]);

  // Se já estiver logado, manda direto para o callback (que cuida do claim).
  useEffect(() => {
    if (!loading && user) {
      const cb = new URL(callbackUrl);
      // já estamos no app: usar pathname+search só
      navigate(cb.pathname + cb.search, { replace: true });
    }
  }, [loading, user, callbackUrl, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      await signInWithEmail(email, callbackUrl);
      setSent(true);
      toast({
        title: "Link enviado!",
        description: "Confira seu e-mail e clique no link para entrar.",
      });
    } catch (err) {
      toast({
        title: "Não foi possível enviar o link.",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-background">
      <SEO
        title="Entrar na sua conta | Roxou"
        description="Acesse suas reservas, listas VIP e convites na Roxou."
      />
      <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-8">
        <header className="space-y-1 text-center">
          <p className="text-xs uppercase tracking-wide text-primary">
            Minha conta Roxou
          </p>
          <h1 className="text-2xl font-bold">Entrar ou criar conta</h1>
          <p className="text-sm text-muted-foreground">
            Salve suas reservas, listas VIP e convites em um só lugar.
          </p>
        </header>

        <Card className="space-y-4 p-5">
          {sent ? (
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                <Mail className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold">Confira seu e-mail</h2>
              <p className="text-sm text-muted-foreground">
                Enviamos um link mágico para <strong>{email}</strong>. Abra no
                mesmo aparelho para concluir.
              </p>
              <Button
                variant="outline"
                onClick={() => setSent(false)}
                className="w-full min-h-[44px]"
              >
                Usar outro e-mail
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="customer-email">E-mail</Label>
                <Input
                  id="customer-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  placeholder="voce@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-h-[44px]"
                />
              </div>
              <Button
                type="submit"
                className="w-full min-h-[44px]"
                disabled={sending || !email.trim()}
              >
                {sending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Receber link de acesso
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled
                className="w-full min-h-[44px] opacity-60"
                title="Em breve"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Entrar com WhatsApp (em breve)
              </Button>
            </form>
          )}
        </Card>

        <p className="flex items-start gap-2 rounded-md border border-border/50 bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>
            Ao criar sua conta, você concorda em salvar seus dados para acessar
            reservas, listas VIP e convites na Roxou. Leia nossa{" "}
            <Link to="/v3/privacy" className="underline">
              Política de Privacidade
            </Link>
            .
          </span>
        </p>

        <div className="text-center">
          <Link
            to={redirectPath}
            className="text-xs text-muted-foreground underline"
          >
            Continuar sem conta
          </Link>
        </div>
      </div>
    </main>
  );
};

export default CustomerLogin;
