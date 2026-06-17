/**
 * CustomerReservations — área protegida do cliente com abas
 * "Reservas" e "Lista VIP". Cada item linka para o comprovante
 * público existente (via public_token).
 */
import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";
import SEO from "@/components/SEO";
import { formatDateTimeSP } from "@/lib/dateUtils";
import { useToast } from "@/hooks/use-toast";
import { useCustomerSession } from "@/hooks/useCustomerSession";
import {
  listMyReservations,
  listMyVipEntries,
  type CustomerReservationRow,
  type CustomerVipEntryRow,
} from "@/services/customerProfile";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  pending_payment: "Aguardando pagamento",
  confirmed: "Confirmada",
  completed: "Check-in feito",
  cancelled: "Cancelada",
  expired: "Expirada",
  no_show: "Não compareceu",
};

const STATUS_CLS: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  pending_payment: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  confirmed: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  completed: "bg-sky-500/15 text-sky-500 border-sky-500/30",
  cancelled: "bg-rose-500/15 text-rose-500 border-rose-500/30",
  expired: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  no_show: "bg-orange-500/15 text-orange-500 border-orange-500/30",
};

const VIP_STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  checked_in: "Check-in feito",
  cancelled: "Cancelada",
  rejected: "Recusada",
};

const CustomerReservations = () => {
  const { user, loading: authLoading } = useCustomerSession();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "vip" ? "vip" : "reservations";
  const [reservations, setReservations] = useState<CustomerReservationRow[]>([]);
  const [vipEntries, setVipEntries] = useState<CustomerVipEntryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, v] = await Promise.all([
        listMyReservations(),
        listMyVipEntries(),
      ]);
      setReservations(r);
      setVipEntries(v);
    } catch (err) {
      toast({
        title: "Erro ao carregar",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!authLoading && user) void load();
  }, [authLoading, user, load]);

  if (authLoading) {
    return (
      <main className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </main>
    );
  }

  if (!user) {
    const redirect = encodeURIComponent("/cliente/minhas-reservas");
    return <Navigate to={`/cliente/login?redirect=${redirect}`} replace />;
  }

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-background">
      <SEO
        title="Minhas reservas | Roxou"
        description="Reservas e listas VIP salvas na sua conta Roxou."
      />
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-6">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-primary">
            Minha conta
          </p>
          <h1 className="text-2xl font-bold">Minhas reservas</h1>
          <p className="text-sm text-muted-foreground">
            Aqui ficam suas reservas e listas VIP salvas.
          </p>
        </header>

        <Tabs
          value={tab}
          onValueChange={(v) => {
            const p = new URLSearchParams(params);
            if (v === "vip") p.set("tab", "vip");
            else p.delete("tab");
            setParams(p, { replace: true });
          }}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="reservations">
              Reservas ({reservations.length})
            </TabsTrigger>
            <TabsTrigger value="vip">
              Lista VIP ({vipEntries.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reservations" className="mt-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : reservations.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                Você ainda não salvou nenhuma reserva.
              </Card>
            ) : (
              reservations.map((r) => (
                <Card key={r.id} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {r.partner?.name ?? "Estabelecimento"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTimeSP(r.reservation_date)} ·{" "}
                        {r.people_count} pess.
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                        STATUS_CLS[r.status] ?? STATUS_CLS.pending
                      }`}
                    >
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </div>
                  {r.total_price ? (
                    <p className="text-xs text-muted-foreground">
                      Total R$ {Number(r.total_price).toFixed(2)}
                      {r.deposit_amount
                        ? ` · sinal R$ ${Number(r.deposit_amount).toFixed(2)}`
                        : ""}
                    </p>
                  ) : null}
                  <div className="pt-1">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/reserva/sucesso/${r.public_token}`}>
                        <ExternalLink className="mr-1 h-3.5 w-3.5" />
                        Abrir comprovante
                      </Link>
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="vip" className="mt-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : vipEntries.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                Você ainda não salvou nenhuma lista VIP.
              </Card>
            ) : (
              vipEntries.map((e) => (
                <Card key={e.id} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {e.partner?.name ?? "Estabelecimento"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Inscrita em {formatDateTimeSP(e.created_at)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {VIP_STATUS_LABEL[e.status] ?? e.status}
                    </span>
                  </div>
                  <div className="pt-1">
                    {e.partner?.slug ? (
                      <Button asChild size="sm" variant="outline">
                        <Link
                          to={`/${e.partner.slug}/vip/sucesso/${e.public_token}`}
                        >
                          <ExternalLink className="mr-1 h-3.5 w-3.5" />
                          Abrir comprovante
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        <div className="flex flex-col items-center gap-1 pt-2 text-center text-xs">
          <Link to="/cliente" className="underline text-muted-foreground">
            ← Voltar para a Conta Roxou
          </Link>
          <Link to="/cliente/minha-conta" className="underline text-muted-foreground">
            Minha conta e preferências
          </Link>
        </div>
      </div>
    </main>
  );
};

export default CustomerReservations;
