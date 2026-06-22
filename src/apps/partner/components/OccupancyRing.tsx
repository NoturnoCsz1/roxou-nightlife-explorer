/**
 * OccupancyRing — anel SVG de ocupação com status de movimento.
 * UI only — recebe percentual já calculado.
 */
import { cn } from "@/lib/utils";

interface Props {
  /** 0..100 */
  value: number;
  reservedSeats?: number;
  totalCapacity?: number;
  size?: number;
  className?: string;
}

type Mood = {
  label: string;
  color: string;
  ring: string;
  glow: string;
};

function moodOf(pct: number): Mood {
  if (pct >= 90)
    return {
      label: "Lotado",
      color: "text-rose-300",
      ring: "stroke-rose-400",
      glow: "shadow-[0_0_30px_rgba(244,63,94,0.25)]",
    };
  if (pct >= 65)
    return {
      label: "Cheio",
      color: "text-amber-200",
      ring: "stroke-amber-300",
      glow: "shadow-[0_0_24px_rgba(251,191,36,0.18)]",
    };
  if (pct >= 30)
    return {
      label: "Aquecendo",
      color: "text-violet-200",
      ring: "stroke-violet-300",
      glow: "shadow-[0_0_22px_rgba(167,139,250,0.18)]",
    };
  return {
    label: "Tranquilo",
    color: "text-emerald-200",
    ring: "stroke-emerald-300",
    glow: "shadow-[0_0_18px_rgba(110,231,183,0.12)]",
  };
}

export function OccupancyRing({
  value,
  reservedSeats,
  totalCapacity,
  size = 132,
  className,
}: Props) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const mood = moodOf(v);
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - v / 100);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full",
        mood.glow,
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          className="fill-none stroke-white/8"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={cn("fill-none transition-[stroke-dashoffset]", mood.ring)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={cn("text-3xl font-bold tabular-nums", mood.color)}>
          {v}%
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
          {mood.label}
        </span>
        {typeof reservedSeats === "number" && typeof totalCapacity === "number" ? (
          <span className="text-[10px] text-muted-foreground mt-0.5">
            {reservedSeats}/{totalCapacity} lugares
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default OccupancyRing;
