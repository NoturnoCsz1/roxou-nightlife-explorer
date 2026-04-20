import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Car, Users, Clock, Info, ClipboardList, Snowflake, Wifi, Headphones, ShieldCheck, Sparkles } from "lucide-react";
import LegalDisclaimer from "@/components/v3/LegalDisclaimer";
import { Button } from "@/components/ui/button";
import { useV3Profile } from "@/hooks/useV3Profile";
import { V3PageSkeleton } from "@/components/v3/V3Skeletons";

interface MockRoute {
  label: string;
  from: string;
  to: string;
  time: string;
  price: string;
  occupancy: number; // 0-100
}

const MOCK_ROUTES: MockRoute[] = [
  { label: "🌙 Madrugada VIP", from: "Centro de Prudente", to: "Balada / Casas Noturnas", time: "23h - 04h", price: "R$ 18", occupancy: 78 },
  { label: "🎤 Show Premium", from: "Bairros Zona Norte", to: "Casa de Show / Festivais", time: "20h - 23h", price: "R$ 22", occupancy: 54 },
  { label: "🍻 Bar Hopping", from: "Multi-pontos", to: "Bares & Pubs", time: "21h - 02h", price: "R$ 15", occupancy: 91 },
];

function OccupancyBar({ value }: { value: number }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(value), 80);
    return () => clearTimeout(t);
  }, [value]);
  const isHot = value >= 80;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider">
        <span className="text-muted-foreground">Lotação da van</span>
        <span className={isHot ? "text-destructive" : "text-foreground/80"}>
          {value}% {isHot && "· últimas vagas"}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden border border-white/5">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${w}%`,
            background:
              "linear-gradient(90deg, hsl(var(--v3-neon)), hsl(var(--v3-neon-soft)))",
            boxShadow: "0 0 12px hsl(var(--v3-neon) / 0.6)",
          }}
        />
      </div>
    </div>
  );
}

function RouteCard({ route }: { route: MockRoute }) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-4 v3-glass v3-neon-hover">
      {/* Black Membership shine */}
      <div className="absolute -top-1/2 -right-1/4 w-[200px] h-[200px] rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--v3-neon) / 0.6), transparent 70%)" }} />

      <div className="relative space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-display font-extrabold text-[13px] uppercase tracking-wider text-foreground">
              {route.label}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {route.from} → {route.to}
            </p>
          </div>
          <span className="shrink-0 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-foreground/90">
            {route.price}
          </span>
        </div>

        {/* Perks */}
        <div className="flex items-center gap-3 text-muted-foreground/80">
          <div className="flex items-center gap-1 text-[10px]"><Snowflake className="w-3 h-3 text-primary/80" /> Ar</div>
          <div className="flex items-center gap-1 text-[10px]"><Wifi className="w-3 h-3 text-primary/80" /> Wi-Fi</div>
          <div className="flex items-center gap-1 text-[10px]"><Headphones className="w-3 h-3 text-primary/80" /> Playlist</div>
          <div className="flex items-center gap-1 text-[10px] ml-auto"><Clock className="w-3 h-3" /> {route.time}</div>
        </div>

        <OccupancyBar value={route.occupancy} />
      </div>
    </div>
  );
}

export default function V3Transport() {
  const [searchParams] = useSearchParams();
  const eventName = searchParams.get("event") || "";
  const venueName = searchParams.get("venue") || "";
  const eventDate = searchParams.get("date") || "";
  const { user, loading, hasAcceptedTerms } = useV3Profile();

  const driverBlocked = !user;
  const termsBlocked = user && !hasAcceptedTerms;

  const rideParams = new URLSearchParams();
  if (eventName) rideParams.set("event", eventName);
  if (venueName) rideParams.set("venue", venueName);
  if (eventDate) rideParams.set("date", eventDate);
  const rideUrl = `/v3/pedir-carona${rideParams.toString() ? `?${rideParams}` : ""}`;

  if (loading) return <V3PageSkeleton />;

  return (
    <div className="space-y-6">
      {/* ─── HERO CINEMATOGRÁFICO ─── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, hsl(var(--v3-neon) / 0.28), transparent 60%), radial-gradient(ellipse at 80% 90%, hsl(var(--v3-neon-soft) / 0.18), transparent 65%)",
          }}
        />
        <div
          className="absolute inset-0 -z-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative px-5 pt-10 pb-8 space-y-4">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full v3-glass text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="w-3 h-3" /> Roxou Transporte
          </span>
          <h1 className="font-display font-black text-[28px] leading-[1.05] text-foreground uppercase tracking-tight">
            Sua única preocupação <br />
            <span className="v3-neon-text text-primary">é curtir.</span> O resto <br />
            é com a gente.
          </h1>
          <p className="text-[12px] text-muted-foreground/90 max-w-[280px] leading-relaxed">
            Carona segura, ar-condicionado, Wi-Fi e playlist. Vans premium conectando você ao melhor do role.
          </p>

          <div className="flex items-center gap-2 pt-2">
            <Link to={rideUrl} className="flex-1">
              <Button
                className="w-full h-11 rounded-xl border-0 text-[12px] font-bold uppercase tracking-wider text-white v3-pulse-glow"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(var(--v3-neon)), hsl(var(--v3-neon-soft)))",
                }}
              >
                <Car className="w-4 h-4 mr-1" /> Pedir carona
              </Button>
            </Link>
            <Link to="/v3/terms" className="shrink-0">
              <Button
                variant="ghost"
                className="h-11 rounded-xl v3-glass text-[11px] font-semibold uppercase tracking-wider text-foreground/80 hover:text-foreground"
              >
                <ShieldCheck className="w-4 h-4 mr-1" /> Termos
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <div className="px-4 space-y-6">
        <LegalDisclaimer />

        {/* Pre-filled event info */}
        {eventName && (
          <div className="p-4 rounded-2xl v3-glass space-y-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-primary">Carona para evento</span>
            </div>
            <p className="font-display font-semibold text-sm text-foreground">{eventName}</p>
            {venueName && <p className="text-xs text-muted-foreground">📍 {venueName}</p>}
          </div>
        )}

        {/* ─── ROTAS PREMIUM ─── */}
        <div className="space-y-3">
          <div>
            <h2 className="font-display font-extrabold text-base text-foreground uppercase tracking-wide">
              Rotas da noite
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Lotação atualizada · pegue antes que esgote
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {MOCK_ROUTES.map((r) => (
              <RouteCard key={r.label} route={r} />
            ))}
          </div>
        </div>

        {/* Quick Actions — Passenger / Driver */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl v3-glass space-y-2 v3-neon-hover">
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

          <div className="p-4 rounded-2xl v3-glass space-y-2 v3-neon-hover">
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

        {/* My rides */}
        {user && (
          <Link to="/v3/meus-pedidos" className="flex items-center gap-3 p-4 rounded-2xl v3-glass v3-neon-hover">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-display font-semibold text-sm text-foreground">Meus pedidos</p>
              <p className="text-[11px] text-muted-foreground">Acompanhe suas caronas e propostas</p>
            </div>
          </Link>
        )}

        <div className="space-y-3">
          <h2 className="font-display font-semibold text-base text-foreground">Como funciona</h2>
          {[
            { icon: Car, title: "Crie um pedido", desc: "Informe destino e horário" },
            { icon: Users, title: "Motoristas conectam", desc: "Receba propostas de motoristas" },
            { icon: Clock, title: "Combine os detalhes", desc: "Converse pelo chat integrado" },
          ].map(({ icon: Icon, title, desc }, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-2xl v3-glass">
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

        <div className="flex gap-4 justify-center pt-2 pb-2">
          <Link to="/v3/terms" className="text-[11px] text-muted-foreground hover:text-primary transition-colors">
            Termos de uso
          </Link>
          <Link to="/v3/privacy" className="text-[11px] text-muted-foreground hover:text-primary transition-colors">
            Política de privacidade
          </Link>
        </div>
      </div>
    </div>
  );
}
