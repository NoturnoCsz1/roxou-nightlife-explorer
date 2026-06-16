/**
 * PartnerScopedComingSoon — Fase 10F
 *
 * Placeholder para rotas reservadas do parceiro (arquitetura preparada):
 *   /:partnerSlug/eventos
 *   /:partnerSlug/eventos/:eventSlug
 *   /:partnerSlug/mesas
 *   /:partnerSlug/reservas
 *
 * Mantém URL amigável e responde com "em breve" sem quebrar SPA.
 */
import { useParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";

const labels: Record<string, string> = {
  eventos: "Eventos",
  mesas: "Reserva de Mesas",
  reservas: "Reservas",
};

const PartnerScopedComingSoon = ({ section }: { section: string }) => {
  const { partnerSlug } = useParams<{ partnerSlug: string }>();
  const label = labels[section] ?? "Em breve";
  return (
    <main className="min-h-screen w-full bg-background flex items-center justify-center px-4 overflow-x-hidden">
      <SEO title={`${label} | ${partnerSlug ?? ""}`} description={`${label} do estabelecimento.`} />
      <Card className="w-full max-w-md p-6 text-center space-y-3">
        <p className="text-xs uppercase tracking-wide text-primary">{partnerSlug}</p>
        <h1 className="text-xl font-bold">{label}</h1>
        <p className="text-sm text-muted-foreground">
          Esta área será habilitada em breve para este estabelecimento.
        </p>
        <Button asChild variant="outline">
          <Link to={`/${partnerSlug}/vip`}>Ir para Lista VIP</Link>
        </Button>
      </Card>
    </main>
  );
};

export default PartnerScopedComingSoon;
