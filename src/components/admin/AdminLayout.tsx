import { Outlet, Link, useLocation, Navigate } from "react-router-dom";
import { LayoutDashboard, Users, CalendarDays, Plus, ArrowLeft, LogOut, Search, ShieldCheck, MapPin, Globe, Instagram } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAdminProfile } from "@/hooks/useAdminProfile";
const navItems = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/eventos", icon: CalendarDays, label: "Eventos" },
  { to: "/admin/sugestoes", icon: Search, label: "Captação" },
  { to: "/admin/eventou", icon: Globe, label: "Eventou" },
  { to: "/admin/instagram", icon: Instagram, label: "Instagram" },
  { to: "/admin/parceiros", icon: Users, label: "Parceiros" },
  { to: "/admin/editores", icon: ShieldCheck, label: "Editores" },
];

const AdminLayout = () => {
  const { pathname } = useLocation();
  const { user, loading, signOut } = useAuth();
  const { profile, isCityEditor, cityFilter } = useAdminProfile();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
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
      <main className="mx-auto max-w-5xl px-3 py-4 pb-20">
        <Outlet />
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-card/90 backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-5xl justify-around py-1.5">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", active && "text-primary")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop sidebar */}
      <div className="hidden md:block fixed left-0 top-12 bottom-0 w-44 border-r border-border/40 bg-card/50 backdrop-blur-sm">
        <nav className="flex flex-col gap-0.5 p-2 mt-2">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default AdminLayout;
