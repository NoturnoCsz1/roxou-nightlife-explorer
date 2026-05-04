import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Car, CalendarDays, User, LogIn, LogOut, Bot, PiggyBank } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import PullToRefresh from "@/components/v3/PullToRefresh";

const NAV_ITEMS = [
  { to: "/v3", icon: Home, label: "Início" },
  { to: "/v3/ia", icon: Bot, label: "IA" },
  { to: "/v3/transporte", icon: Car, label: "Caronas" },
  { to: "/v3/perfil", icon: User, label: "Perfil" },
];

const DESKTOP_ITEMS = [
  { to: "/v3/agenda", icon: CalendarDays, label: "Agenda" },
  { to: "/v3/economize", icon: PiggyBank, label: "Economize" },
];

export default function V3Layout() {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleProfileClick = () => {
    navigate(user ? "/v3/perfil" : "/v3/auth");
  };

  const allDesktopItems = [...NAV_ITEMS, ...DESKTOP_ITEMS];

  // Rotas full-height (sem scroll de página, conteúdo ocupa exatamente a viewport útil)
  const isFullHeightRoute = pathname.startsWith("/v3/ia");

  return (
    <div className={`v3-theme text-foreground font-body flex flex-col ${isFullHeightRoute ? "h-[100dvh] overflow-hidden" : "min-h-screen"}`}>
      {/* Header — Midnight glass (com nav integrada no desktop) */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between gap-4 px-4 h-14 max-w-7xl mx-auto">
          <Link to="/v3" className="font-display font-bold text-xl tracking-tight shrink-0">
            <span className="text-primary v3-neon-text">Roxou</span>
          </Link>

          {/* Nav Desktop — centralizada/à direita */}
          <nav className="hidden lg:flex flex-1 items-center justify-center gap-1">
            {allDesktopItems.map(({ to, icon: Icon, label }) => {
              const active = to === "/v3" ? pathname === "/v3" : pathname.startsWith(to);
              return (
                <button
                  key={to}
                  onClick={() => navigate(to)}
                  className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-bold transition-colors ${
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "drop-shadow-[0_0_8px_hsl(var(--v3-neon))]" : ""}`} />
                  {label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/v3/economize"
              className="p-2 rounded-full hover:bg-white/5 transition-colors lg:hidden"
              title="Economize"
            >
              <PiggyBank className="w-4 h-4 text-muted-foreground" />
            </Link>
            <Link
              to="/v3/ia"
              className="p-2 rounded-full hover:bg-white/5 transition-colors lg:hidden"
              title="Prudente IA"
            >
              <Bot className="w-4 h-4 text-primary" />
            </Link>
            {user ? (
              <button
                onClick={() => signOut()}
                className="p-2 rounded-full hover:bg-white/5 transition-colors"
                title="Sair"
              >
                <LogOut className="w-4 h-4 text-muted-foreground" />
              </button>
            ) : (
              <Link
                to="/v3/auth"
                className="p-2 rounded-full hover:bg-white/5 transition-colors"
                title="Entrar"
              >
                <LogIn className="w-4 h-4 text-muted-foreground" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Content — fade-in per route */}
      <PullToRefresh>
        <main key={pathname} className="flex-1 pb-16 lg:pb-0 v3-page-fade">
          <Outlet />
        </main>
      </PullToRefresh>

      {/* Footer — apenas Desktop (no mobile a TabBar já fecha a tela) */}
      <div className="hidden lg:block pt-2 pb-3 text-center border-t border-white/5 space-y-1">
        <div className="flex items-center justify-center gap-4 text-[11px] font-medium text-muted-foreground">
          <Link to="/v3/sobre" className="hover:text-primary transition-colors">Sobre</Link>
          <span className="opacity-30">·</span>
          <Link to="/v3/privacidade" className="hover:text-primary transition-colors">Privacidade</Link>
          <span className="opacity-30">·</span>
          <Link to="/v3/contato" className="hover:text-primary transition-colors">Contato</Link>
        </div>
        <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
          © 2026 ROXOU — Todos os direitos reservados
        </p>
      </div>

      {/* Bottom Nav — apenas Mobile */}
      <nav className="fixed bottom-0 inset-x-0 z-50 v3-glass-strong border-t border-white/5 lg:hidden">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
            const isProfile = to === "/v3/perfil";
            const active = to === "/v3"
              ? pathname === "/v3"
              : pathname.startsWith(to);
            return (
              <button
                key={to}
                onClick={() => (isProfile ? handleProfileClick() : navigate(to))}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "drop-shadow-[0_0_8px_hsl(var(--v3-neon))]" : ""}`} />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
