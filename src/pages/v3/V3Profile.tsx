import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useV3Profile } from "@/hooks/useV3Profile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  User, LogOut, Car, Bookmark, ChevronRight, Shield, Mail, Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function V3Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, roles, loading, isDriver } = useV3Profile();

  /* ride requests */
  const { data: rides = [] } = useQuery({
    queryKey: ["v3-my-rides", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("ride_requests")
        .select("id,event_name,venue_name,status,created_at")
        .eq("passenger_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user?.id,
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
        <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4 neon-glow">
          <User className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="font-display font-bold text-xl text-foreground mb-2">Entre na sua conta</h1>
        <p className="text-sm text-muted-foreground mb-6 max-w-[260px]">
          Faça login para acessar seu perfil, pedidos de transporte e eventos salvos.
        </p>
        <Button onClick={() => navigate("/v3/auth")} className="rounded-xl px-8">
          Entrar
        </Button>
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut();
    navigate("/v3");
  };

  return (
    <div className="pb-8 px-4 pt-4 space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full rounded-2xl object-cover" />
          ) : (
            <User className="w-6 h-6 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-lg text-foreground truncate">
            {profile?.display_name || user.email?.split("@")[0]}
          </h1>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          {roles.length > 0 && (
            <div className="flex gap-1 mt-1">
              {roles.map(r => (
                <span key={r} className="px-2 py-0.5 rounded-full bg-primary/10 text-[9px] font-bold text-primary uppercase">
                  {r}
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

      {/* ── Transport ── */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display font-bold text-sm text-foreground">🚗 Pedidos de transporte</h2>
          <Link to="/v3/meus-pedidos" className="text-[11px] text-primary font-medium flex items-center gap-0.5">
            Ver todos <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {rides.length > 0 ? (
          <div className="space-y-2">
            {rides.slice(0, 3).map(r => (
              <div key={r.id} className="p-3 rounded-xl bg-card border border-border/40">
                <p className="text-xs font-semibold text-foreground truncate">{r.event_name || "Pedido de carona"}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">{r.venue_name || "—"}</span>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    r.status === "open" ? "bg-accent/20 text-accent" :
                    r.status === "matched" ? "bg-primary/20 text-primary" :
                    "bg-secondary text-muted-foreground"
                  }`}>
                    {r.status === "open" ? "Aberto" : r.status === "matched" ? "Combinado" : r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-card border border-border/30 text-center">
            <Car className="w-6 h-6 text-muted-foreground/40 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Nenhum pedido de transporte</p>
          </div>
        )}
      </section>

      {/* ── Saved events ── */}
      <section>
        <h2 className="font-display font-bold text-sm text-foreground mb-2">🔖 Eventos salvos</h2>
        <div className="p-6 rounded-xl bg-card border border-border/30 text-center">
          <Bookmark className="w-6 h-6 text-muted-foreground/40 mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Em breve</p>
        </div>
      </section>

      {/* ── Logout ── */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 w-full p-3 rounded-xl bg-card border border-border/40 text-sm text-red-400 font-medium hover:border-red-400/30 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Sair da conta
      </button>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-xs text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}
