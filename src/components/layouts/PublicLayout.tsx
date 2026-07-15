import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Car, CalendarDays, User, LogIn, LogOut, Bot, PiggyBank, Twitter, Instagram, MapPin, Shield, BadgeCheck, Search, Compass } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useV3Profile } from "@/hooks/useV3Profile";
import PullToRefresh from "@/components/v3/PullToRefresh";
import AuraAvatar from "@/components/v3/AuraAvatar";

const NAV_ITEMS = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/agenda", icon: CalendarDays, label: "Agenda" },
  { to: "/descobrir", icon: Compass, label: "Descobrir" },
  { to: "/transportes", icon: Car, label: "Transportes" },
  { to: "/perfil", icon: User, label: "Perfil" },
];


const DESKTOP_EXTRA_ITEMS = [
  { to: "/ia", icon: Bot, label: "Aura" },
  { to: "/economize", icon: PiggyBank, label: "Economize" },
];

export default function PublicLayout() {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const { profile, isDriver } = useV3Profile();
  const navigate = useNavigate();

  const handleProfileClick = () => {
    navigate(user ? "/perfil" : "/auth");
  };

  const driverItem = isDriver
    ? { to: "/motorista", icon: Shield, label: "Área do motorista" }
    : { to: "/cadastro-motorista", icon: BadgeCheck, label: "Quero ser motorista" };
  const allDesktopItems = [...NAV_ITEMS.filter(i => i.to !== "/perfil"), ...DESKTOP_EXTRA_ITEMS, driverItem];

  const displayName = profile?.display_name?.trim() || user?.email?.split("@")[0] || "Visitante";
  const nickname = (profile as { nickname?: string })?.nickname?.trim() || null;
  const avatarUrl = (profile as { avatar_url?: string })?.avatar_url || null;
  const initial = (displayName?.[0] ?? "R").toUpperCase();


  return (
    <div className="v3-theme min-h-screen text-foreground font-body flex flex-col overflow-x-hidden">
      {/* Header — premium hub */}
      <header className="sticky top-0 z-50 bg-background/88 backdrop-blur-lg border-b border-white/8">
        <div className="flex items-center gap-5 px-5 h-16 max-w-7xl mx-auto">

          {/* Logo */}
          <Link to="/" className="font-display font-black text-2xl tracking-tight shrink-0">
            <span className="text-primary" style={{ textShadow: "0 0 24px hsl(var(--primary)/0.5)" }}>ROXOU</span>
          </Link>

          {/* Desktop nav central */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1">
            {[
              { to: "/agenda",    label: "Agenda"    },
              { to: "/jogos",     label: "Jogos"     },
              { to: "/copa-do-mundo-2026", label: "Copa 2026" },
              { to: "/noticias",  label: "Notícias"  },
              { to: "/parceiros", label: "Parceiros" },
            ].map(({ to, label }) => {
              const isActive = pathname === to || (to !== "/" && pathname.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  className={`px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                    isActive
                      ? "bg-primary/12 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0 ml-auto lg:ml-0">
            {/* Buscar — desktop */}
            <Link
              to="/descobrir"
              className="hidden lg:flex items-center gap-1.5 h-8 px-3.5 rounded-xl border border-border/40 bg-white/3 text-[12px] font-medium text-muted-foreground hover:border-primary/35 hover:text-foreground transition-all"
            >
              <Search className="w-3.5 h-3.5" /> Buscar
            </Link>
            {/* Mobile icons */}
            <Link to="/ia" className="lg:hidden p-2 rounded-full hover:bg-white/5">
              <Bot className="w-4 h-4 text-primary" />
            </Link>
            <Link to="/economize" className="lg:hidden p-2 rounded-full hover:bg-white/5">
              <PiggyBank className="w-4 h-4 text-muted-foreground" />
            </Link>
            {/* Social — desktop only */}
            <a href="https://www.instagram.com/roxou.pp/" target="_blank" rel="noopener noreferrer" className="hidden lg:flex p-2 rounded-full hover:bg-white/5" title="Instagram">
              <Instagram className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
            </a>
            {/* Logout / Entrar */}
            {user ? (
              <button onClick={() => signOut()} className="hidden lg:flex p-2 rounded-full hover:bg-white/5" title="Sair">
                <LogOut className="w-4 h-4 text-muted-foreground" />
              </button>
            ) : null}
            {/* Avatar / perfil */}
            <button
              onClick={handleProfileClick}
              className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden hover:border-primary/60 active:scale-95 transition-all shrink-0"
              title={user ? displayName : "Entrar"}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} decoding="async" className="w-full h-full object-cover" />
              ) : user ? (
                <span className="text-[11px] font-black text-primary">{initial}</span>
              ) : (
                <LogIn className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Content + Sidebar Desktop */}
      <PullToRefresh>
        <div className="flex-1 max-w-7xl w-full mx-auto lg:flex lg:gap-6 lg:px-4">
          {/* Sidebar Desktop — oculta na home (CommandCenter tem sidebar própria) */}
          <aside className={`lg:flex-col lg:items-center lg:w-64 shrink-0 sticky top-16 self-start py-6 px-4 max-h-[calc(100vh-4rem)] overflow-y-auto backdrop-blur-xl bg-background/40 ${pathname === "/" ? "hidden" : "hidden lg:flex"}`}>
            {/* Card de perfil — clean, centralizado */}
            <button
              onClick={handleProfileClick}
              className="w-[200px] flex flex-col items-center gap-2 px-3 py-4 rounded-xl hover:bg-white/5 transition-colors mb-4"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-display font-bold text-primary-foreground shrink-0 overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} decoding="async" className="w-full h-full object-cover" />
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

          <main key={pathname} className="flex-1 min-w-0 pb-[calc(80px+env(safe-area-inset-bottom))] lg:pb-0 v3-page-fade">
            <Outlet />
          </main>
        </div>
      </PullToRefresh>

      {/* Footer — apenas Desktop (no mobile a TabBar já fecha a tela) */}
      <div className="hidden lg:block pt-2 pb-3 text-center border-t border-white/5 space-y-1">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-medium text-muted-foreground">
          <Link to="/sobre" className="hover:text-primary transition-colors">Sobre</Link>
          <span className="opacity-30">·</span>
          <Link to="/contato" className="hover:text-primary transition-colors">Contato</Link>
          <span className="opacity-30">·</span>
          <Link to="/privacy" className="hover:text-primary transition-colors">Privacidade</Link>
          <span className="opacity-30">·</span>
          <Link to="/terms" className="hover:text-primary transition-colors">Termos</Link>
          <span className="opacity-30">·</span>
          <Link to="/remover-dados" className="hover:text-primary transition-colors">Remover dados</Link>
        </div>
        <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
          © 2026 ROXOU — Todos os direitos reservados
        </p>
      </div>


      {/* Bottom Nav — apenas Mobile */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 v3-glass-strong border-t border-white/5 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
            const isProfile = to === "/perfil";
            const active = to === "/"
              ? pathname === "/"
              : to === "/jogos"
                ? pathname.startsWith("/jogos") || pathname.startsWith("/jogo/")
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
