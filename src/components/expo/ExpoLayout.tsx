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
  { to: "/expo2026", icon: "🎤", label: "Shows" },
  { to: "/expo2026/ingressos", icon: "🎫", label: "Ingressos", event: "expo_nav_ingressos" },
  { to: "/expo2026/front-stage", icon: "🍺", label: "Front Stage", event: "expo_nav_front_stage" },
  { to: "/expo2026/mapa", icon: "🗺️", label: "Mapa", event: "expo_nav_mapa" },
  { to: "/expo2026/menores", icon: "👨‍👩‍👧", label: "Menores", event: "expo_nav_menores" },
  { to: "/expo2026/informacoes", icon: "ℹ️", label: "Informações", event: "expo_nav_info" },
];

export function ExpoStickyNav() {
  return (
    <nav
      aria-label="Navegação Expo Prudente 2026"
      className="sticky top-0 z-30 h-11 backdrop-blur-xl bg-black/70 border-b border-[#FFC300]/20"
      style={{ boxShadow: "0 4px 18px -10px rgba(255,138,0,0.4)" }}
    >
      <div className="h-full max-w-5xl mx-auto overflow-x-auto scrollbar-none">
        <ul className="flex h-full items-center gap-1 px-2 min-w-max">
          {NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/expo2026"}
                onClick={() => {
                  if (item.event) trackExpoEvent(item.event, { to: item.to });
                }}
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-[12px] font-bold whitespace-nowrap border transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-[#FF8A00] to-[#FFC300] text-black border-transparent shadow-[0_4px_14px_-4px_rgba(255,138,0,0.7)]"
                      : "bg-white/[0.04] text-[#FFC300] border-[#FFC300]/15 hover:border-[#FFC300]/40"
                  }`
                }
              >
                <span aria-hidden>{item.icon}</span>
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
