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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <tab.icon className={`h-5 w-5 ${active ? "neon-text" : ""}`} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
