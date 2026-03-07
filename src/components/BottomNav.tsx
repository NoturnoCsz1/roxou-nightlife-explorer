import { CalendarDays, CalendarRange, Grid3X3, Bookmark } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { label: "Hoje", icon: CalendarDays, path: "/" },
  { label: "Semana", icon: CalendarRange, path: "/semana" },
  { label: "Categorias", icon: Grid3X3, path: "/categorias" },
  { label: "Salvos", icon: Bookmark, path: "/salvos" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 glass safe-area-bottom">
      <div className="mx-auto flex max-w-lg">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`relative flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-semibold tracking-wide transition-all duration-200 ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {active && (
                <span className="absolute -top-px left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full gradient-primary" />
              )}
              <tab.icon className={`h-[22px] w-[22px] transition-all ${active ? "neon-text scale-110" : ""}`} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
