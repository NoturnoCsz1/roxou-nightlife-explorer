import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useV3Profile } from "@/hooks/useV3Profile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSavedEvents } from "@/hooks/useSavedEvents";
import { useSavedPartners } from "@/hooks/useSavedPartners";
import {
  User, LogOut, Car, Bookmark, ChevronRight, Shield, Mail, Phone,
  CalendarDays, Clock, MapPin, Sparkles, Heart, BadgeCheck, Building2,
  Pencil, LockKeyhole, Gift, Copy, Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function V3Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, roles, loading, isDriver } = useV3Profile();
  const { savedIds } = useSavedEvents();
  const { savedIds: followedIds } = useSavedPartners();

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

  /* followed partners details */
  const { data: followedPartners = [] } = useQuery({
    queryKey: ["v3-followed-partners-details", followedIds],
    queryFn: async () => {
      if (!followedIds.length) return [];
      const { data } = await supabase.from("partners")
        .select("id,name,slug,type,logo_url,verified_partner")
        .in("id", followedIds);
      return data || [];
    },
    enabled: followedIds.length > 0,
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
          Entre para salvar eventos, seguir locais e acompanhar tudo que rola na noite.
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
  const affiliateCode = profile?.affiliate_code || user.id.replace(/-/g, "").slice(0, 10).toLowerCase();
  const affiliateLink = `${window.location.origin}/v3/auth?ref=${affiliateCode}`;
  const copyAffiliate = () => {
    navigator.clipboard.writeText(affiliateLink);
    toast.success("Link de afiliado copiado!");
  };

  return (
    <div className="pb-8 px-4 pt-4 space-y-4">
      {/* ── Profile Hero ── */}
      <div className="relative overflow-hidden rounded-3xl v3-glass-strong p-5 min-h-[190px]">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/35 via-accent/10 to-background" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/75 to-transparent" />
        <button
          type="button"
          className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/20 px-3 py-1.5 text-[11px] font-bold text-foreground/85 backdrop-blur-xl transition-all hover:border-primary/40 hover:bg-primary/10"
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar Perfil
        </button>

        <div className="relative z-10 flex h-full flex-col justify-end pt-12">
          <div className="relative mb-3 w-fit">
            <div className="h-24 w-24 rounded-3xl border border-primary/50 bg-primary/20 p-1 v3-neon-glow">
              <div className="h-full w-full overflow-hidden rounded-[1.25rem] bg-background/60 flex items-center justify-center">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-primary" />
                )}
              </div>
            </div>
            {roles.length > 0 && (
              <div className="absolute -bottom-2 left-3 flex flex-wrap gap-1.5">
                {roles.map(r => (
                  <span key={r} className="rounded-full border border-primary/30 bg-background/70 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-primary backdrop-blur-xl">
                    {r === "passenger" ? "Passageiro" : r === "driver" ? "Motorista" : r}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="min-w-0 pt-2">
            <h1 className="font-display text-2xl font-black text-foreground truncate">
              {profile?.display_name || user.email?.split("@")[0]}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
      </div>

      {/* ── Bento Stats ── */}
      <div className="grid grid-cols-2 gap-3">
        <StatBentoCard to="#eventos-salvos" icon={Bookmark} label="Salvos" value={savedIds.length} tone="primary" className="min-h-[118px]" />
        <StatBentoCard to="#locais-seguidos" icon={Heart} label="Seguindo" value={followedIds.length} tone="accent" className="min-h-[118px]" />
        <StatBentoCard to="/v3/meus-pedidos" icon={Car} label="Caronas" value={rides.length} tone="show" className="col-span-2 min-h-[92px]" />
      </div>

      {/* ── VIP Affiliate ── */}
      <div className="relative overflow-hidden rounded-3xl v3-glass-strong p-4 v3-pulse-glow">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent" />
        <div className="relative flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl gradient-primary neon-glow">
            <Gift className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Crown className="h-3.5 w-3.5 text-accent" />
              <h2 className="font-display text-sm font-black text-foreground">Link de Afiliado ROXOU VIP</h2>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Indique um amigo e ganhe 15 dias de VIP quando ele entrar.</p>
            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-border/30 bg-background/35 p-2">
              <code className="flex-1 truncate text-[10px] text-muted-foreground">{affiliateLink}</code>
              <button onClick={copyAffiliate} className="rounded-xl bg-primary/15 p-2 text-primary active:scale-95">
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Security & Contact ── */}
      <div className="rounded-3xl v3-glass p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <LockKeyhole className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-sm font-black text-foreground">Segurança e Contato</h2>
            <p className="text-[10px] text-muted-foreground">Dados essenciais da sua conta</p>
          </div>
        </div>
        <div className="divide-y divide-border/20 overflow-hidden rounded-2xl border border-border/20 bg-background/20">
          <SecurityRow icon={Mail} label="Email" value={user.email || "—"} />
          <SecurityRow icon={Phone} label="Telefone" value={profile?.phone || "Não informado"} />
          <SecurityRow icon={isDriver ? Shield : BadgeCheck} label="Verificação" value={isDriver ? "Motorista verificado" : "Conta de passageiro"} />
        </div>
      </div>

      {/* ── Followed Partners ── */}
      <section id="locais-seguidos" className="scroll-mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display font-bold text-sm text-foreground">❤️ Locais seguidos</h2>
          {followedPartners.length > 0 && (
            <span className="text-[10px] text-muted-foreground">{followedPartners.length}</span>
          )}
        </div>
        {followedPartners.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
            {followedPartners.map((p: any) => (
              <Link key={p.id} to={`/v3/local/${p.slug}`}
                className="group w-[78px] shrink-0 text-center">
                <div className="mx-auto mb-2 h-16 w-16 overflow-hidden rounded-full border border-border/50 bg-secondary transition-all group-hover:border-primary/50 group-hover:shadow-[0_0_22px_hsl(var(--primary)/0.25)]">
                  {p.logo_url ? (
                    <img src={p.logo_url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary font-bold text-lg">{p.name[0]}</div>
                  )}
                </div>
                <div className="flex items-center justify-center gap-1">
                  <p className="max-w-full truncate text-[10px] font-bold text-foreground">{p.name}</p>
                  {p.verified_partner && <BadgeCheck className="h-3 w-3 shrink-0 text-accent" />}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl v3-glass px-5 py-7 text-center">
            <Heart className="mx-auto mb-3 h-14 w-14 text-muted-foreground/20" />
            <p className="text-sm font-bold text-foreground">Nenhum local seguido ainda</p>
            <p className="mx-auto mt-1 max-w-[220px] text-[11px] leading-relaxed text-muted-foreground">Siga seus parceiros favoritos para acessar tudo por aqui.</p>
            <Link to="/v3/descobrir" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-black text-primary-foreground transition-transform active:scale-95">
              Explorar Locais <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </section>

      {/* ── Saved Events ── */}
      <section id="eventos-salvos" className="scroll-mt-6">
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
          <div className="py-6 rounded-xl bg-card border border-border/30 text-center">
            <Sparkles className="w-7 h-7 text-muted-foreground/20 mx-auto mb-1.5" />
            <p className="text-xs text-muted-foreground font-medium">Nenhum evento salvo</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Toque no 🔖 nos eventos para salvá-los</p>
            <Link to="/v3/descobrir" className="inline-flex items-center gap-1 mt-2 text-[11px] text-primary font-semibold">
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
          <div className="py-6 rounded-xl bg-card border border-border/30 text-center">
            <Car className="w-7 h-7 text-muted-foreground/20 mx-auto mb-1.5" />
            <p className="text-xs text-muted-foreground font-medium">Nenhum pedido de transporte</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Peça uma carona diretamente nos eventos</p>
            <Link to="/v3/transporte" className="inline-flex items-center gap-1 mt-2 text-[11px] text-primary font-semibold">
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

function StatBentoCard({
  to,
  icon: Icon,
  label,
  value,
  tone,
  className = "",
}: {
  to: string;
  icon: any;
  label: string;
  value: number;
  tone: "primary" | "accent" | "show";
  className?: string;
}) {
  const toneClass = {
    primary: "text-primary bg-primary/15 shadow-[0_0_28px_hsl(var(--primary)/0.18)]",
    accent: "text-accent bg-accent/15 shadow-[0_0_28px_hsl(var(--accent)/0.18)]",
    show: "text-[hsl(var(--badge-show))] bg-[hsl(var(--badge-show)/0.14)] shadow-[0_0_28px_hsl(var(--badge-show)/0.16)]",
  }[tone];

  return (
    <Link to={to} className={`group relative overflow-hidden rounded-3xl v3-glass p-4 transition-all active:scale-[0.98] ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5 opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative flex h-full items-center justify-between gap-3">
        <div>
          <p className="text-3xl font-black leading-none text-foreground">{value}</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Link>
  );
}

function SecurityRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
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
