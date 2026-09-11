/**
 * PartnerRequestAccessPage — Convergência Onda 1.
 *
 * O pedido de acesso passou a ser autenticado e vinculado a um estabelecimento
 * oficial (`venues`) via `/onboarding` → `organization_access_requests`.
 * Esta tela apenas encaminha o usuário para o fluxo correto.
 * Sem dependência do Supabase legado.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { partnerSupabase } from "../backend/partnerSupabase";

const WHATSAPP_URL =
  "https://wa.me/5518997469865?text=" +
  encodeURIComponent("Olá! Quero solicitar acesso ao Roxou Partner Pro.");

const PartnerRequestAccessPage = () => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    partnerSupabase.auth.getUser().then(({ data, error }) => {
      if (mounted && !error && data.user?.email) {
        setUserEmail(data.user.email);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogout() {
    await partnerSupabase.auth.signOut();
    // Garante que qualquer resíduo do storage local do Partner seja removido.
    try {
      localStorage.removeItem("roxou.partner.auth");
    } catch {
      /* noop */
    }
    setUserEmail(null);
    navigate("/login", { replace: true });
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-6 bg-background">
      {userEmail && (
        <div className="w-full max-w-md mb-4 flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-card/60 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Logado como
            </p>
            <p className="text-sm font-medium truncate">{userEmail}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="shrink-0 text-xs gap-2"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair / Trocar conta
          </Button>
        </div>
      )}

      <div className="w-full max-w-md space-y-4 rounded-2xl border border-border/40 bg-card/60 p-6 text-center">
        <h1 className="text-2xl font-display font-black text-primary tracking-tight">
          Solicitar acesso ao Roxou Partner Pro
        </h1>
        <p className="text-sm text-muted-foreground leading-snug">
          Faça login e escolha o seu estabelecimento já cadastrado na Roxou.
          A equipe valida a solicitação e libera o acesso.
        </p>

        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={() => navigate("/login?next=/onboarding")}
            className="w-full h-11 rounded-md bg-primary text-primary-foreground font-semibold"
          >
            Entrar e solicitar acesso
          </button>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="w-full h-11 inline-flex items-center justify-center rounded-md border border-border text-sm"
          >
            Falar no WhatsApp
          </a>
          <Link to="/login" className="text-[11px] text-muted-foreground underline pt-1">
            Voltar ao login
          </Link>
        </div>
      </div>
    </main>
  );
};

export default PartnerRequestAccessPage;
