import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, Car, User, CalendarDays, LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS = [
  { to: "/v3", icon: Home, label: "Início" },
  { to: "/v3/descobrir", icon: Search, label: "Descobrir" },
  { to: "/v3/transporte", icon: Car, label: "Transporte" },
  { to: "/v3/agenda", icon: CalendarDays, label: "Agenda" },
  { to: "/v3/perfil", icon: User, label: "Perfil" },
];

export default function V3Layout() {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleProfileClick = () => {
    if (!user) {
      navigate("/v3/auth");
    } else {
      navigate("/v3/perfil");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-body flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/v3" className="font-display font-bold text-xl tracking-tight">
            <span className="text-primary">Roxou</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/v3/transporte"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
            >
              <Car className="w-3.5 h-3.5" />
              Transporte
            </Link>
            {user ? (
              <button
                onClick={() => signOut()}
                className="p-2 rounded-full hover:bg-card transition-colors"
                title="Sair"
              >
                <LogOut className="w-4 h-4 text-muted-foreground" />
              </button>
            ) : (
              <Link
                to="/v3/auth"
                className="p-2 rounded-full hover:bg-card transition-colors"
                title="Entrar"
              >
                <LogIn className="w-4 h-4 text-muted-foreground" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 inset-x-0 z-50 backdrop-blur-xl bg-background/90 border-t border-border/40">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
            const isProfile = to === "/v3/perfil";
            const active = pathname === to || (to !== "/v3" && pathname.startsWith(to));
            return (
              <button
                key={to}
                onClick={() => (isProfile ? handleProfileClick() : navigate(to))}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "drop-shadow-[0_0_6px_hsl(var(--primary))]" : ""}`} />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
