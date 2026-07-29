import { ReactNode, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { BDA_NAV } from "./bdaConfig";

/**
 * Layout base do hotsite Batalha de Aura PP.
 * Totalmente isolado: fundo cyberpunk, HUD, partículas e navegação própria.
 */

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Rajdhani:wght@400;500;600;700&display=swap";

function useBdaFonts() {
  useEffect(() => {
    if (document.querySelector('link[data-bda-font="1"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_HREF;
    link.setAttribute("data-bda-font", "1");
    document.head.appendChild(link);
  }, []);
}

/** Fundo animado: grid HUD + auroras + partículas em CSS puro (leve). */
export function BdaBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#05030B]" />
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(168,85,247,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(46,125,255,0.28) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at 50% 0%, #000 20%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 0%, #000 20%, transparent 78%)",
        }}
      />
      <div className="absolute -top-40 left-1/2 h-[60vh] w-[80vw] -translate-x-1/2 rounded-full bg-[#A855F7]/25 blur-[120px]" />
      <div className="absolute bottom-[-20vh] right-[-10vw] h-[50vh] w-[60vw] rounded-full bg-[#2E7DFF]/20 blur-[130px]" />
      <div className="bda-particles absolute inset-0" />
    </div>
  );
}

export function BdaStickyNav() {
  return (
    <nav
      aria-label="Navegação Batalha de Aura PP"
      className="sticky top-0 z-30 border-b border-[#A855F7]/20 bg-black/60 backdrop-blur-md"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="mx-auto max-w-6xl overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <ul className="flex h-12 min-w-max items-center gap-1.5 px-3">
          {BDA_NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/batalhadeaura"}
                className={({ isActive }) =>
                  `inline-flex h-8 items-center rounded-full border px-3 text-[12px] font-semibold uppercase tracking-wider whitespace-nowrap transition-all bda-font-body ${
                    isActive
                      ? "border-transparent bg-gradient-to-r from-[#A855F7] to-[#2E7DFF] text-white shadow-[0_0_18px_-2px_rgba(168,85,247,0.8)]"
                      : "border-[#C8D2E0]/20 bg-white/[0.03] text-[#C8D2E0]/80 hover:border-[#A855F7]/60 hover:text-white"
                  }`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

export function BdaLayout({ children }: { children: ReactNode }) {
  useBdaFonts();
  return (
    <div className="bda-root relative min-h-screen overflow-x-hidden text-[#E9EDF5]">
      <style>{`
        .bda-root { font-family: 'Rajdhani', ui-sans-serif, system-ui, sans-serif; }
        .bda-font-display { font-family: 'Orbitron', 'Rajdhani', sans-serif; letter-spacing: 0.04em; }
        .bda-font-body { font-family: 'Rajdhani', sans-serif; }
        .bda-particles {
          background-image:
            radial-gradient(1.6px 1.6px at 12% 22%, rgba(168,85,247,0.9), transparent 60%),
            radial-gradient(1.4px 1.4px at 78% 14%, rgba(46,125,255,0.9), transparent 60%),
            radial-gradient(1.2px 1.2px at 42% 68%, rgba(200,210,224,0.7), transparent 60%),
            radial-gradient(1.8px 1.8px at 88% 62%, rgba(168,85,247,0.8), transparent 60%),
            radial-gradient(1.2px 1.2px at 26% 88%, rgba(46,125,255,0.8), transparent 60%),
            radial-gradient(1.4px 1.4px at 62% 40%, rgba(200,210,224,0.6), transparent 60%);
          background-size: 100% 100%;
          animation: bda-drift 22s ease-in-out infinite alternate;
          opacity: .85;
        }
        @keyframes bda-drift {
          from { transform: translate3d(0,0,0) scale(1); }
          to { transform: translate3d(0,-24px,0) scale(1.06); }
        }
        @keyframes bda-scan {
          from { transform: translateY(-100%); }
          to { transform: translateY(400%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .bda-particles, .bda-root [class*="animate-"] { animation: none !important; }
        }
      `}</style>
      <BdaBackground />
      <BdaStickyNav />
      <main className="relative">{children}</main>
    </div>
  );
}
