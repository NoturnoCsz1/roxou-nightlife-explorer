/**
 * PartnerRequestSuccessPage — Fase 10A.
 *
 * Confirmação curta após envio do formulário. Mantida separada de /pending
 * para futura instrumentação/UX dedicada.
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PartnerRequestSuccessPage = () => (
  <main className="mx-auto max-w-md px-4 py-12 text-center space-y-4">
    <h1 className="text-2xl font-bold">Solicitação enviada!</h1>
    <p className="text-sm text-muted-foreground">
      A equipe Roxou vai validar e liberar seu acesso. Você pode acompanhar
      o status a qualquer momento.
    </p>
    <Button asChild>
      <Link to="/pending">Ver status</Link>
    </Button>
  </main>
);

export default PartnerRequestSuccessPage;
