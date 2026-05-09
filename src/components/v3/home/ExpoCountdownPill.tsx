import { useState, useEffect } from "react";

const EXPO_DATE = new Date("2026-09-10T20:00:00-03:00");

/**
 * ExpoCountdownPill — contagem regressiva discreta para a Expo 2026.
 *
 * Extraído de V3Home.tsx para reduzir o tamanho do arquivo principal,
 * sem alterar visual, textos ou comportamento.
 */
export default function ExpoCountdownPill() {
  const [diff, setDiff] = useState(() => EXPO_DATE.getTime() - Date.now());
  useEffect(() => {
    const id = setInterval(() => setDiff(EXPO_DATE.getTime() - Date.now()), 60000);
    return () => clearInterval(id);
  }, []);
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-primary">
      <span className="px-2 py-1 rounded-md bg-primary/20 text-primary">{days}d</span>
      <span className="text-foreground/50">:</span>
      <span className="px-2 py-1 rounded-md bg-primary/20 text-primary">{hours}h</span>
      <span className="text-foreground/70">para a Expo</span>
    </div>
  );
}
