import { CalendarDays, CalendarRange, Grid3X3, Bookmark, Home, MapPin, Star } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { label: "Início", icon: Home, path: "/" },
  { label: "Hoje", icon: CalendarDays, path: "/hoje" },
  { label: "Semana", icon: CalendarRange, path: "/semana" },
  { label: "Indica", icon: Star, path: "/indica" },
  { label: "Categorias", icon: Grid3X3, path: "/categorias" },
  { label: "Salvos", icon: Bookmark, path: "/salvos" },
];

const DesktopNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <header className="hidden md:block sticky top-0 z-50 glass border-b border-border/30">
      <div className="mx-auto max-w-6xl px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <h1 className="text-2xl font-black font-display neon-text text-primary tracking-tight">ROXOU</h1>
          </button>
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Presidente Prudente, SP</span>
          </div>
        </div>

        <nav className="flex items-center gap-1">
          {tabs.map((tab) => {
            const active = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-250 ${
                  active
                    ? "gradient-primary text-primary-foreground neon-glow"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60 hover:shadow-[0_0_20px_hsl(var(--primary)/0.1)]"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default DesktopNav;
