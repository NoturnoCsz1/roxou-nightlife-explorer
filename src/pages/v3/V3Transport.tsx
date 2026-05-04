import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Car, Users, Clock, Info, ClipboardList, MapPin, ShieldCheck, Sparkles, BadgeCheck } from "lucide-react";
import LegalDisclaimer from "@/components/v3/LegalDisclaimer";
import { Button } from "@/components/ui/button";
import { useV3Profile } from "@/hooks/useV3Profile";
import { V3PageSkeleton } from "@/components/v3/V3Skeletons";
import { toast } from "sonner";
import { getRideAvailabilityText, isRideWindowClosed, RIDE_EXPIRED_MESSAGE } from "@/lib/rideTimeRules";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RealEvent {
  id: string;
  slug: string;
  title: string;
  date_time: string;
  venue_name: string | null;
  address: string | null;
  image_url: string | null;
}

function VerifiedDriverBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
      <BadgeCheck className="w-3 h-3" /> Motorista Verificado ROXOU
    </span>
  );
}

function EventRideCard({ event, isGuest }: { event: RealEvent; isGuest: boolean }) {
  const closed = isRideWindowClosed(event.date_time);
  const availabilityText = getRideAvailabilityText(event.date_time);

  const params = new URLSearchParams();
  params.set("event", event.title);
  if (event.venue_name) params.set("venue", event.venue_name);
  params.set("date", event.date_time);
  const rideUrl = `/v3/pedir-carona?${params.toString()}`;
  const targetUrl = isGuest ? "/v3/perfil" : rideUrl;
  const ctaLabel = closed
    ? "Sistema encerrado"
    : isGuest
    ? "Entrar para solicitar carona"
    : "Solicitar carona pra esse rolê";

  return (
    <div className="relative overflow-hidden rounded-2xl p-4 v3-glass v3-neon-hover">
      <div className="absolute -top-1/2 -right-1/4 w-[200px] h-[200px] rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(var(--v3-neon) / 0.6), transparent 70%)" }} />

      <div className="relative space-y-3">
        <div className="flex items-start gap-3">
          {event.image_url && (
            <img
              src={event.image_url}
              alt={event.title}
              className="w-14 h-14 rounded-xl object-cover ring-1 ring-white/10 shrink-0"
              loading="lazy"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-display font-extrabold text-[13px] text-foreground line-clamp-2 leading-tight">
              {event.title}
            </p>
            {event.venue_name && (
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                <MapPin className="w-3 h-3 text-primary" /> {event.venue_name}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground/80 mt-0.5">
              {format(new Date(event.date_time), "EEE, d 'de' MMM 'às' HH'h'mm", { locale: ptBR })}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${closed ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-primary/25 bg-primary/10 text-primary"}`}>
            <Clock className="w-3 h-3" /> {availabilityText}
          </div>
          <VerifiedDriverBadge />
        </div>

        <Link to={closed ? "#" : targetUrl} onClick={(e) => { if (closed) { e.preventDefault(); toast.error(RIDE_EXPIRED_MESSAGE); } }}>
          <Button variant={closed ? "secondary" : "default"} className="w-full h-9 rounded-xl text-xs font-bold">
            {ctaLabel}
          </Button>
        </Link>
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
  const caronaClosed = isRideWindowClosed(eventDate);

  const driverBlocked = !user;
  const termsBlocked = user && !hasAcceptedTerms;

  const rideParams = new URLSearchParams();
  if (eventName) rideParams.set("event", eventName);
  if (venueName) rideParams.set("venue", venueName);
  if (eventDate) rideParams.set("date", eventDate);
  const rideUrl = `/v3/pedir-carona${rideParams.toString() ? `?${rideParams}` : ""}`;

  const { data: realEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["v3-transport-events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id,slug,title,date_time,venue_name,address,image_url")
        .eq("status", "published")
        .gte("date_time", new Date().toISOString())
        .order("date_time")
        .limit(8);
      return (data || []) as RealEvent[];
    },
  });

  if (loading) return <V3PageSkeleton />;

  return (
    <div className="space-y-6">
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, hsl(var(--v3-neon) / 0.28), transparent 60%), radial-gradient(ellipse at 80% 90%, hsl(var(--v3-neon-soft) / 0.18), transparent 65%)",
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
            Carona segura com motorista verificado pela ROXOU. Conectamos você ao melhor do role.
          </p>

          <div className="flex items-center gap-2 pt-2">
            <Link
              to={caronaClosed ? "#" : rideUrl}
              onClick={(e) => {
                if (caronaClosed) {
                  e.preventDefault();
                  toast.error(RIDE_EXPIRED_MESSAGE);
                }
              }}
              className="flex-1"
            >
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
            {caronaClosed && (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
                Sistema de carona encerrado para este evento
              </p>
            )}
          </div>
        )}

        {/* ─── EVENTOS REAIS ─── */}
        <div className="space-y-3">
          <div>
            <h2 className="font-display font-extrabold text-base text-foreground uppercase tracking-wide">
              Caronas pros próximos rolês
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Eventos confirmados na agenda · motoristas verificados
            </p>
          </div>
          {eventsLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-28 rounded-2xl bg-card border border-border/30 animate-pulse" />
              ))}
            </div>
          ) : realEvents.length === 0 ? (
            <div className="p-6 text-center rounded-2xl v3-glass">
              <p className="text-sm text-muted-foreground">Nenhum evento confirmado no momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {realEvents.map((e) => <EventRideCard key={e.id} event={e} />)}
            </div>
          )}
        </div>

        {/* Quick Actions — Passenger / Driver */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl v3-glass space-y-2 v3-neon-hover">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
              <Car className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-display font-semibold text-sm text-foreground">Preciso de carona</h3>
            <p className="text-[11px] text-muted-foreground">Crie um pedido e motoristas conectam com você</p>
            <Link
              to={caronaClosed ? "#" : rideUrl}
              onClick={(e) => {
                if (caronaClosed) {
                  e.preventDefault();
                  toast.error(RIDE_EXPIRED_MESSAGE);
                }
              }}
            >
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
            { icon: Users, title: "Motoristas conectam", desc: "Receba propostas de motoristas verificados" },
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
