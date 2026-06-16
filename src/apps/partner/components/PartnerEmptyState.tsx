/**
 * PartnerEmptyState — Fase 9D
 */
import { Store } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function PartnerEmptyState({
  title = "Nenhum estabelecimento vinculado",
  description = "Sua conta ainda não está conectada a um estabelecimento parceiro. Solicite acesso à equipe Roxou.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
          <Store className="h-6 w-6" />
        </div>
        <h2 className="mt-3 text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

export default PartnerEmptyState;
