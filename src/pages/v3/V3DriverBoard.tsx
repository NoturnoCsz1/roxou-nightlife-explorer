import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useV3Profile } from "@/hooks/useV3Profile";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Clock, Users, MessageCircle, Check, Loader2 } from "lucide-react";
import LegalDisclaimer from "@/components/v3/LegalDisclaimer";
import type { Tables } from "@/integrations/supabase/types";

type RideRequest = Tables<"ride_requests">;

export default function V3DriverBoard() {
  const { user, isDriver, hasAcceptedTerms, loading: profileLoading } = useV3Profile();
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingOffer, setSendingOffer] = useState<string | null>(null);
  const [myOfferIds, setMyOfferIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (profileLoading || !user) return;
    loadData();
  }, [user, profileLoading]);

  const loadData = async () => {
    setLoading(true);
    const [reqRes, offersRes] = await Promise.all([
      supabase.from("ride_requests").select("*").eq("status", "open").order("created_at", { ascending: false }),
      supabase.from("ride_offers").select("ride_request_id").eq("driver_id", user!.id),
    ]);
    setRequests(reqRes.data || []);
    setMyOfferIds(new Set((offersRes.data || []).map((o) => o.ride_request_id)));
    setLoading(false);
  };

  const sendOffer = async (requestId: string) => {
    setSendingOffer(requestId);
    try {
      const { error } = await supabase.from("ride_offers").insert({
        ride_request_id: requestId,
        driver_id: user!.id,
        message: "Posso te levar!",
      });
      if (error) throw error;
      setMyOfferIds((prev) => new Set(prev).add(requestId));
      toast.success("Proposta enviada!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar proposta");
    } finally {
      setSendingOffer(null);
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
      <div className="px-4 py-6 max-w-md mx-auto space-y-4 text-center">
        <p className="text-muted-foreground">Você precisa estar logado.</p>
        <Link to="/v3/auth?redirect=/v3/motorista">
          <Button className="rounded-xl">Entrar</Button>
        </Link>
      </div>
    );
  }

  if (!hasAcceptedTerms) {
    return (
      <div className="px-4 py-6 max-w-md mx-auto space-y-4 text-center">
        <p className="text-muted-foreground">Aceite os termos para continuar.</p>
        <Link to="/v3/terms-acceptance">
          <Button className="rounded-xl">Aceitar termos</Button>
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
          <h1 className="font-display font-bold text-xl text-foreground">Pedidos disponíveis</h1>
          <p className="text-xs text-muted-foreground">Aceite pedidos e ofereça corridas</p>
        </div>
      </div>

      <LegalDisclaimer />

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-10 space-y-2">
          <p className="text-muted-foreground text-sm">Nenhum pedido disponível agora</p>
          <p className="text-xs text-muted-foreground">Volte mais tarde!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const alreadyOffered = myOfferIds.has(req.id);
            return (
              <div key={req.id} className="p-4 rounded-xl bg-card border border-border/40 space-y-3">
                {req.event_name && (
                  <p className="font-display font-semibold text-sm text-foreground">{req.event_name}</p>
                )}
                <div className="space-y-1.5">
                  {req.pickup_address && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      <span>De: {req.pickup_address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>Para: {req.destination_address || req.venue_name || "—"}</span>
                  </div>
                  {req.event_date && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(req.event_date).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    <span>{req.passengers_count} passageiro{req.passengers_count > 1 ? "s" : ""}</span>
                  </div>
                </div>
                {req.notes && (
                  <p className="text-xs text-muted-foreground italic">"{req.notes}"</p>
                )}
                <div className="flex gap-2">
                  {alreadyOffered ? (
                    <Link to={`/v3/chat/${req.id}`} className="flex-1">
                      <Button size="sm" variant="secondary" className="w-full rounded-lg text-xs h-9 gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5" /> Chat
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => sendOffer(req.id)}
                      disabled={sendingOffer === req.id}
                      className="flex-1 rounded-lg text-xs h-9 gap-1.5"
                    >
                      {sendingOffer === req.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      Aceitar corrida
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
