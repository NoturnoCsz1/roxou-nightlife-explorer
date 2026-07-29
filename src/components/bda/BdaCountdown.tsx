import { useEffect, useState } from "react";
import { BDA_EVENT_DATE } from "./bdaConfig";

/** Contagem regressiva HUD para a Grande Final. */
export default function BdaCountdown({ target = BDA_EVENT_DATE }: { target?: string }) {
  const [left, setLeft] = useState(() => diff(target));

  useEffect(() => {
    const id = setInterval(() => setLeft(diff(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const blocks = [
    { v: left.days, l: "Dias" },
    { v: left.hours, l: "Horas" },
    { v: left.minutes, l: "Minutos" },
    { v: left.seconds, l: "Segundos" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-4">
      {blocks.map((b) => (
        <div
          key={b.l}
          className="relative overflow-hidden rounded-2xl border border-[#A855F7]/30 bg-white/[0.03] px-1 py-4 text-center backdrop-blur-sm shadow-[0_0_30px_-14px_rgba(168,85,247,0.9)]"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-[#2E7DFF]/25 to-transparent"
            style={{ animation: "bda-scan 4s linear infinite" }}
          />
          <div className="bda-font-display text-2xl font-black text-white sm:text-4xl [text-shadow:0_0_18px_rgba(168,85,247,0.8)]">
            {String(b.v).padStart(2, "0")}
          </div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C8D2E0]/60 sm:text-xs">
            {b.l}
          </div>
        </div>
      ))}
    </div>
  );
}

function diff(target: string) {
  const ms = Math.max(0, new Date(target).getTime() - Date.now());
  return {
    days: Math.floor(ms / 86400000),
    hours: Math.floor((ms % 86400000) / 3600000),
    minutes: Math.floor((ms % 3600000) / 60000),
    seconds: Math.floor((ms % 60000) / 1000),
  };
}
