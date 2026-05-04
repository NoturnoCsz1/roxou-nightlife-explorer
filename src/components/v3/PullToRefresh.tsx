import { ReactNode, useRef, useState } from "react";

export default function PullToRefresh({ children }: { children: ReactNode }) {
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const reset = () => window.setTimeout(() => setPull(0), 260);

  return (
    <div
      onTouchStart={(e) => {
        if (window.scrollY <= 0) startY.current = e.touches[0].clientY;
      }}
      onTouchMove={(e) => {
        if (startY.current === null || window.scrollY > 0) return;
        setPull(Math.min(82, Math.max(0, (e.touches[0].clientY - startY.current) * 0.45)));
      }}
      onTouchEnd={() => {
        if (pull > 58) {
          setRefreshing(true);
          window.location.reload();
        } else {
          reset();
        }
        startY.current = null;
      }}
      className="min-h-screen"
    >
      <div
        className="pointer-events-none fixed inset-x-0 top-14 z-40 flex justify-center transition-transform duration-200 lg:hidden"
        style={{ transform: `translateY(${pull ? pull - 72 : -72}px)` }}
      >
        <div className="rounded-full border border-primary/30 bg-background/80 px-4 py-2 font-display text-xs font-black uppercase tracking-[0.18em] text-primary backdrop-blur-xl v3-pulse-glow">
          {refreshing ? "ROXOU" : "Puxe para atualizar"}
        </div>
      </div>
      {children}
    </div>
  );
}