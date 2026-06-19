import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { trackExpoEvent } from "@/lib/expoAnalytics";
import type { ExpoEventName } from "@/lib/expoAnalytics";

interface NavItem {
  to: string;
  icon: string;
  label: string;
  event?: ExpoEventName;
}

const NAV: NavItem[] = [
  { to: "/expo2026", icon: "🏠", label: "Início" },
  { to: "/expo2026/ingressos", icon: "🎫", label: "Ingressos", event: "expo_nav_ingressos" },
  { to: "/expo2026/front-stage", icon: "⭐", label: "Front", event: "expo_nav_front_stage" },
  { to: "/expo2026/mapa", icon: "🗺️", label: "Mapa", event: "expo_nav_mapa" },
  { to: "/expo2026/menores", icon: "👨‍👩‍👧", label: "Menores", event: "expo_nav_menores" },
  { to: "/expo2026/informacoes", icon: "ℹ️", label: "Info", event: "expo_nav_info" },
];

export function ExpoStickyNav() {
  return (
    <nav
      aria-label="Navegação Expo Prudente 2026"
      className="sticky top-0 z-30 backdrop-blur-md bg-black/60 border-b border-[#FFC300]/15"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div
        className="mx-auto overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        style={{ maxWidth: 900 }}
      >
        <ul className="flex items-center justify-start md:justify-center gap-1.5 px-3 py-1.5 min-w-max h-11">
          {NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/expo2026"}
                onClick={() => {
                  if (item.event) trackExpoEvent(item.event, { to: item.to });
                }}
                className={({ isActive }) =>
                  `inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-[12px] font-semibold whitespace-nowrap border transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-[#FF8A00] to-[#FFC300] text-black border-transparent shadow-[0_2px_10px_-3px_rgba(255,138,0,0.5)]"
                      : "bg-white/[0.03] text-white/80 border-[#FFC300]/25 hover:border-[#FFC300]/50 hover:text-white"
                  }`
                }
              >
                <span aria-hidden className="text-[11px] leading-none">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

export function ExpoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden">
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, #FF8A00 0px, transparent 1px), radial-gradient(circle at 80% 60%, #FFC300 0px, transparent 1px)",
          backgroundSize: "40px 40px, 60px 60px",
        }}
      />
      <ExpoStickyNav />
      <main className="relative">{children}</main>
    </div>
  );
}
