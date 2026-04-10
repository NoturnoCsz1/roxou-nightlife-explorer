import { useSearchParams, Link } from "react-router-dom";
import { Car, Users, Clock, Info, LogIn, Shield, ClipboardList } from "lucide-react";
import LegalDisclaimer from "@/components/v3/LegalDisclaimer";
import { Button } from "@/components/ui/button";
import { useV3Profile } from "@/hooks/useV3Profile";

export default function V3Transport() {
  const [searchParams] = useSearchParams();
  const eventName = searchParams.get("event") || "";
  const venueName = searchParams.get("venue") || "";
  const eventDate = searchParams.get("date") || "";
  const { user, loading, hasAcceptedTerms } = useV3Profile();

  const driverBlocked = !user;
  const termsBlocked = user && !hasAcceptedTerms;

  // Build passenger request URL with pre-fill params
  const rideParams = new URLSearchParams();
  if (eventName) rideParams.set("event", eventName);
  if (venueName) rideParams.set("venue", venueName);
  if (eventDate) rideParams.set("date", eventDate);
  const rideUrl = `/v3/pedir-carona${rideParams.toString() ? `?${rideParams}` : ""}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="font-display font-bold text-2xl text-foreground">Roxou Transporte</h1>
        <p className="text-sm text-muted-foreground">Conecte-se com motoristas para ir ao rolê</p>
      </div>

      <LegalDisclaimer />

      {/* Pre-filled event info */}
      {eventName && (
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/15 space-y-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary">Carona para evento</span>
          </div>
          <p className="font-display font-semibold text-sm text-foreground">{eventName}</p>
          {venueName && <p className="text-xs text-muted-foreground">📍 {venueName}</p>}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        {/* Passenger card */}
        <div className="p-4 rounded-xl bg-card border border-border/40 space-y-2">
          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
            <Car className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-display font-semibold text-sm text-foreground">Preciso de carona</h3>
          <p className="text-[11px] text-muted-foreground">Crie um pedido e motoristas conectam com você</p>
          <Link to={rideUrl}>
            <Button size="sm" className="w-full mt-1 rounded-lg text-xs h-8">
              Pedir carona
            </Button>
          </Link>
        </div>

        {/* Driver card */}
        <div className="p-4 rounded-xl bg-card border border-border/40 space-y-2">
          <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center">
            <Users className="w-5 h-5 text-accent" />
          </div>
          <h3 className="font-display font-semibold text-sm text-foreground">Sou motorista</h3>
          <p className="text-[11px] text-muted-foreground">Veja pedidos próximos e ofereça corridas</p>
          {driverBlocked ? (
            <Link to="/v3/auth?redirect=/v3/motorista">
              <Button size="sm" variant="secondary" className="w-full mt-1 rounded-lg text-xs h-8">
                Entrar
              </Button>
            </Link>
          ) : termsBlocked ? (
            <Link to="/v3/terms-acceptance">
              <Button size="sm" variant="secondary" className="w-full mt-1 rounded-lg text-xs h-8">
                Aceitar termos
              </Button>
            </Link>
          ) : (
            <Link to="/v3/motorista">
              <Button size="sm" variant="secondary" className="w-full mt-1 rounded-lg text-xs h-8">
                Ver pedidos
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="space-y-3">
        <h2 className="font-display font-semibold text-base text-foreground">Como funciona</h2>
        {[
          { icon: Car, title: "Crie um pedido", desc: "Informe destino e horário" },
          { icon: Users, title: "Motoristas conectam", desc: "Receba propostas de motoristas" },
          { icon: Clock, title: "Combine os detalhes", desc: "Converse pelo chat integrado" },
        ].map(({ icon: Icon, title, desc }, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
              {i + 1}
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">{title}</p>
              <p className="text-[11px] text-muted-foreground">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Legal links */}
      <div className="flex gap-4 justify-center pt-2">
        <Link to="/v3/terms" className="text-[11px] text-muted-foreground hover:text-primary transition-colors">
          Termos de uso
        </Link>
        <Link to="/v3/privacy" className="text-[11px] text-muted-foreground hover:text-primary transition-colors">
          Política de privacidade
        </Link>
      </div>
    </div>
  );
}
