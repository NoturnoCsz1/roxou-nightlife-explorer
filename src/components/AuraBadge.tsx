import { Flame, Rocket, Eye, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type AuraBadgeKind = "em_alta" | "viralizando" | "bombando" | "escolha_aura" | null | undefined;

const MAP: Record<string, { label: string; icon: any; cls: string }> = {
  em_alta: { label: "Em Alta", icon: Flame, cls: "from-orange-500/90 to-pink-500/90 text-white shadow-[0_0_20px_rgba(249,115,22,0.5)]" },
  viralizando: { label: "Viralizando", icon: Rocket, cls: "from-fuchsia-500/90 to-violet-600/90 text-white shadow-[0_0_22px_rgba(217,70,239,0.55)]" },
  bombando: { label: "Bombando Agora", icon: Eye, cls: "from-cyan-500/90 to-blue-600/90 text-white shadow-[0_0_20px_rgba(6,182,212,0.5)]" },
  escolha_aura: { label: "Escolha da Aura", icon: Sparkles, cls: "from-purple-500/90 to-fuchsia-600/90 text-white shadow-[0_0_24px_rgba(168,85,247,0.6)]" },
};

interface Props {
  kind: AuraBadgeKind;
  className?: string;
  compact?: boolean;
}

export default function AuraBadge({ kind, className, compact }: Props) {
  if (!kind || !MAP[kind]) return null;
  const { label, icon: Icon, cls } = MAP[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-gradient-to-r font-semibold backdrop-blur-md",
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        cls,
        className,
      )}
    >
      <Icon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {label}
    </span>
  );
}
