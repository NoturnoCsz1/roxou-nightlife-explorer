/**
 * PartnerBottomNav — barra inferior mobile (Partner Pro v2).
 *
 * 5 itens fixos com grid 5 colunas, safe-area e altura 64px.
 * Glow reduzido para melhor legibilidade.
 */
import { NavLink, useLocation } from "react-router-dom";
import {
  Calendar,
  Home,
  Hourglass,
  LineChart,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  to: string;
  label: string;
  icon: typeof Calendar;
  matches?: (pathname: string) => boolean;
};

const ITEMS: Item[] = [
  {
    to: "/",
    label: "Início",
    icon: Home,
    matches: (p) => p === "/" || p === "/dashboard",
  },
  {
    to: "/reservas",
    label: "Reservas",
    icon: Calendar,
    matches: (p) => p.startsWith("/reservas"),
  },
  {
    to: "/fila",
    label: "Fila",
    icon: Hourglass,
    matches: (p) => p.startsWith("/fila"),
  },
  {
    to: "/relatorios",
    label: "Relatórios",
    icon: LineChart,
    matches: (p) =>
      p.startsWith("/relatorios") || p.startsWith("/analytics"),
  },
  {
    to: "/configuracoes",
    label: "Config",
    icon: Settings,
    matches: (p) => p.startsWith("/configuracoes"),
  },
];

const tap = () => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      (navigator as Navigator).vibrate?.(8);
    } catch {
      /* noop */
    }
  }
};

export function PartnerBottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      role="navigation"
      aria-label="Navegação principal"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 md:hidden",
        "border-t border-white/8",
        "bg-[rgba(15,15,18,0.9)] backdrop-blur-xl",
      )}
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        ["--partner-bottom-nav-h" as never]: "64px",
      }}
    >
      <ul className="grid grid-cols-5 h-16">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.matches
            ? item.matches(pathname)
            : pathname === item.to;
          return (
            <li key={item.to} className="min-w-0">
              <NavLink
                to={item.to}
                onClick={tap}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "h-full flex flex-col items-center justify-center gap-0.5 px-1",
                  "text-[10px] font-medium tracking-tight transition-colors",
                  active
                    ? "text-foreground"
                    : "text-foreground/55 hover:text-foreground/85",
                )}
              >
                <span
                  className={cn(
                    "flex items-center justify-center rounded-full transition-all",
                    active
                      ? "bg-white/8 px-3 py-1"
                      : "px-2 py-1",
                  )}
                >
                  <Icon className={cn("h-5 w-5", active && "text-violet-300")} />
                </span>
                <span className="truncate max-w-full">{item.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default PartnerBottomNav;
