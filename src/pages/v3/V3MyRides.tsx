import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useV3Profile } from "@/hooks/useV3Profile";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle, X, Clock, Check, Loader2, Car } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type RideRequest = Tables<"ride_requests">;
type RideOffer = Tables<"ride_offers">;

const statusLabels: Record<string, { label: string; color: string }> = {
  open: { label: "Aberto", color: "bg-primary/20 text-primary" },
  accepted: { label: "Aceito", color: "bg-green-500/20 text-green-400" },
  cancelled: { label: "Cancelado", color: "bg-muted text-muted-foreground" },
  completed: { label: "Concluído", color: "bg-green-500/20 text-green-400" },
};

export default function V3MyRides() {
  const { user, loading: profileLoading } = useV3Profile();
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [offers, setOffers] = useState<Record<string, RideOffer[]>>({});
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    if (profileLoading || !user) return;
    loadData();
  }, [user, profileLoading]);

  const loadData = async () => {
    setLoading(true);
    const { data: reqs } = await supabase
      .from("ride_requests")
      .select("*")
      .eq("passenger_id", user!.id)
      .order("created_at", { ascending: false });

    const myRequests = reqs || [];
    setRequests(myRequests);

    if (myRequests.length > 0) {
      const ids = myRequests.map((r) => r.id);
      const { data: offerData } = await supabase
        .from("ride_offers")
        .select("*")
        .in("ride_request_id", ids)
        .order("created_at", { ascending: true });

      const grouped: Record<string, RideOffer[]> = {};
      (offerData || []).forEach((o) => {
        if (!grouped[o.ride_request_id]) grouped[o.ride_request_id] = [];
        grouped[o.ride_request_id].push(o);
      });
      setOffers(grouped);
    }
    setLoading(false);
  };

  const cancelRequest = async (id: string) => {
    setCancelling(id);
    try {
      const { error } = await supabase
        .from("ride_requests")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw error;
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "cancelled" } : r));
      toast.success("Pedido cancelado");
    } catch (err: any) {
      toast.error(err.message || "Erro ao cancelar");
    } finally {
      setCancelling(null);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="px-4 py-6 max-w-md mx-auto text-center space-y-4">
        <p className="text-muted-foreground text-sm">Faça login para ver seus pedidos.</p>
        <Link to="/v3/auth?redirect=/v3/meus-pedidos">
          <Button className="rounded-xl">Entrar</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-md mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/v3/transporte" className="p-2 -ml-2 rounded-xl hover:bg-card transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="font-display font-bold text-xl text-foreground">Meus pedidos</h1>
          <p className="text-xs text-muted-foreground">Acompanhe suas caronas</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-10 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Car className="w-7 h-7 text-primary" />
          </div>
          <p className="text-muted-foreground text-sm">Você ainda não pediu nenhuma carona</p>
          <Link to="/v3/pedir-carona">
            <Button className="rounded-xl text-sm">Pedir carona</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const reqOffers = offers[req.id] || [];
            const status = statusLabels[req.status] || statusLabels.open;

            return (
              <div key={req.id} className="p-4 rounded-xl bg-card border border-border/40 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <p className="font-display font-semibold text-sm text-foreground">
                    {req.event_name || req.destination_address || "Carona"}
                  </p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.color}`}>
                    {status.label}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1 text-xs text-muted-foreground">
                  {req.pickup_address && <p>📍 De: {req.pickup_address}</p>}
                  <p>📍 Para: {req.destination_address || req.venue_name}</p>
                  {req.event_date && (
                    <p>🕐 {new Date(req.event_date).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>
                  )}
                  <p>👥 {req.passengers_count} passageiro{req.passengers_count > 1 ? "s" : ""}</p>
                </div>

                {/* Offers */}
                {reqOffers.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-primary" />
                      {reqOffers.length} proposta{reqOffers.length > 1 ? "s" : ""} recebida{reqOffers.length > 1 ? "s" : ""}
                    </p>
                    {reqOffers.map((offer) => (
                      <div key={offer.id} className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground font-medium truncate">
                            {offer.message || "Motorista disponível"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(offer.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                          </p>
                        </div>
                        <Link to={`/v3/chat/${req.id}`}>
                          <Button size="sm" variant="ghost" className="h-7 px-2 rounded-lg text-xs gap-1">
                            <MessageCircle className="w-3.5 h-3.5" /> Chat
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}

                {/* No offers yet */}
                {reqOffers.length === 0 && req.status === "open" && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Aguardando propostas de motoristas...</span>
                  </div>
                )}

                {/* Actions */}
                {req.status === "open" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => cancelRequest(req.id)}
                    disabled={cancelling === req.id}
                    className="text-xs text-muted-foreground hover:text-destructive gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    {cancelling === req.id ? "Cancelando..." : "Cancelar pedido"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
