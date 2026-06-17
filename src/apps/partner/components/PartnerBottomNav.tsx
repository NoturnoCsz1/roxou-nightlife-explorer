/**
 * PartnerBottomNav — barra inferior mobile premium (Fase 5).
 *
 * 5 itens fixos. Mobile-only (md:hidden). Glass + gradient pill no item ativo.
 * Vibração tátil leve no toque. Sem novas regras de negócio.
 *
 * Mapeamento:
 *   Início        → /
 *   Reservas      → /reservas
 *   Fila          → /reservas (hash #fila — abre o accordion de lista de espera)
 *   Relatório     → /analytics
 *   Configurações → /configuracoes
 */
import { NavLink, useLocation } from "react-router-dom";
import { Calendar, Hourglass, LayoutDashboard, LineChart, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  to: string;
  label: string;
  icon: typeof Calendar;
  hash?: string;
  /** path patterns considered active */
  matches?: (pathname: string, hash: string) => boolean;
};

const ITEMS: Item[] = [
  {
    to: "/",
    label: "Início",
    icon: LayoutDashboard,
    matches: (p) => p === "/" || p === "/dashboard",
  },
  {
    to: "/reservas",
    label: "Reservas",
    icon: Calendar,
    matches: (p, h) => p.startsWith("/reservas") && h !== "#fila",
  },
  {
    to: "/reservas#fila",
    label: "Fila",
    icon: Hourglass,
    hash: "#fila",
    matches: (p, h) => p.startsWith("/reservas") && h === "#fila",
  },
  {
    to: "/analytics",
    label: "Relatório",
    icon: LineChart,
    matches: (p) => p.startsWith("/analytics"),
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
  const { pathname, hash } = useLocation();

  return (
    <nav
      role="navigation"
      aria-label="Navegação principal"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 md:hidden",
        "border-t border-white/10",
        "bg-[rgba(17,17,17,0.65)] backdrop-blur-xl",
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="grid grid-cols-5 gap-1 px-2 pt-1.5 pb-1.5">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.matches
            ? item.matches(pathname, hash)
            : pathname === item.to;
          return (
            <li key={item.to} className="min-w-0">
              <NavLink
                to={item.to}
                onClick={tap}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 px-1 min-h-[52px] transition-all",
                  "text-[10px] font-medium tracking-tight",
                  active
                    ? "text-white"
                    : "text-foreground/55 hover:text-foreground/80",
                )}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-2xl opacity-90"
                    style={{
                      background: "var(--partner-gradient)",
                      boxShadow: "0 8px 24px rgba(168,85,247,0.35)",
                    }}
                  />
                )}
                <Icon
                  className={cn(
                    "relative h-5 w-5 transition-transform",
                    active && "scale-110",
                  )}
                />
                <span className="relative truncate max-w-full">
                  {item.label}
                </span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default PartnerBottomNav;
