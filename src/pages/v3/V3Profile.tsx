import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useV3Profile } from "@/hooks/useV3Profile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSavedEvents } from "@/hooks/useSavedEvents";
import {
  User, LogOut, Car, Bookmark, ChevronRight, Shield, Mail, Phone,
  CalendarDays, Clock, MapPin, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function V3Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, roles, loading, isDriver } = useV3Profile();
  const { savedIds } = useSavedEvents();

  /* ride requests */
  const { data: rides = [] } = useQuery({
    queryKey: ["v3-my-rides", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("ride_requests")
        .select("id,event_name,venue_name,status,created_at,event_date,passengers_count")
        .eq("passenger_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user?.id,
  });

  /* saved events details */
  const { data: savedEvents = [] } = useQuery({
    queryKey: ["v3-saved-details", savedIds],
    queryFn: async () => {
      if (!savedIds.length) return [];
      const { data } = await supabase.from("events")
        .select("id,slug,title,image_url,date_time,venue_name")
        .in("id", savedIds)
        .order("date_time");
      return data || [];
    },
    enabled: savedIds.length > 0,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] px-4 text-center">
        <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mb-5 neon-glow">
          <User className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="font-display font-bold text-2xl text-foreground mb-2">Acesse sua conta</h1>
        <p className="text-sm text-muted-foreground mb-6 max-w-[280px] leading-relaxed">
          Entre para salvar eventos, pedir caronas e acompanhar tudo que rola na noite.
        </p>
        <Button onClick={() => navigate("/v3/auth")} className="rounded-xl px-10 h-12 text-sm font-bold">
          Entrar ou criar conta
        </Button>
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut();
    navigate("/v3");
  };

  const statusConfig: Record<string, { label: string; cls: string }> = {
    open: { label: "Aberto", cls: "bg-accent/20 text-accent" },
    matched: { label: "Combinado", cls: "bg-primary/20 text-primary" },
    cancelled: { label: "Cancelado", cls: "bg-secondary text-muted-foreground" },
    completed: { label: "Concluído", cls: "bg-emerald-500/20 text-emerald-400" },
  };

  return (
    <div className="pb-8 px-4 pt-4 space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/40">
        <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center overflow-hidden">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="w-7 h-7 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-lg text-foreground truncate">
            {profile?.display_name || user.email?.split("@")[0]}
          </h1>
          <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
          {roles.length > 0 && (
            <div className="flex gap-1 mt-1.5">
              {roles.map(r => (
                <span key={r} className="px-2 py-0.5 rounded-full bg-primary/10 text-[9px] font-bold text-primary uppercase">
                  {r === "passenger" ? "Passageiro" : r === "driver" ? "Motorista" : r}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Info ── */}
      <div className="rounded-xl bg-card border border-border/40 divide-y divide-border/30">
        <InfoRow icon={Mail} label="Email" value={user.email || "—"} />
        <InfoRow icon={Phone} label="Telefone" value={profile?.phone || "Não informado"} />
        {isDriver && <InfoRow icon={Shield} label="Motorista" value="Verificado ✓" />}
      </div>

      {/* ── Saved Events ── */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display font-bold text-sm text-foreground">🔖 Eventos salvos</h2>
          {savedEvents.length > 0 && (
            <span className="text-[10px] text-muted-foreground">{savedEvents.length} salvo{savedEvents.length > 1 ? "s" : ""}</span>
          )}
        </div>
        {savedEvents.length > 0 ? (
          <div className="space-y-2">
            {savedEvents.slice(0, 5).map(e => (
              <Link key={e.id} to={`/v3/evento/${e.slug}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40 hover:border-primary/20 transition-all">
                <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                  <img src={e.image_url || "/placeholder.svg"} alt={e.title} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-semibold text-xs text-foreground line-clamp-1">{e.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="w-3 h-3 text-primary" />
                      {format(new Date(e.date_time), "d MMM · HH'h'mm", { locale: ptBR })}
                    </span>
                  </div>
                  {e.venue_name && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-primary" /> {e.venue_name}
                    </span>
                  )}
                </div>
                <Bookmark className="w-4 h-4 text-primary fill-primary shrink-0" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-8 rounded-xl bg-card border border-border/30 text-center">
            <Sparkles className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground font-medium">Nenhum evento salvo</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Toque no 🔖 nos eventos para salvá-los aqui
            </p>
            <Link to="/v3/descobrir" className="inline-flex items-center gap-1 mt-3 text-[11px] text-primary font-semibold">
              Descobrir eventos <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </section>

      {/* ── Transport ── */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display font-bold text-sm text-foreground">🚗 Pedidos de transporte</h2>
          {rides.length > 0 && (
            <Link to="/v3/meus-pedidos" className="text-[11px] text-primary font-medium flex items-center gap-0.5">
              Ver todos <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>
        {rides.length > 0 ? (
          <div className="space-y-2">
            {rides.slice(0, 3).map(r => {
              const st = statusConfig[r.status] || statusConfig.open;
              return (
                <div key={r.id} className="p-3.5 rounded-xl bg-card border border-border/40">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground line-clamp-1">{r.event_name || "Pedido de carona"}</p>
                      {r.venue_name && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {r.venue_name}
                        </p>
                      )}
                    </div>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${st.cls}`}>
                      {st.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                    {r.event_date && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(r.event_date), "d MMM · HH'h'mm", { locale: ptBR })}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" /> {r.passengers_count} pessoa{r.passengers_count > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 rounded-xl bg-card border border-border/30 text-center">
            <Car className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground font-medium">Nenhum pedido de transporte</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Peça uma carona diretamente nos eventos
            </p>
            <Link to="/v3/transporte" className="inline-flex items-center gap-1 mt-3 text-[11px] text-primary font-semibold">
              Ver transporte <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </section>

      {/* ── Logout ── */}
      <button
        onClick={handleLogout}
        className="flex items-center justify-center gap-2 w-full p-3.5 rounded-xl border border-red-500/20 text-sm text-red-400 font-medium hover:bg-red-500/5 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Sair da conta
      </button>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-3">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-xs text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}
