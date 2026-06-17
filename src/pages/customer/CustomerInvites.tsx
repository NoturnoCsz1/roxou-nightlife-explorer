/**
 * CustomerInvites — placeholder "Em breve" para convites/ingressos.
 */
import { Link, Navigate } from "react-router-dom";
import { Ticket, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import { useCustomerSession } from "@/hooks/useCustomerSession";

const CustomerInvites = () => {
  const { user, loading } = useCustomerSession();

  if (loading) {
    return (
      <main className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </main>
    );
  }
  if (!user) {
    return (
      <Navigate
        to="/cliente/login?redirect=%2Fcliente%2Fmeus-convites"
        replace
      />
    );
  }

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-background">
      <SEO
        title="Meus convites | Roxou"
        description="Convites e ingressos pagos — em breve."
      />
      <div className="mx-auto w-full max-w-md space-y-4 px-4 py-6">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-primary">
            Minha conta
          </p>
          <h1 className="text-2xl font-bold">Meus convites</h1>
        </header>

        <Card className="space-y-3 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Ticket className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold">Em breve</h2>
          <p className="text-sm text-muted-foreground">
            Em breve você poderá comprar e gerenciar convites e ingressos
            diretamente aqui.
          </p>
          <Button asChild variant="outline" className="min-h-[44px]">
            <Link to="/cliente/minhas-reservas">Ver minhas reservas</Link>
          </Button>
        </Card>
      </div>
    </main>
  );
};

export default CustomerInvites;
