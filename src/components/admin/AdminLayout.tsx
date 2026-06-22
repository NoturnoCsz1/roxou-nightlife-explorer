import { useState, useMemo } from "react";
import { Outlet, Link, useLocation, Navigate } from "react-router-dom";
import {
  Plus, ArrowLeft, LogOut, MapPin,
  LayoutDashboard, Sparkles, CalendarDays, Trophy, MoreHorizontal,
  Users, BarChart3, Instagram, Globe, Search, Settings, FileText, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { ADMIN_NAVIGATION as navItems } from "@/config/adminNavigation";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";


const AdminLayout = () => {
  const { pathname } = useLocation();
  const { user, loading, signOut } = useAuth();
  const { profile, isAdmin, loading: adminLoading, isCityEditor, cityFilter } = useAdminProfile();
  if (loading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition mr-1">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link to="/admin/dashboard" className="text-base font-black font-display text-primary tracking-tight">
              ROXOU
            </Link>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
              Admin
            </span>
            {isCityEditor && cityFilter && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                <MapPin className="h-3 w-3" />
                Cidade ativa: {cityFilter}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              to="/admin/eventos/novo"
              className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Evento</span>
            </Link>
            <Link
              to="/admin/parceiros/novo"
              className="flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Parceiro</span>
            </Link>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition"
              title="Sair"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main
        className="mx-auto max-w-5xl px-3 py-4 overflow-x-clip"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 5rem)" }}
      >
        <Outlet />
      </main>


      {/* Bottom nav (mobile) — 5 col grid, no scroll */}
      <MobileBottomNav pathname={pathname} signOut={signOut} />

      {/* Desktop sidebar */}
      <aside className="hidden md:block fixed left-0 top-12 bottom-0 w-44 z-40 border-r border-border/40 bg-card/50 backdrop-blur-sm overflow-y-auto">
        <nav className="flex flex-col gap-0.5 p-2 mt-2">

          {navItems.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "admin-glow flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
};

/* ─────────── Mobile bottom nav (5 col grid + "Mais" sheet) ─────────── */
const PRIMARY_ITEMS = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/aura", icon: Sparkles, label: "Aura" },
  { to: "/admin/eventos", icon: CalendarDays, label: "Eventos" },
  { to: "/admin/jogos", icon: Trophy, label: "Jogos" },
] as const;

const MORE_ITEMS = [
  { to: "/admin/parceiros", icon: Users, label: "Parceiros" },
  { to: "/admin/system", icon: BarChart3, label: "Analytics" },
  { to: "/admin/instagram", icon: Instagram, label: "Instagram" },
  { to: "/admin/eventou", icon: Globe, label: "Eventou" },
  { to: "/admin/sugestoes", icon: Search, label: "SEO" },
  { to: "/admin/editores", icon: Settings, label: "Configurações" },
  { to: "/admin/logs", icon: FileText, label: "Logs" },
] as const;

const MobileBottomNav = ({ pathname, signOut }: { pathname: string; signOut: () => void }) => {
  const [open, setOpen] = useState(false);
  const inMore = MORE_ITEMS.some(i => pathname.startsWith(i.to));

  /**
   * Fallback: qualquer item de ADMIN_NAVIGATION que NÃO esteja já em
   * PRIMARY_ITEMS nem em MORE_ITEMS é exibido aqui em "Ferramentas antigas",
   * garantindo que nenhuma tela legada fique inacessível no mobile.
   *
   * Checklist de rotas preservadas (Admin):
   *  Dashboard, Aura, Eventos, Jogos, Parceiros, Analytics, Instagram,
   *  Eventou, SEO (sugestoes), Configurações (editores), Logs, Sair,
   *  + todos os itens de ADMIN_NAVIGATION via "Ferramentas antigas".
   */
  const legacyItems = useMemo(() => {
    const visible = new Set<string>([
      ...PRIMARY_ITEMS.map(i => i.to),
      ...MORE_ITEMS.map(i => i.to),
    ]);
    return navItems.filter(i => !visible.has(i.to));
  }, []);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/85 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="grid grid-cols-5 h-16">
        {PRIMARY_ITEMS.map(item => {
          const active = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_hsl(var(--primary)/0.7)]")} />
              <span className="truncate max-w-[60px]">{item.label}</span>
              {active && <span className="absolute top-1 h-1 w-1 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.9)]" />}
            </Link>
          );
        })}

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                inMore ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MoreHorizontal className={cn("h-5 w-5", inMore && "drop-shadow-[0_0_8px_hsl(var(--primary)/0.7)]")} />
              <span>Mais</span>
              {inMore && <span className="absolute top-1 h-1 w-1 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.9)]" />}
            </button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="rounded-t-3xl border-t border-white/10 bg-black/95 backdrop-blur-2xl p-0 max-h-[85vh] overflow-y-auto"
          >
            <SheetHeader className="px-5 pt-4 pb-2 flex-row items-center justify-between space-y-0 sticky top-0 bg-black/95 z-10">
              <SheetTitle className="text-base font-bold text-foreground">Mais opções</SheetTitle>
              <button
                onClick={() => setOpen(false)}
                className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </SheetHeader>

            <div className="px-5 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              Principais
            </div>
            <div className="grid grid-cols-3 gap-2 px-4 pb-2">
              {MORE_ITEMS.map(item => {
                const active = pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 transition",
                      active
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-white/10 bg-white/[0.03] text-foreground/80 hover:border-primary/30"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-[11px] font-semibold text-center leading-tight">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {legacyItems.length > 0 && (
              <>
                <div className="px-5 pt-3 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Ferramentas antigas
                </div>
                <div className="grid grid-cols-3 gap-2 px-4 pb-2">
                  {legacyItems.map(item => {
                    const active = pathname.startsWith(item.to);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 rounded-2xl border p-3 transition",
                          active
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-white/10 bg-white/[0.02] text-foreground/70 hover:border-primary/30"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="text-[10px] font-semibold text-center leading-tight">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}

            <div
              className="px-4 pt-2 pb-4"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
            >
              <button
                onClick={() => { setOpen(false); signOut(); }}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 py-3 text-rose-300 transition hover:bg-rose-500/20"
              >
                <LogOut className="h-5 w-5" />
                <span className="text-sm font-semibold">Sair</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};

export default AdminLayout;

