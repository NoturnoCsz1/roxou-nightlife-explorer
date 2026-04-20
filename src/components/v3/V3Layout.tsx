import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, Car, CalendarDays, User, LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS = [
  { to: "/v3", icon: Home, label: "Início" },
  { to: "/v3/descobrir", icon: Search, label: "Pesquisar" },
  { to: "/v3/transporte", icon: Car, label: "Transporte" },
  { to: "/v3/agenda", icon: CalendarDays, label: "Agenda" },
  { to: "/v3/perfil", icon: User, label: "Minha Conta" },
];

export default function V3Layout() {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleProfileClick = () => {
    navigate(user ? "/v3/perfil" : "/v3/auth");
  };

  return (
    <div className="v3-theme min-h-screen text-foreground font-body flex flex-col">
      {/* Header — Midnight glass */}
      <header className="sticky top-0 z-50 v3-glass-strong border-b border-white/5">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/v3" className="font-display font-bold text-xl tracking-tight">
            <span className="text-primary v3-neon-text">Roxou</span>
          </Link>
          <div className="flex items-center gap-2">
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
      <main key={pathname} className="flex-1 pb-20 v3-page-fade">
        <Outlet />
      </main>

      {/* Footer */}
      <div className="pb-20 pt-4 text-center border-t border-white/5">
        <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
          © 2026 ROXOU — Todos os direitos reservados
        </p>
        <p className="text-[9px] text-muted-foreground/40 mt-0.5">
          Plataforma desenvolvida por{" "}
          <a href="https://ntaplicacoes.com.br" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
            NT Aplicações
          </a>
          {" — "}
          <a href="https://ntaplicacoes.com.br" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
            www.ntaplicacoes.com.br
          </a>
        </p>
      </div>

      {/* Bottom Nav — glass premium */}
      <nav className="fixed bottom-0 inset-x-0 z-50 v3-glass-strong border-t border-white/5">
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
