import type React from "react";

interface StatProps {
  label: string;
  value: number;
  tone?: "default" | "green" | "amber" | "primary" | "red";
  icon?: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}

export function Stat({ label, value, tone = "default", icon, onClick, active }: StatProps) {
  const tones: Record<string, string> = {
    default: "text-foreground",
    green: "text-green-400",
    amber: "text-amber-400",
    primary: "text-primary",
    red: "text-destructive",
  };
  const base = `rounded-xl border bg-card p-2.5 transition ${
    active ? "border-primary/60 shadow-[0_0_14px_hsl(var(--primary)/0.35)]" : "border-border/40"
  } ${onClick ? "text-left hover:border-primary/40 hover:bg-card/80 cursor-pointer" : ""}`;
  const inner = (
    <>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className={`text-xl font-bold ${tones[tone]}`}>{value}</p>
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={base}>
        {inner}
      </button>
    );
  }
  return <div className={base}>{inner}</div>;
}
