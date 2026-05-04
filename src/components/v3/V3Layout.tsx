import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Car, CalendarDays, User, LogIn, LogOut, Bot, PiggyBank } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useV3Profile } from "@/hooks/useV3Profile";
import PullToRefresh from "@/components/v3/PullToRefresh";
import AuraAvatar from "@/components/v3/AuraAvatar";

const NAV_ITEMS = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/ia", icon: Bot, label: "Aura" },
  { to: "/transporte", icon: Car, label: "Caronas" },
  { to: "/perfil", icon: User, label: "Perfil" },
];

const DESKTOP_ITEMS = [
  { to: "/agenda", icon: CalendarDays, label: "Agenda" },
  { to: "/economize", icon: PiggyBank, label: "Economize" },
];

export default function V3Layout() {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const { profile } = useV3Profile();
  const navigate = useNavigate();

  const handleProfileClick = () => {
    navigate(user ? "/perfil" : "/auth");
  };

  const allDesktopItems = [...NAV_ITEMS, ...DESKTOP_ITEMS];

  const displayName = profile?.display_name?.trim() || user?.email?.split("@")[0] || "Visitante";
  const nickname = (profile as any)?.nickname?.trim() || null;
  const avatarUrl = (profile as any)?.avatar_url || null;
  const initial = (displayName?.[0] ?? "R").toUpperCase();


  return (
    <div className="v3-theme min-h-screen text-foreground font-body flex flex-col">
      {/* Header — Midnight glass */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between gap-4 px-4 h-14 max-w-7xl mx-auto">
          <Link to="/" className="font-display font-bold text-xl tracking-tight shrink-0">
            <span className="text-primary v3-neon-text">Roxou</span>
          </Link>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/economize"
              className="p-2 rounded-full hover:bg-white/5 transition-colors lg:hidden"
              title="Economize"
            >
              <PiggyBank className="w-4 h-4 text-muted-foreground" />
            </Link>
            <Link
              to="/ia"
              className="p-2 rounded-full hover:bg-white/5 transition-colors lg:hidden"
              title="Aura"
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
                to="/auth"
                className="p-2 rounded-full hover:bg-white/5 transition-colors"
                title="Entrar"
              >
                <LogIn className="w-4 h-4 text-muted-foreground" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Content + Sidebar Desktop */}
      <PullToRefresh>
        <div className="flex-1 max-w-7xl w-full mx-auto lg:flex lg:gap-6 lg:px-4">
          {/* Sidebar Desktop */}
          <aside className="hidden lg:flex lg:flex-col lg:items-center lg:w-64 shrink-0 sticky top-14 self-start py-6 px-4 max-h-[calc(100vh-3.5rem)] overflow-y-auto backdrop-blur-xl bg-background/40">
            {/* Card de perfil — clean, centralizado */}
            <button
              onClick={handleProfileClick}
              className="w-[200px] flex flex-col items-center gap-2 px-3 py-4 rounded-xl hover:bg-white/5 transition-colors mb-4"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-display font-bold text-primary-foreground shrink-0 overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  initial
                )}
              </div>
              <div className="text-center min-w-0 w-full">
                <p className="text-sm font-bold text-foreground line-clamp-1">
                  {user ? displayName : "Visitante"}
                </p>
                {user && nickname ? (
                  <p className="text-[11px] text-primary/80 line-clamp-1">@{nickname}</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    {user ? "Ver perfil" : "Entrar"}
                  </p>
                )}
              </div>
            </button>

            {/* Itens de navegação — coluna coesa centralizada */}
            <nav className="flex flex-col items-center gap-1 w-full">
              {allDesktopItems.map(({ to, icon: Icon, label }) => {
                const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
                return (
                  <button
                    key={to}
                    onClick={() => navigate(to)}
                    className={`w-[200px] inline-flex items-center justify-start gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                      active
                        ? "bg-primary/15 text-primary shadow-[0_0_15px_rgba(168,85,247,0.25)]"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${active ? "drop-shadow-[0_0_8px_hsl(var(--v3-neon))]" : ""}`} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <main key={pathname} className="flex-1 min-w-0 pb-16 lg:pb-0 v3-page-fade">
            <Outlet />
          </main>
        </div>
      </PullToRefresh>

      {/* Footer — apenas Desktop (no mobile a TabBar já fecha a tela) */}
      <div className="hidden lg:block pt-2 pb-3 text-center border-t border-white/5 space-y-1">
        <div className="flex items-center justify-center gap-4 text-[11px] font-medium text-muted-foreground">
          <Link to="/sobre" className="hover:text-primary transition-colors">Sobre</Link>
          <span className="opacity-30">·</span>
          <Link to="/privacidade" className="hover:text-primary transition-colors">Privacidade</Link>
          <span className="opacity-30">·</span>
          <Link to="/contato" className="hover:text-primary transition-colors">Contato</Link>
        </div>
        <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
          © 2026 ROXOU — Todos os direitos reservados
        </p>
      </div>

      {/* Bottom Nav — apenas Mobile */}
      <nav className="fixed bottom-0 inset-x-0 z-50 v3-glass-strong border-t border-white/5 lg:hidden">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
            const isProfile = to === "/perfil";
            const active = to === "/"
              ? pathname === "/"
              : pathname.startsWith(to);
            const isAura = to === "/ia";
            return (
              <button
                key={to}
                onClick={() => (isProfile ? handleProfileClick() : navigate(to))}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {isAura ? (
                  <AuraAvatar className={`w-6 h-6 ${active ? "ring-2 ring-primary" : ""}`} glow={active} />
                ) : (
                  <Icon className={`w-5 h-5 ${active ? "drop-shadow-[0_0_8px_hsl(var(--v3-neon))]" : ""}`} />
                )}
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
