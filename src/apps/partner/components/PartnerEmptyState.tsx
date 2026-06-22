/**
 * PartnerEmptyState — Fase 9D
 * Aceita CTA secundário opcional para acelerar próximos passos.
 */
import { Link } from "react-router-dom";
import { ArrowRight, Store } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaTo?: string;
  onCta?: () => void;
}

export function PartnerEmptyState({
  title = "Nenhum estabelecimento vinculado",
  description = "Sua conta ainda não está conectada a um estabelecimento parceiro. Solicite acesso à equipe Roxou.",
  ctaLabel,
  ctaTo,
  onCta,
}: Props) {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
          <Store className="h-6 w-6" />
        </div>
        <h2 className="mt-3 text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
        {ctaLabel && (ctaTo || onCta) ? (
          <div className="mt-4 flex justify-center">
            {ctaTo ? (
              <Button asChild size="sm" variant="outline" className="min-h-[40px]">
                <Link to={ctaTo}>
                  {ctaLabel} <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={onCta} className="min-h-[40px]">
                {ctaLabel} <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default PartnerEmptyState;
