import auraImg from "@/assets/aura-mascot.png";
import { cn } from "@/lib/utils";

interface AuraAvatarProps {
  className?: string;
  glow?: boolean;
  alt?: string;
}

/**
 * AuraAvatar — mascote oficial da IA Roxou.
 * Use em qualquer lugar que represente a Aura (chat, widgets, navegação).
 */
export default function AuraAvatar({ className, glow = true, alt = "Aura — IA da Roxou" }: AuraAvatarProps) {
  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center rounded-full overflow-hidden bg-background/40 ring-1 ring-primary/40",
        glow && "shadow-[0_0_12px_hsl(var(--v3-neon)/0.55)]",
        className,
      )}
    >
      <img
        src={auraImg}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover object-[30%_20%] scale-[1.6]"
      />
    </span>
  );
}
