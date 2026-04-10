import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Car, Users, Clock, Info, LogIn, Shield } from "lucide-react";
import LegalDisclaimer from "@/components/v3/LegalDisclaimer";
import { Button } from "@/components/ui/button";
import { useV3Profile } from "@/hooks/useV3Profile";

function AuthGate() {
  return (
    <div className="p-6 rounded-2xl bg-card border border-border/40 text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto">
        <LogIn className="w-7 h-7 text-primary" />
      </div>
      <h2 className="font-display font-bold text-lg text-foreground">Entre para continuar</h2>
      <p className="text-sm text-muted-foreground">
        Motoristas precisam de conta para oferecer corridas. Passageiros podem criar pedidos sem login.
      </p>
      <Link to="/v3/auth?redirect=/v3/transporte">
        <Button className="w-full h-12 rounded-xl font-semibold text-sm">
          Entrar ou criar conta
        </Button>
      </Link>
    </div>
  );
}

function TermsGate() {
  return (
    <div className="p-6 rounded-2xl bg-card border border-border/40 text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto">
        <Shield className="w-7 h-7 text-primary" />
      </div>
      <h2 className="font-display font-bold text-lg text-foreground">Aceite os Termos</h2>
      <p className="text-sm text-muted-foreground">
        Para usar o Roxou Transporte, você precisa aceitar nossos termos de uso e política de privacidade.
      </p>
      <Link to="/v3/terms-acceptance">
        <Button className="w-full h-12 rounded-xl font-semibold text-sm">
          Aceitar termos
        </Button>
      </Link>
    </div>
  );
}

export default function V3Transport() {
  const [searchParams] = useSearchParams();
  const eventName = searchParams.get("event") || "";
  const venueName = searchParams.get("venue") || "";
  const { user, loading, isDriver, hasAcceptedTerms } = useV3Profile();

  // Driver must be logged in and have accepted terms
  const driverBlocked = !user;
  const termsBlocked = user && !hasAcceptedTerms;

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
        {/* Passenger card — always available */}
        <div className="p-4 rounded-xl bg-card border border-border/40 space-y-2">
          <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
            <Car className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-display font-semibold text-sm text-foreground">Preciso de carona</h3>
          <p className="text-[11px] text-muted-foreground">Crie um pedido e motoristas conectam com você</p>
          <Button size="sm" className="w-full mt-1 rounded-lg text-xs h-8">
            Pedir carona
          </Button>
        </div>

        {/* Driver card — gated */}
        <div className="p-4 rounded-xl bg-card border border-border/40 space-y-2">
          <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center">
            <Users className="w-5 h-5 text-accent" />
          </div>
          <h3 className="font-display font-semibold text-sm text-foreground">Sou motorista</h3>
          <p className="text-[11px] text-muted-foreground">Veja pedidos próximos e ofereça corridas</p>
          {driverBlocked ? (
            <Link to="/v3/auth?redirect=/v3/transporte">
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
            <Button size="sm" variant="secondary" className="w-full mt-1 rounded-lg text-xs h-8">
              Ver pedidos
            </Button>
          )}
        </div>
      </div>

      {/* Auth/Terms gate banners for drivers */}
      {driverBlocked && <AuthGate />}
      {termsBlocked && <TermsGate />}

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
