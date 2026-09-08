/**
 * PartnerRequestAccessPage — Convergência Onda 1.
 *
 * O pedido de acesso passou a ser autenticado e vinculado a um estabelecimento
 * oficial (`venues`) via `/onboarding` → `organization_access_requests`.
 * Esta tela apenas encaminha o usuário para o fluxo correto.
 * Sem dependência do Supabase legado.
 */
import { Link, useNavigate } from "react-router-dom";

const WHATSAPP_URL =
  "https://wa.me/5518997469865?text=" +
  encodeURIComponent("Olá! Quero solicitar acesso ao Roxou Partner Pro.");

const PartnerRequestAccessPage = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-6 bg-background">
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
