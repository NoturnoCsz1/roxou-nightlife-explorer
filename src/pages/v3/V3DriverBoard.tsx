import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useV3Profile } from "@/hooks/useV3Profile";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Clock, Users, MessageCircle, Check, Loader2, X, ShieldCheck, WalletCards, Flag, Activity } from "lucide-react";
import LegalDisclaimer from "@/components/v3/LegalDisclaimer";
import ReportDialog from "@/components/v3/ReportDialog";
import { getRideAvailabilityText, isRideWindowClosed, RIDE_EXPIRED_MESSAGE } from "@/lib/rideTimeRules";
import { formatLocation } from "@shared/utils/locationDisplay";
import type { Tables } from "@/integrations/supabase/types";

function timeAgoPt(iso: string | null | undefined): string {
  if (!iso) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return "agora";
  const m = Math.floor(diffSec / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} d`;
}

type RideRequest = Tables<"ride_requests">;
type RideOffer = Tables<"ride_offers">;

export default function V3DriverBoard() {
  const { user, isDriver, hasAcceptedTerms, loading: profileLoading } = useV3Profile();
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingOffer, setSendingOffer] = useState<string | null>(null);
  const [updatingOffer, setUpdatingOffer] = useState<string | null>(null);
  const [myOfferIds, setMyOfferIds] = useState<Set<string>>(new Set());
  const [offersByRequest, setOffersByRequest] = useState<Record<string, RideOffer[]>>({});

  useEffect(() => {
    if (profileLoading || !user) return;
    loadData();
  }, [user, profileLoading]);

  const loadData = async () => {
    setLoading(true);
    const [reqRes, offersRes] = await Promise.all([
      supabase.from("ride_requests").select("*").eq("status", "open").gte("event_date", new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()).order("created_at", { ascending: false }),
      supabase.from("ride_offers").select("*").eq("driver_id", user!.id),
    ]);
    setRequests(reqRes.data || []);
    const offerData = offersRes.data || [];
    setMyOfferIds(new Set(offerData.map((o) => o.ride_request_id)));
    const grouped: Record<string, RideOffer[]> = {};
    offerData.forEach((o) => {
      if (!grouped[o.ride_request_id]) grouped[o.ride_request_id] = [];
      grouped[o.ride_request_id].push(o);
    });
    setOffersByRequest(grouped);
    setLoading(false);
  };

  const sendOffer = async (requestId: string) => {
    setSendingOffer(requestId);
    try {
      if (!isDriver) throw new Error("Apenas motoristas validados podem oferecer carona.");
      const request = requests.find((r) => r.id === requestId);
      if (isRideWindowClosed(request?.event_date)) throw new Error(RIDE_EXPIRED_MESSAGE);
      if ((request as any)?.seats_available > 4) throw new Error("Limite máximo de 4 vagas por carro.");
      const { error } = await supabase.from("ride_offers").insert({
        ride_request_id: requestId,
        driver_id: user!.id,
        message: "Posso te levar!",
      } as any);
      if (error) throw error;
      setMyOfferIds((prev) => new Set(prev).add(requestId));
      toast.success("Proposta enviada!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar proposta");
    } finally {
      setSendingOffer(null);
    }
  };

  const updateOfferStatus = async (offerId: string, status: "accepted" | "cancelled") => {
    setUpdatingOffer(offerId);
    try {
      const { error } = await supabase.from("ride_offers").update({ status }).eq("id", offerId);
      if (error) throw error;
      setOffersByRequest((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((requestId) => {
          next[requestId] = next[requestId].map((offer) => offer.id === offerId ? { ...offer, status } : offer);
        });
        return next;
      });
      toast.success(status === "accepted" ? "Passageiro aceito" : "Passageiro recusado");
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar proposta");
    } finally {
      setUpdatingOffer(null);
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
        <Link to="/auth?redirect=/motorista">
          <Button className="rounded-xl">Entrar</Button>
        </Link>
      </div>
    );
  }

  if (!hasAcceptedTerms) {
    return (
      <div className="px-4 py-6 max-w-md mx-auto space-y-4 text-center">
        <p className="text-muted-foreground">Aceite os termos para continuar.</p>
        <Link to="/terms-acceptance">
          <Button className="rounded-xl">Aceitar termos</Button>
        </Link>
      </div>
    );
  }

  if (!isDriver) {
    return (
      <div className="px-4 py-6 max-w-md mx-auto space-y-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-7 h-7 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">Apenas perfis Motorista validados podem acessar o DriverDash.</p>
        <Link to="/perfil">
          <Button className="rounded-xl">Voltar ao perfil</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-md mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/transporte" className="p-2 -ml-2 rounded-xl hover:bg-card transition-colors">
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
            const closed = isRideWindowClosed(req.event_date);
            return (
              <div key={req.id} className="relative overflow-hidden p-4 rounded-2xl v3-glass border border-primary/15 space-y-3 shadow-[0_0_32px_hsl(var(--primary)/0.08)]">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
                {req.event_name && (
                  <p className="font-display font-semibold text-sm text-foreground">{req.event_name}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${closed ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-primary/25 bg-primary/10 text-primary"}`}>
                    <Clock className="w-3 h-3" /> {closed ? "Período de caronas encerrado" : getRideAvailabilityText(req.event_date)}
                  </div>
                  {!closed && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-300">
                      <Activity className="w-3 h-3" /> Pedido ativo · {timeAgoPt(req.created_at)}
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {(() => {
                    const display = formatLocation(req.pickup_address);
                    const approx = (req as any).pickup_is_approximate === true || (req.origin_lat == null || req.origin_lng == null);
                    return (
                      <div className="flex items-start gap-2 text-xs text-muted-foreground flex-wrap">
                        <MapPin className="w-3.5 h-3.5 text-primary mt-0.5" />
                        <span>Embarque: {display}</span>
                        {approx && (
                          <>
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-300">
                              Ponto aproximado
                            </span>
                            <span className="text-[10px] text-amber-300/80">Confirmar local exato no chat</span>
                          </>
                        )}
                      </div>
                    );
                  })()}
                  {(() => {
                    const destApprox = (req as any).destination_is_approximate === true || (req.destination_lat == null || req.destination_lng == null);
                    return (
                      <div className="flex items-start gap-2 text-xs text-muted-foreground flex-wrap">
                        <MapPin className="w-3.5 h-3.5 text-primary mt-0.5" />
                        <span>Destino: {formatLocation(req.destination_address, req.venue_name)}</span>
                        {destApprox && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-300">
                            Destino aproximado
                          </span>
                        )}
                      </div>
                    );
                  })()}
                  {req.event_date && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(req.event_date).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    <span>Solicitação ativa</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <WalletCards className="w-3.5 h-3.5" />
                    <span>
                      {(() => {
                        const note = ((req as any).price_note || "").trim();
                        const placeholders = [
                          "",
                          "a combinar com o passageiro",
                          "valor final combinado no chat",
                          "combinado no chat",
                          "a combinar",
                        ];
                        if (placeholders.includes(note.toLowerCase())) {
                          return "Valor a combinar no chat";
                        }
                        return `Valor sugerido: ${note}`;
                      })()}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    A Roxou apenas conecta passageiros e motoristas. O valor e os detalhes devem ser combinados entre as partes.
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {Array.from({ length: 4 }).map((_, i) => {
                    const total = Math.min(4, (req as any).seats_available || req.passengers_count || 1);
                    const reqOffers = offersByRequest[req.id] || [];
                    const accepted = reqOffers.filter((o) => o.status === "accepted").length;
                    const pending = reqOffers.filter((o) => o.status === "pending").length;
                    const state = i >= total ? "hidden" : i < accepted ? "Ocupada" : i < accepted + pending ? "Pendente" : "Livre";
                    return (
                      <span key={i} className={`rounded-full border px-2 py-1 text-center text-[9px] font-bold uppercase ${
                        state === "Ocupada" ? "border-primary/50 bg-primary/20 text-primary" : state === "Pendente" ? "border-accent/50 bg-accent/15 text-accent" : state === "Livre" ? "border-white/10 bg-white/5 text-muted-foreground" : "opacity-20 border-white/5 bg-white/5 text-muted-foreground"
                      }`}>
                        {state}
                      </span>
                    );
                  })}
                </div>
                {req.notes && (
                  <p className="text-xs text-muted-foreground italic">"{req.notes}"</p>
                )}
                {(offersByRequest[req.id] || []).filter((offer) => (offer as any).passenger_id).map((offer) => (
                  <div key={offer.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">Passageiro solicitou a vaga</p>
                      <p className="text-[10px] text-muted-foreground">Status: {offer.status === "accepted" ? "aceito" : offer.status === "cancelled" ? "recusado" : "pendente"}</p>
                    </div>
                    {offer.status === "pending" && (
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => updateOfferStatus(offer.id, "accepted")} disabled={updatingOffer === offer.id} className="h-8 rounded-lg px-2 text-[10px]"><Check className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => updateOfferStatus(offer.id, "cancelled")} disabled={updatingOffer === offer.id} className="h-8 rounded-lg px-2 text-[10px] text-destructive"><X className="w-3 h-3" /></Button>
                      </div>
                    )}
                  </div>
                ))}
                <div className="flex gap-2">
                  {alreadyOffered ? (
                    <Link to={`/chat/${req.id}`} className="flex-1">
                      <Button size="sm" variant="secondary" className="w-full rounded-lg text-xs h-9 gap-1.5">
                        <MessageCircle className="w-3.5 h-3.5" /> Chat
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => sendOffer(req.id)}
                      disabled={sendingOffer === req.id || closed}
                      className="flex-1 rounded-lg text-xs h-9 gap-1.5"
                    >
                      {sendingOffer === req.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      {closed ? "Encerrado" : "Tenho interesse"}
                    </Button>
                  )}
                </div>
                <div className="flex justify-end pt-1">
                  <ReportDialog
                    rideRequestId={req.id}
                    targetUserId={req.passenger_id}
                    reportType="passenger"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
