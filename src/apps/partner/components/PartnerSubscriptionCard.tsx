/**
 * PartnerSubscriptionCard — Fase 9D
 */
import { Card, CardContent } from "@/components/ui/card";
import type { PartnerSubscription } from "../services/partnerAuth";

const PLAN_LABEL: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  premium: "Premium",
  enterprise: "Enterprise",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Ativo",
  trial: "Trial",
  past_due: "Pagamento pendente",
  canceled: "Cancelado",
  expired: "Expirado",
};

export function PartnerSubscriptionCard({
  subscription,
}: {
  subscription: PartnerSubscription | null;
}) {
  const plan = subscription?.plan ?? "free";
  const status = subscription?.status ?? "active";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Plano</div>
            <div className="text-lg font-semibold">{PLAN_LABEL[plan] ?? plan}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Status</div>
            <div className="text-sm">{STATUS_LABEL[status] ?? status}</div>
          </div>
        </div>
        {subscription?.expires_at ? (
          <div className="text-[11px] text-muted-foreground mt-2">
            Expira em {new Date(subscription.expires_at).toLocaleDateString("pt-BR")}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default PartnerSubscriptionCard;
